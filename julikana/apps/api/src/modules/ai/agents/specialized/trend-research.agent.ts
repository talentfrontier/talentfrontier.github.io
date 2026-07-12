import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class TrendResearchAgent implements JulikanaAgent {
  readonly kind = AgentKind.TREND_RESEARCH;
  readonly description =
    "Surfaces trending topics, formats and hashtags relevant to the business.";

  constructor(
    private readonly llm: LlmRouter,
    private readonly prisma: PrismaService,
  ) {}

  async run(memory: OrgMemory, input: AgentInput): Promise<AgentResult> {
    const { trends } = await this.llm.completeJson<{
      trends: { topic: string; why: string; contentIdea: string; hashtags: string[] }[];
    }>({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "trend researcher") +
            '\nList 5 currently relevant content trends for this industry. JSON: {"trends": ' +
            '[{"topic", "why", "contentIdea", "hashtags": string[]}]}',
        },
        { role: "user", content: input.instruction || "What should we post about this week?" },
      ],
      maxTokens: 1000,
      temperature: 0.8,
    });

    await this.prisma.$transaction(
      trends.map((t) =>
        this.prisma.aiSuggestion.create({
          data: {
            organizationId: memory.organizationId,
            kind: "trend",
            title: t.topic,
            body: `${t.why}\n\nIdea: ${t.contentIdea}\nHashtags: ${t.hashtags.join(" ")}`,
          },
        }),
      ),
    );
    return { summary: `Found ${trends.length} relevant trends`, output: { trends } };
  }
}
