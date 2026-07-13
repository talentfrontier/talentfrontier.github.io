import { Injectable } from "@nestjs/common";
import { AgentKind, SocialPlatform } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

/** Best average posting hours (local) per platform; refined by AnalyticsAgent. */
const BEST_HOURS: Partial<Record<SocialPlatform, number>> = {
  FACEBOOK: 13,
  INSTAGRAM: 18,
  TIKTOK: 19,
  LINKEDIN: 9,
  X: 12,
  YOUTUBE: 17,
  PINTEREST: 20,
  THREADS: 18,
};

@Injectable()
export class SocialMediaManagerAgent implements JulikanaAgent {
  readonly kind = AgentKind.SOCIAL_MEDIA_MANAGER;
  readonly description =
    "Schedules READY content to connected accounts at the best posting times.";

  constructor(private readonly prisma: PrismaService) {}

  async run(memory: OrgMemory, _input: AgentInput): Promise<AgentResult> {
    const [items, accounts] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: {
          organizationId: memory.organizationId,
          status: "READY",
          scheduledPosts: { none: {} },
          type: { in: ["POST", "CAROUSEL", "REEL", "SHORT", "TIKTOK_VIDEO"] },
        },
        take: 20,
      }),
      this.prisma.socialAccount.findMany({
        where: { organizationId: memory.organizationId, connected: true },
      }),
    ]);
    if (!accounts.length) {
      return {
        summary: "No connected social accounts — content left in the library",
        output: { scheduled: 0 },
      };
    }

    let scheduled = 0;
    for (const item of items) {
      const targetPlatform = (item.metadata as { platform?: SocialPlatform })?.platform;
      const targets = targetPlatform
        ? accounts.filter((a) => a.platform === targetPlatform)
        : accounts;
      for (const account of targets) {
        await this.prisma.scheduledPost.create({
          data: {
            organizationId: memory.organizationId,
            contentItemId: item.id,
            socialAccountId: account.id,
            scheduledFor: this.nextSlot(account.platform),
          },
        });
        scheduled++;
      }
      await this.prisma.contentItem.update({
        where: { id: item.id },
        data: { status: "APPROVED" },
      });
    }
    return {
      summary: `Scheduled ${scheduled} posts across ${accounts.length} accounts`,
      output: { scheduled },
    };
  }

  /** Next occurrence of the platform's best hour, at least 1h from now. */
  nextSlot(platform: SocialPlatform, now = new Date()): Date {
    const hour = BEST_HOURS[platform] ?? 12;
    const slot = new Date(now);
    slot.setHours(hour, 0, 0, 0);
    while (slot.getTime() < now.getTime() + 3_600_000) {
      slot.setDate(slot.getDate() + 1);
    }
    return slot;
  }
}
