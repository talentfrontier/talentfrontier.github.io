import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OrgMemory } from "./agents/agent.interface";

/**
 * Domo's long-term memory: the org profile plus brand-training knowledge.
 * Retrieval is keyword-based here; swap `searchKnowledge` for a pgvector
 * similarity query once embeddings are populated (see KnowledgeChunk).
 */
@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemory(organizationId: string, query?: string): Promise<OrgMemory> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    return {
      organizationId,
      name: org.name,
      industry: org.industry ?? undefined,
      description: org.description ?? undefined,
      brandVoice: (org.brandVoice as Record<string, unknown>) ?? undefined,
      businessFacts: (org.businessFacts as Record<string, unknown>) ?? undefined,
      knowledgeSnippets: query ? await this.searchKnowledge(organizationId, query) : [],
    };
  }

  async searchKnowledge(organizationId: string, query: string, limit = 5): Promise<string[]> {
    const terms = query
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 3)
      .slice(0, 5);
    if (!terms.length) return [];
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: {
        source: { organizationId, status: "READY" },
        OR: terms.map((t) => ({ content: { contains: t, mode: "insensitive" as const } })),
      },
      take: limit,
      select: { content: true },
    });
    return chunks.map((c) => c.content);
  }

  /** Merge newly-learned facts into the org's structured memory. */
  async rememberFacts(organizationId: string, facts: Record<string, unknown>) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { businessFacts: true },
    });
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        businessFacts: {
          ...((org.businessFacts as object) ?? {}),
          ...facts,
        } as never,
      },
    });
  }

  static systemPrompt(memory: OrgMemory, role: string): string {
    return [
      `You are Domo, the AI marketing employee of "${memory.name}".`,
      `Current role: ${role}.`,
      memory.industry && `Industry: ${memory.industry}.`,
      memory.description && `Business: ${memory.description}`,
      memory.brandVoice && `Brand voice: ${JSON.stringify(memory.brandVoice)}`,
      memory.businessFacts && `Known facts: ${JSON.stringify(memory.businessFacts)}`,
      memory.knowledgeSnippets.length &&
        `Relevant knowledge:\n${memory.knowledgeSnippets.map((s) => `- ${s}`).join("\n")}`,
      "Stay factual about the business. Never invent prices or promises not present in the facts.",
    ]
      .filter(Boolean)
      .join("\n");
  }
}
