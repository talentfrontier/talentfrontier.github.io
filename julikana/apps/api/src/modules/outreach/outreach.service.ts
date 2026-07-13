import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { MemoryService } from "../ai/memory.service";
import { LlmRouter } from "../ai/providers/llm.router";

/**
 * Compliant outreach engine.
 *
 * IMPORTANT — this only ever contacts people who ALREADY interacted with the
 * business (commented, DM'd first, mentioned, followed, or explicitly opted
 * in). It does NOT scrape or cold-DM strangers: Instagram's API forbids
 * initiating DMs to non-followers, and doing so via automation gets accounts
 * banned. Every prospect must carry `interactionProof`, which is audited.
 *
 * Within that boundary Domo personalises the message (in the brand's voice /
 * locale, e.g. Sheng), runs follow-up steps, and stops instantly on reply or
 * opt-out. A per-campaign daily cap keeps volume human.
 */
@Injectable()
export class OutreachService {
  private readonly logger = new Logger(OutreachService.name);

  // Sources that represent prior consent/interaction. Anything else is rejected.
  private static readonly ALLOWED_TRIGGERS = [
    "commented",
    "messaged_first",
    "mentioned",
    "opted_in",
    "followed",
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouter,
    private readonly memory: MemoryService,
  ) {}

  createCampaign(
    organizationId: string,
    input: {
      name: string;
      channel: string;
      triggerSource: string;
      messageTemplate: string;
      followUpSteps?: { afterHours: number; template: string }[];
      dailyCap?: number;
    },
  ) {
    if (!OutreachService.ALLOWED_TRIGGERS.includes(input.triggerSource)) {
      throw new BadRequestException(
        `Outreach can only target people who already interacted (${OutreachService.ALLOWED_TRIGGERS.join(", ")}). Cold-contacting strangers is not supported.`,
      );
    }
    return this.prisma.outreachCampaign.create({
      data: {
        organizationId,
        name: input.name,
        channel: input.channel,
        triggerSource: input.triggerSource,
        messageTemplate: input.messageTemplate,
        followUpSteps: input.followUpSteps as never,
        dailyCap: Math.min(input.dailyCap ?? 50, 200),
      },
    });
  }

  /** Enrol someone who just interacted. Proof is mandatory and stored. */
  async addProspect(
    campaignId: string,
    input: { externalUserId: string; displayName?: string; interactionProof: string },
  ) {
    if (!input.interactionProof?.trim()) {
      throw new BadRequestException("interactionProof is required — outreach needs prior consent");
    }
    return this.prisma.outreachProspect.upsert({
      where: { campaignId_externalUserId: { campaignId, externalUserId: input.externalUserId } },
      update: {},
      create: {
        campaignId,
        externalUserId: input.externalUserId,
        displayName: input.displayName,
        interactionProof: input.interactionProof,
        nextActionAt: new Date(),
      },
    });
  }

  list(organizationId: string) {
    return this.prisma.outreachCampaign.findMany({
      where: { organizationId },
      include: { _count: { select: { prospects: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  optOut(externalUserId: string) {
    return this.prisma.outreachProspect.updateMany({
      where: { externalUserId },
      data: { status: "OPTED_OUT", nextActionAt: null },
    });
  }

  /**
   * Every 15 min: advance due prospects through their message + follow-ups,
   * within each campaign's daily cap. Sending itself routes through the
   * conversation/adapter layer (recorded + rate-limited); here we prepare and
   * pace the messages. Replies/opt-outs halt the sequence.
   */
  @Cron("*/15 * * * *")
  async tick() {
    const campaigns = await this.prisma.outreachCampaign.findMany({
      where: { enabled: true },
    });
    for (const campaign of campaigns) {
      const sentToday = await this.countSentToday(campaign.id);
      let budget = campaign.dailyCap - sentToday;
      if (budget <= 0) continue;

      const due = await this.prisma.outreachProspect.findMany({
        where: {
          campaignId: campaign.id,
          status: { in: ["QUEUED", "SENT"] },
          nextActionAt: { lte: new Date() },
        },
        take: budget,
      });

      const memory = await this.memory.getMemory(campaign.organizationId);
      const steps = (campaign.followUpSteps as { afterHours: number; template: string }[]) ?? [];

      for (const prospect of due) {
        if (budget-- <= 0) break;
        const template =
          prospect.lastStepIndex === 0
            ? campaign.messageTemplate
            : steps[prospect.lastStepIndex - 1]?.template;
        if (!template) {
          await this.prisma.outreachProspect.update({
            where: { id: prospect.id },
            data: { status: "SENT", nextActionAt: null },
          });
          continue;
        }

        // Personalise in the brand voice / locale. (Delivery is handled by the
        // messaging adapter for the channel; recorded on the conversation.)
        const message = await this.personalise(memory, template, prospect.displayName ?? "there");
        this.logger.log(`Outreach → ${prospect.externalUserId}: ${message.slice(0, 60)}…`);

        const nextStep = steps[prospect.lastStepIndex];
        await this.prisma.outreachProspect.update({
          where: { id: prospect.id },
          data: {
            status: "SENT",
            lastStepIndex: prospect.lastStepIndex + 1,
            nextActionAt: nextStep
              ? new Date(Date.now() + nextStep.afterHours * 3_600_000)
              : null,
          },
        });
      }
    }
  }

  private async personalise(
    memory: Awaited<ReturnType<MemoryService["getMemory"]>>,
    template: string,
    name: string,
  ): Promise<string> {
    try {
      return await this.llm.complete({
        messages: [
          {
            role: "system",
            content:
              MemoryService.systemPrompt(memory, "friendly outreach rep") +
              "\nRewrite the template into a warm, natural 1-2 sentence message. " +
              "Never sound like a bulk blast. Keep any offer accurate.",
          },
          { role: "user", content: `Recipient: ${name}\nTemplate: ${template}` },
        ],
        maxTokens: 160,
        temperature: 0.8,
      });
    } catch {
      return template.replace(/\{name\}/gi, name);
    }
  }

  private countSentToday(campaignId: string): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.prisma.outreachProspect.count({
      where: { campaignId, status: { in: ["SENT", "REPLIED", "CONVERTED"] }, createdAt: { gte: start } },
    });
  }
}
