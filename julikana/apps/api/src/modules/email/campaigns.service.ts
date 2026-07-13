import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { MemoryService } from "../ai/memory.service";
import { LlmRouter } from "../ai/providers/llm.router";
import { QUEUE } from "../queues/queues.constants";
import { queueToken } from "../queues/queues.module";

@Injectable()
export class EmailCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouter,
    private readonly memory: MemoryService,
    @Inject(queueToken(QUEUE.EMAIL_SEND)) private readonly queue: Queue,
  ) {}

  list(organizationId: string) {
    return this.prisma.emailCampaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  get(organizationId: string, id: string) {
    return this.prisma.emailCampaign.findFirstOrThrow({
      where: { id, organizationId },
    });
  }

  create(
    organizationId: string,
    input: { subject: string; bodyHtml: string; preheader?: string; listId?: string },
  ) {
    return this.prisma.emailCampaign.create({
      data: { organizationId, ...input },
    });
  }

  /**
   * Let Domo write the campaign like a real copywriter — strong hook,
   * story-driven flow, one clear CTA — tuned to the business and its market,
   * in the org's brand voice / locale (incl. Sheng).
   */
  async draftWithDomo(
    organizationId: string,
    input: { goal: string; listId?: string; angle?: string },
  ) {
    const memory = await this.memory.getMemory(organizationId, input.goal);
    const draft = await this.llm.completeJson<{
      subject: string;
      preheader: string;
      bodyHtml: string;
    }>({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "world-class email copywriter") +
            "\nWrite ONE marketing email to an OPTED-IN audience. Open with a strong hook, " +
            "use a short story or vivid specific detail, build desire, and end with ONE clear " +
            "call to action. Keep it personal and skimmable, not salesy or spammy (spammy tone " +
            "hurts deliverability). You may use {{name}} and other merge fields. Do NOT include " +
            "an unsubscribe link — the system appends the compliant footer automatically. " +
            'Respond as JSON: {"subject", "preheader", "bodyHtml"}',
        },
        {
          role: "user",
          content: `Goal: ${input.goal}${input.angle ? `\nAngle: ${input.angle}` : ""}`,
        },
      ],
      maxTokens: 1600,
      temperature: 0.8,
    });

    return this.prisma.emailCampaign.create({
      data: {
        organizationId,
        subject: draft.subject,
        preheader: draft.preheader,
        bodyHtml: draft.bodyHtml,
        listId: input.listId,
        writtenByDomo: true,
      },
    });
  }

  /**
   * Queue a campaign for sending. Materializes one recipient row per
   * subscribed contact (minus suppressed addresses), then hands the batch to
   * the throttled send worker. Requires the org's sender identity to be set
   * so the compliant footer can be built.
   */
  async send(organizationId: string, campaignId: string) {
    const [campaign, org] = await Promise.all([
      this.prisma.emailCampaign.findFirstOrThrow({ where: { id: campaignId, organizationId } }),
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    ]);
    if (!org.emailSenderName || !org.emailSenderAddress) {
      throw new BadRequestException(
        "Set your email sender name and physical mailing address first (legally required in every email).",
      );
    }
    if (campaign.status === "SENDING" || campaign.status === "SENT") {
      throw new BadRequestException(`Campaign already ${campaign.status.toLowerCase()}`);
    }

    const suppressed = new Set(
      (
        await this.prisma.emailSuppression.findMany({
          where: { organizationId },
          select: { email: true },
        })
      ).map((s) => s.email),
    );
    const contacts = await this.prisma.emailContact.findMany({
      where: {
        organizationId,
        status: "SUBSCRIBED",
        ...(campaign.listId && { listId: campaign.listId }),
      },
    });
    const recipients = contacts.filter((c) => !suppressed.has(c.email));
    if (!recipients.length) throw new BadRequestException("No eligible subscribed recipients");

    await this.prisma.$transaction([
      this.prisma.emailRecipient.createMany({
        data: recipients.map((c) => ({
          campaignId,
          email: c.email,
          contactId: c.id,
        })),
        skipDuplicates: true,
      }),
      this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "SENDING", totalRecipients: recipients.length },
      }),
    ]);

    // One job per recipient; the worker's rate limiter paces them safely.
    await this.queue.addBulk(
      recipients.map((c) => ({
        name: "send",
        data: { campaignId, contactId: c.id },
      })),
    );
    return { queued: recipients.length };
  }
}
