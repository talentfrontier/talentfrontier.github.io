import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

export interface SupportReply {
  text?: string;
  escalate: boolean;
  attachments?: object[];
  collectedContact?: { name?: string; email?: string; phone?: string };
}

const ESCALATION_PATTERNS =
  /(speak|talk) to (a|the)? ?(human|person|agent|manager)|refund|complaint|lawyer|angry/i;

@Injectable()
export class CustomerSupportAgent implements JulikanaAgent {
  readonly kind = AgentKind.CUSTOMER_SUPPORT;
  readonly description =
    "Answers customer FAQs, recommends products, books appointments and collects contact info.";

  constructor(
    private readonly llm: LlmRouter,
    private readonly prisma: PrismaService,
  ) {}

  async run(memory: OrgMemory, input: AgentInput): Promise<AgentResult> {
    const reply = await this.reply(memory, input.params?.conversationId as string, input.instruction);
    return { summary: reply.escalate ? "Escalated to human" : "Replied to customer", output: reply as never };
  }

  async reply(memory: OrgMemory, conversationId: string, text: string): Promise<SupportReply> {
    if (ESCALATION_PATTERNS.test(text)) return { escalate: true };

    const history = conversationId
      ? await this.prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : [];

    try {
      const result = await this.llm.completeJson<SupportReply & { confidence: number }>({
        messages: [
          {
            role: "system",
            content:
              MemoryService.systemPrompt(memory, "customer support & sales assistant") +
              "\nGoals: answer accurately from the business facts, recommend relevant products, " +
              "handle objections gently, offer to book an appointment, and ask for contact " +
              "details when the customer shows buying intent. If you cannot answer from the " +
              "facts, escalate.\nRespond as JSON: " +
              '{"text": string, "escalate": boolean, "confidence": 0-1, ' +
              '"collectedContact": {"name","email","phone"} | null}',
          },
          ...history.reverse().map((m) => ({
            role: (m.role === "CUSTOMER" ? "user" : "assistant") as "user" | "assistant",
            content: m.body,
          })),
          { role: "user" as const, content: text },
        ],
        maxTokens: 600,
        temperature: 0.4,
      });
      if (result.escalate || result.confidence < 0.35) return { escalate: true };
      if (result.collectedContact && conversationId) {
        await this.attachContactToLead(memory.organizationId, conversationId, result.collectedContact);
      }
      return { text: result.text, escalate: false };
    } catch {
      // No LLM available: acknowledge and hand off rather than guessing.
      return { escalate: true };
    }
  }

  private async attachContactToLead(
    organizationId: string,
    conversationId: string,
    contact: { name?: string; email?: string; phone?: string },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return;
    if (conversation.leadId) {
      await this.prisma.lead.update({
        where: { id: conversation.leadId },
        data: { email: contact.email ?? undefined, phone: contact.phone ?? undefined },
      });
    } else {
      const lead = await this.prisma.lead.create({
        data: {
          organizationId,
          name: contact.name ?? "Chat visitor",
          email: contact.email,
          phone: contact.phone,
          source: conversation.channel,
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { leadId: lead.id },
      });
    }
  }
}
