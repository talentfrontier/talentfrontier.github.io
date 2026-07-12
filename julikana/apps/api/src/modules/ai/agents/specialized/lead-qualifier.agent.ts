import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { FunnelService } from "../../../crm/funnel.service";
import { LeadScoringService } from "../../../crm/lead-scoring.service";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class LeadQualifierAgent implements JulikanaAgent {
  readonly kind = AgentKind.LEAD_QUALIFIER;
  readonly description =
    "Re-scores leads from conversation signals and advances qualified ones through the funnel.";

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: LeadScoringService,
    private readonly funnel: FunnelService,
  ) {}

  async run(memory: OrgMemory, _input: AgentInput): Promise<AgentResult> {
    const leads = await this.prisma.lead.findMany({
      where: {
        organizationId: memory.organizationId,
        stage: { notIn: ["WON", "LOST"] },
      },
      include: {
        conversations: { include: { messages: { orderBy: { createdAt: "desc" }, take: 30 } } },
      },
      take: 200,
    });

    let rescored = 0;
    let advanced = 0;
    for (const lead of leads) {
      const messages = lead.conversations.flatMap((c) => c.messages);
      const customerMsgs = messages.filter((m) => m.role === "CUSTOMER");
      const allText = customerMsgs.map((m) => m.body).join(" ").toLowerCase();
      const lastActivity = messages[0]?.createdAt ?? lead.updatedAt;

      const score = this.scoring.score({
        hasEmail: !!lead.email,
        hasPhone: !!lead.phone,
        messageCount: customerMsgs.length,
        repliedWithin24h:
          !!messages[0] && Date.now() - messages[0].createdAt.getTime() < 86_400_000,
        mentionedBudget: /budget|price|cost|how much|afford/.test(allText),
        requestedAppointment: /appointment|book|schedule|visit|meet/.test(allText),
        stage: lead.stage,
        daysSinceLastActivity: Math.floor(
          (Date.now() - lastActivity.getTime()) / 86_400_000,
        ),
      });

      if (score !== lead.score) {
        await this.prisma.lead.update({ where: { id: lead.id }, data: { score } });
        rescored++;
      }
      // Auto-advance: strong score in an early stage means Domo qualified them.
      if (score >= 60 && ["NEW_LEAD", "CONTACTED", "INTERESTED"].includes(lead.stage)) {
        await this.funnel.moveLead(lead.id, "QUALIFIED", {
          byAgent: true,
          reason: `Score reached ${score}`,
        });
        advanced++;
      }
    }
    return {
      summary: `Re-scored ${rescored} leads, auto-qualified ${advanced}`,
      output: { rescored, advanced },
    };
  }
}
