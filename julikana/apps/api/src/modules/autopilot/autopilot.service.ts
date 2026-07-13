import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SocialPlatform } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { DomoOrchestrator } from "../ai/agents/domo.orchestrator";
import { QUEUE } from "../queues/queues.constants";
import { queueToken } from "../queues/queues.module";
import { Intensity, PacingService } from "./pacing.service";

/**
 * The unsupervised engine. On a schedule it wakes for every org with
 * autopilot enabled and, within safe pacing limits, keeps the content
 * pipeline full and posts at audience-active times. It runs continuously
 * without human input; owners just read progress reports.
 */
@Injectable()
export class AutopilotService {
  private readonly logger = new Logger(AutopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pacing: PacingService,
    private readonly domo: DomoOrchestrator,
    @Inject(queueToken(QUEUE.AGENT_TASK)) private readonly agentQueue: Queue,
  ) {}

  getConfig(organizationId: string) {
    return this.prisma.autopilotConfig.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
  }

  updateConfig(
    organizationId: string,
    data: Partial<{
      enabled: boolean;
      intensity: Intensity;
      platforms: SocialPlatform[];
      maxPostsPerDay: number;
      autoBoostWinners: boolean;
      quietHoursStart: number;
      quietHoursEnd: number;
    }>,
  ) {
    return this.prisma.autopilotConfig.upsert({
      where: { organizationId },
      update: data as never,
      create: { organizationId, ...(data as Record<string, unknown>) } as never,
    });
  }

  /** Owner-facing progress report: what Domo has done and is about to do. */
  async report(organizationId: string) {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [config, tasksDone, tasksRunning, posted, scheduled, leadsWon, newLeads] =
      await this.prisma.$transaction([
        this.prisma.autopilotConfig.findUnique({ where: { organizationId } }),
        this.prisma.agentTask.count({
          where: { organizationId, status: "COMPLETED", finishedAt: { gte: since } },
        }),
        this.prisma.agentTask.count({
          where: { organizationId, status: { in: ["QUEUED", "RUNNING"] } },
        }),
        this.prisma.scheduledPost.count({
          where: { organizationId, status: "PUBLISHED", publishedAt: { gte: since } },
        }),
        this.prisma.scheduledPost.count({
          where: { organizationId, status: "SCHEDULED" },
        }),
        this.prisma.lead.count({
          where: { organizationId, stage: "WON", updatedAt: { gte: since } },
        }),
        this.prisma.lead.count({ where: { organizationId, createdAt: { gte: since } } }),
      ]);
    return {
      enabled: config?.enabled ?? false,
      intensity: config?.intensity ?? "balanced",
      lastRunAt: config?.lastRunAt,
      last7Days: {
        tasksCompleted: tasksDone,
        postsPublished: posted,
        newLeads,
        dealsWon: leadsWon,
      },
      pipeline: { tasksRunning, postsScheduled: scheduled },
    };
  }

  /**
   * Runs every 30 min. For each active org: refill the content pipeline if it
   * is running low, and schedule ready content into the next free active-time
   * slots — always within per-platform ceilings and the quiet window.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async tick() {
    const configs = await this.prisma.autopilotConfig.findMany({
      where: { enabled: true },
    });
    for (const config of configs) {
      try {
        await this.runForOrg(config.organizationId, config.intensity as Intensity, config);
      } catch (err) {
        this.logger.error(`Autopilot failed for org ${config.organizationId}: ${err}`);
      }
    }
  }

  private async runForOrg(
    organizationId: string,
    intensity: Intensity,
    config: { maxPostsPerDay: number; quietHoursStart: number; quietHoursEnd: number; platforms: SocialPlatform[] },
  ) {
    // 1. Keep the content library stocked. If fewer than 5 READY items, ask
    //    Domo to create a fresh batch (this respects brand voice + locale).
    const readyCount = await this.prisma.contentItem.count({
      where: { organizationId, status: "READY" },
    });
    if (readyCount < 5) {
      await this.domo.dispatch(
        organizationId,
        "Create a fresh batch of on-brand social posts for this week's themes.",
        10, // low priority: background autopilot work yields to user requests
      );
    }

    // 2. Schedule content into active-time slots within safe caps.
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        organizationId,
        connected: true,
        ...(config.platforms.length && { platform: { in: config.platforms } }),
      },
    });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    for (const account of accounts) {
      const postedToday = await this.prisma.scheduledPost.count({
        where: {
          socialAccountId: account.id,
          scheduledFor: { gte: startOfDay },
        },
      });
      const remaining = this.pacing.remainingPostsToday(
        account.platform,
        intensity,
        postedToday,
        config.maxPostsPerDay,
      );
      if (remaining <= 0) continue;

      const items = await this.prisma.contentItem.findMany({
        where: { organizationId, status: "READY", scheduledPosts: { none: {} } },
        take: remaining,
      });
      for (const [i, item] of items.entries()) {
        await this.prisma.scheduledPost.create({
          data: {
            organizationId,
            contentItemId: item.id,
            socialAccountId: account.id,
            scheduledFor: this.nextActiveSlot(account.platform, intensity, config, i),
          },
        });
        await this.prisma.contentItem.update({
          where: { id: item.id },
          data: { status: "APPROVED" },
        });
      }
    }

    await this.prisma.autopilotConfig.update({
      where: { organizationId },
      data: { lastRunAt: new Date() },
    });
  }

  /** Next audience-active, non-quiet, jittered slot at least a gap away. */
  private nextActiveSlot(
    platform: SocialPlatform,
    intensity: Intensity,
    config: { quietHoursStart: number; quietHoursEnd: number },
    index: number,
  ): Date {
    const hours = this.pacing.bestHours(platform);
    const gapMin = this.pacing.minGapMinutes(intensity);
    const slot = new Date(Date.now() + (index + 1) * gapMin * 60_000);
    // Snap to the nearest upcoming best hour that is not in the quiet window.
    for (let probe = 0; probe < 48; probe++) {
      const hour = slot.getHours();
      if (
        hours.includes(hour) &&
        !this.pacing.isQuietHour(hour, config.quietHoursStart, config.quietHoursEnd)
      ) {
        slot.setMinutes(this.pacing.humanizeMinute(slot.getTime()), 0, 0);
        return slot;
      }
      slot.setHours(slot.getHours() + 1);
    }
    return slot;
  }
}
