import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class AnalyticsAgent implements JulikanaAgent {
  readonly kind = AgentKind.ANALYTICS;
  readonly description =
    "Turns raw platform metrics into plain-language insights and recommendations.";

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouter,
  ) {}

  async run(memory: OrgMemory, _input: AgentInput): Promise<AgentResult> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [metrics, leadCount, wonCount] = await Promise.all([
      this.prisma.platformMetric.findMany({
        where: { socialAccount: { organizationId: memory.organizationId }, date: { gte: since } },
        include: { socialAccount: { select: { platform: true } } },
      }),
      this.prisma.lead.count({
        where: { organizationId: memory.organizationId, createdAt: { gte: since } },
      }),
      this.prisma.lead.count({
        where: { organizationId: memory.organizationId, stage: "WON", updatedAt: { gte: since } },
      }),
    ]);

    const byPlatform: Record<string, { reach: number; engagements: number; clicks: number }> = {};
    for (const m of metrics) {
      const key = m.socialAccount.platform;
      byPlatform[key] ??= { reach: 0, engagements: 0, clicks: 0 };
      byPlatform[key].reach += m.reach;
      byPlatform[key].engagements += m.engagements;
      byPlatform[key].clicks += m.clicks;
    }

    let insights = "Not enough data yet — connect accounts and publish for a week.";
    if (metrics.length) {
      try {
        insights = await this.llm.complete({
          messages: [
            {
              role: "system",
              content:
                MemoryService.systemPrompt(memory, "marketing analyst") +
                "\nSummarize performance in 5 short bullet points with one concrete recommendation each.",
            },
            {
              role: "user",
              content: JSON.stringify({ last30Days: byPlatform, newLeads: leadCount, dealsWon: wonCount }),
            },
          ],
          maxTokens: 600,
        });
      } catch {
        insights = `Last 30 days: ${leadCount} new leads, ${wonCount} won. ${JSON.stringify(byPlatform)}`;
      }
    }
    return {
      summary: "Performance analysis complete",
      output: { byPlatform, newLeads: leadCount, dealsWon: wonCount, insights },
    };
  }
}
