import { Injectable } from "@nestjs/common";
import { AgentKind, ContentType, SocialPlatform } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

interface DraftSet {
  drafts: {
    platform: SocialPlatform;
    type: ContentType;
    title: string;
    body: string;
    hashtags: string[];
    mediaPrompt?: string;
  }[];
}

@Injectable()
export class ContentCreatorAgent implements JulikanaAgent {
  readonly kind = AgentKind.CONTENT_CREATOR;
  readonly description =
    "Creates platform-tailored social posts, carousels and campaign content from a brief.";

  constructor(
    private readonly llm: LlmRouter,
    private readonly prisma: PrismaService,
  ) {}

  async run(memory: OrgMemory, input: AgentInput): Promise<AgentResult> {
    const platforms = (input.params?.platforms as SocialPlatform[]) ?? [
      "FACEBOOK",
      "INSTAGRAM",
      "X",
    ];
    const { drafts } = await this.llm.completeJson<DraftSet>({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "content creator") +
            `\nWrite one post per platform (${platforms.join(", ")}). Match each platform's ` +
            `format and length norms. Respond as JSON: {"drafts": [{"platform", "type", ` +
            `"title", "body", "hashtags": string[], "mediaPrompt"}]} where type is "POST".`,
        },
        { role: "user", content: input.instruction },
      ],
      maxTokens: 1600,
    });

    const items = await this.prisma.$transaction(
      drafts.map((d) =>
        this.prisma.contentItem.create({
          data: {
            organizationId: memory.organizationId,
            type: d.type ?? "POST",
            status: "READY",
            title: d.title,
            body: d.body,
            hashtags: d.hashtags ?? [],
            metadata: { platform: d.platform, mediaPrompt: d.mediaPrompt } as never,
          },
        }),
      ),
    );
    return {
      summary: `Created ${items.length} content drafts for ${platforms.join(", ")}`,
      output: { contentItemIds: items.map((i) => i.id) },
    };
  }
}
