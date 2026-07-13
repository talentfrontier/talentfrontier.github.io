import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Everything the dashboard home screen needs, in one query burst. */
  async dashboardSummary(organizationId: string) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const prevSince = new Date(Date.now() - 60 * 86_400_000);

    const [
      leads,
      leadsPrev,
      conversations,
      scheduledPosts,
      tasksRunning,
      tasksCompleted,
      accounts,
      wonLeads,
      metrics,
    ] = await this.prisma.$transaction([
      this.prisma.lead.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.lead.count({
        where: { organizationId, createdAt: { gte: prevSince, lt: since } },
      }),
      this.prisma.conversation.count({
        where: { organizationId, updatedAt: { gte: since } },
      }),
      this.prisma.scheduledPost.count({
        where: { organizationId, status: "SCHEDULED" },
      }),
      this.prisma.agentTask.count({
        where: { organizationId, status: { in: ["QUEUED", "RUNNING"] } },
      }),
      this.prisma.agentTask.count({
        where: { organizationId, status: "COMPLETED", finishedAt: { gte: since } },
      }),
      this.prisma.socialAccount.findMany({
        where: { organizationId },
        select: { platform: true, followerCount: true, connected: true },
      }),
      this.prisma.lead.findMany({
        where: { organizationId, stage: "WON", updatedAt: { gte: since } },
        select: { purchaseHistory: true },
      }),
      this.prisma.platformMetric.aggregate({
        where: { socialAccount: { organizationId }, date: { gte: since } },
        _sum: { reach: true, engagements: true, clicks: true, impressions: true },
      }),
    ]);

    const revenue = wonLeads.reduce((sum, lead) => {
      const history = lead.purchaseHistory as { totalCents?: number } | null;
      return sum + (history?.totalCents ?? 0);
    }, 0);
    const engagements = metrics._sum.engagements ?? 0;
    const impressions = metrics._sum.impressions ?? 0;

    return {
      revenueCents: revenue,
      leads,
      leadsDelta: leadsPrev ? Math.round(((leads - leadsPrev) / leadsPrev) * 100) : 0,
      conversations,
      scheduledPosts,
      aiTasksRunning: tasksRunning,
      aiTasksCompleted: tasksCompleted,
      followers: accounts,
      reach: metrics._sum.reach ?? 0,
      clicks: metrics._sum.clicks ?? 0,
      engagementRate: impressions ? +((engagements / impressions) * 100).toFixed(2) : 0,
    };
  }

  /** Daily time series for charts. */
  async timeSeries(organizationId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const metrics = await this.prisma.platformMetric.findMany({
      where: { socialAccount: { organizationId }, date: { gte: since } },
      orderBy: { date: "asc" },
      include: { socialAccount: { select: { platform: true } } },
    });
    const leads = await this.prisma.lead.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const byDay = new Map<string, { date: string; reach: number; engagements: number; followers: number; leads: number }>();
    for (const m of metrics) {
      const key = m.date.toISOString().slice(0, 10);
      const row = byDay.get(key) ?? { date: key, reach: 0, engagements: 0, followers: 0, leads: 0 };
      row.reach += m.reach;
      row.engagements += m.engagements;
      row.followers += m.followers;
      byDay.set(key, row);
    }
    for (const lead of leads) {
      const key = lead.createdAt.toISOString().slice(0, 10);
      const row = byDay.get(key) ?? { date: key, reach: 0, engagements: 0, followers: 0, leads: 0 };
      row.leads += 1;
      byDay.set(key, row);
    }
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Best-performing published posts by engagement. */
  bestPosts(organizationId: string) {
    return this.prisma.scheduledPost.findMany({
      where: { organizationId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 10,
      include: {
        contentItem: { select: { title: true, type: true } },
        socialAccount: { select: { platform: true } },
      },
    });
  }
}
