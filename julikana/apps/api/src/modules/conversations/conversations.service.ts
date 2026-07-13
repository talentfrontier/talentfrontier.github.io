import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConversationStatus, MessageRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DomoOrchestrator } from "../ai/agents/domo.orchestrator";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => DomoOrchestrator))
    private readonly domo: DomoOrchestrator,
  ) {}

  list(organizationId: string, status?: ConversationStatus) {
    return this.prisma.conversation.findMany({
      where: { organizationId, ...(status && { status }) },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, score: true, stage: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  get(organizationId: string, id: string) {
    return this.prisma.conversation.findFirstOrThrow({
      where: { id, organizationId },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  /**
   * Entry point for every inbound customer message (webhook or webchat).
   * Persists it, then lets Domo draft & send a reply unless a human owns
   * the thread.
   */
  async handleInbound(
    organizationId: string,
    input: {
      conversationId?: string;
      channel: string;
      socialAccountId?: string;
      externalThreadId?: string;
      leadId?: string;
      body: string;
      attachments?: object[];
    },
  ) {
    const conversation = input.conversationId
      ? await this.prisma.conversation.findUniqueOrThrow({ where: { id: input.conversationId } })
      : await this.prisma.conversation.create({
          data: {
            organizationId,
            channel: input.channel,
            socialAccountId: input.socialAccountId,
            externalThreadId: input.externalThreadId,
            leadId: input.leadId,
          },
        });

    const message = await this.addMessage(conversation.id, "CUSTOMER", input.body, input.attachments);
    await this.notifications.notifyOrg(organizationId, {
      type: "new_message",
      title: "New message",
      body: input.body.slice(0, 120),
      data: { conversationId: conversation.id },
    });

    if (conversation.status === "AI_HANDLING") {
      const reply = await this.domo.handleCustomerMessage(organizationId, conversation.id, input.body);
      if (reply.escalate) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: "NEEDS_HUMAN" },
        });
      } else if (reply.text) {
        await this.addMessage(conversation.id, "DOMO", reply.text, reply.attachments);
      }
    }
    return { conversationId: conversation.id, messageId: message.id };
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    body: string,
    attachments?: object[],
  ) {
    const message = await this.prisma.message.create({
      data: { conversationId, role, body, attachments: attachments as never },
    });
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    this.events.emit("conversation.message", {
      organizationId: conversation.organizationId,
      conversationId,
      message,
    });
    return message;
  }

  setStatus(organizationId: string, id: string, status: ConversationStatus) {
    return this.prisma.conversation.update({
      where: { id, organizationId } as never,
      data: { status },
    });
  }
}
