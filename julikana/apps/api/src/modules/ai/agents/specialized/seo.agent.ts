import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class SeoAgent implements JulikanaAgent {
  readonly kind = AgentKind.SEO;
  readonly description =
    "Writes SEO-optimized articles with keywords, meta description and internal structure.";

  constructor(
    private readonly llm: LlmRouter,
    private readonly prisma: PrismaService,
  ) {}

  async run(memory: OrgMemory, input: AgentInput): Promise<AgentResult> {
    const result = await this.llm.completeJson<{
      title: string;
      metaDescription: string;
      keywords: string[];
      markdown: string;
    }>({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "SEO specialist") +
            "\nWrite a 800-1200 word SEO article with H2/H3 structure. JSON: " +
            '{"title", "metaDescription", "keywords": string[], "markdown"}',
        },
        { role: "user", content: input.instruction },
      ],
      maxTokens: 3000,
    });

    const item = await this.prisma.contentItem.create({
      data: {
        organizationId: memory.organizationId,
        type: "BLOG_ARTICLE",
        status: "READY",
        title: result.title,
        body: result.markdown,
        hashtags: result.keywords,
        metadata: { metaDescription: result.metaDescription } as never,
      },
    });
    return { summary: `Wrote SEO article "${result.title}"`, output: { contentItemId: item.id } };
  }
}
