import { ForbiddenException, Injectable } from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type Metric = "ai_text" | "ai_image" | "ai_video" | "scheduled_post";

const MONTHLY_LIMITS: Record<PlanTier, Record<Metric, number>> = {
  STARTER: { ai_text: 300, ai_image: 60, ai_video: 5, scheduled_post: 60 },
  PROFESSIONAL: { ai_text: 2_000, ai_image: 400, ai_video: 30, scheduled_post: 400 },
  BUSINESS: { ai_text: 10_000, ai_image: 2_000, ai_video: 120, scheduled_post: 2_000 },
  ENTERPRISE: {
    ai_text: Number.MAX_SAFE_INTEGER,
    ai_image: Number.MAX_SAFE_INTEGER,
    ai_video: Number.MAX_SAFE_INTEGER,
    scheduled_post: Number.MAX_SAFE_INTEGER,
  },
};

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private period(): string {
    return new Date().toISOString().slice(0, 7); // "2026-07"
  }

  /** Throws when the org's plan limit for this metric is exhausted. */
  async assertWithinLimit(organizationId: string, metric: Metric) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    const tier = subscription?.tier ?? "STARTER";
    const limit = MONTHLY_LIMITS[tier][metric];
    const used = await this.prisma.usageRecord.aggregate({
      where: { organizationId, metric, period: this.period() },
      _sum: { quantity: true },
    });
    if ((used._sum.quantity ?? 0) >= limit) {
      throw new ForbiddenException(
        `Monthly ${metric} limit reached on the ${tier} plan — upgrade to continue`,
      );
    }
  }

  record(organizationId: string, metric: Metric, quantity = 1) {
    return this.prisma.usageRecord.create({
      data: { organizationId, metric, quantity, period: this.period() },
    });
  }

  async currentUsage(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    const tier = subscription?.tier ?? "STARTER";
    const rows = await this.prisma.usageRecord.groupBy({
      by: ["metric"],
      where: { organizationId, period: this.period() },
      _sum: { quantity: true },
    });
    return {
      tier,
      period: this.period(),
      usage: (Object.keys(MONTHLY_LIMITS[tier]) as Metric[]).map((metric) => ({
        metric,
        used: rows.find((r) => r.metric === metric)?._sum.quantity ?? 0,
        limit: MONTHLY_LIMITS[tier][metric],
      })),
    };
  }
}
