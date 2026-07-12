import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class CampaignOptimizerAgent implements JulikanaAgent {
  readonly kind = AgentKind.CAMPAIGN_OPTIMIZER;
  readonly description =
    "Reviews active campaigns and writes budget / audience / creative recommendations.";

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmRouter,
  ) {}

  async run(memory: OrgMemory, _input: AgentInput): Promise<AgentResult> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId: memory.organizationId, status: "ACTIVE" },
      include: { contentItems: { select: { id: true, type: true, status: true } } },
    });
    if (!campaigns.length) {
      return { summary: "No active campaigns to optimize", output: { recommendations: [] } };
    }

    const recommendations: { campaignId: string; recommendation: string }[] = [];
    for (const campaign of campaigns) {
      const spentRatio = campaign.budgetCents
        ? campaign.spentCents / campaign.budgetCents
        : 0;
      let recommendation: string;
      try {
        recommendation = await this.llm.complete({
          messages: [
            {
              role: "system",
              content:
                MemoryService.systemPrompt(memory, "performance marketer") +
                "\nGive ONE specific optimization recommendation (2-3 sentences).",
            },
            {
              role: "user",
              content: JSON.stringify({
                objective: campaign.objective,
                platforms: campaign.platforms,
                budgetCents: campaign.budgetCents,
                spentRatio,
                report: campaign.report,
                assets: campaign.contentItems.length,
              }),
            },
          ],
          maxTokens: 250,
        });
      } catch {
        recommendation =
          spentRatio > 0.8
            ? "Budget nearly exhausted — pause low performers or top up."
            : "Add more creative variants to enable A/B comparison.";
      }
      recommendations.push({ campaignId: campaign.id, recommendation });
      await this.prisma.aiSuggestion.create({
        data: {
          organizationId: memory.organizationId,
          kind: "idea",
          title: `Optimize campaign: ${campaign.name}`,
          body: recommendation,
        },
      });
    }
    return {
      summary: `Wrote ${recommendations.length} campaign recommendations`,
      output: { recommendations },
    };
  }
}
