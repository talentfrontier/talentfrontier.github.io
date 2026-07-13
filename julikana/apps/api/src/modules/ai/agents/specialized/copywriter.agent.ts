import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class CopywriterAgent implements JulikanaAgent {
  readonly kind = AgentKind.COPYWRITER;
  readonly description =
    "Writes long-form copy: blog articles, landing pages, email/SMS/WhatsApp campaigns.";

  constructor(
    private readonly llm: LlmRouter,
    private readonly prisma: PrismaService,
  ) {}

  async run(memory: OrgMemory, input: AgentInput): Promise<AgentResult> {
    const format = (input.params?.format as string) ?? this.detectFormat(input.instruction);
    const body = await this.llm.complete({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "senior copywriter") +
            `\nProduce a complete ${format}. Use the brand voice. Output only the copy.`,
        },
        { role: "user", content: input.instruction },
      ],
      maxTokens: 2500,
    });
    const item = await this.prisma.contentItem.create({
      data: {
        organizationId: memory.organizationId,
        type: this.contentType(format),
        status: "READY",
        title: input.instruction.slice(0, 120),
        body,
      },
    });
    return { summary: `Wrote ${format}`, output: { contentItemId: item.id } };
  }

  private detectFormat(instruction: string): string {
    const lower = instruction.toLowerCase();
    if (lower.includes("email")) return "email campaign";
    if (lower.includes("sms")) return "SMS campaign";
    if (lower.includes("whatsapp")) return "WhatsApp campaign";
    if (lower.includes("landing")) return "landing page";
    return "blog article";
  }

  private contentType(format: string) {
    if (format.includes("email")) return "EMAIL_CAMPAIGN" as const;
    if (format.includes("SMS")) return "SMS_CAMPAIGN" as const;
    if (format.includes("WhatsApp")) return "WHATSAPP_CAMPAIGN" as const;
    if (format.includes("landing")) return "LANDING_PAGE" as const;
    return "BLOG_ARTICLE" as const;
  }
}
