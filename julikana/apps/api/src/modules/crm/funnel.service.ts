import { BadRequestException, Injectable } from "@nestjs/common";
import { FunnelStage } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/** Forward path; WON/LOST are terminal, LOST reachable from any stage. */
const ORDER: FunnelStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "APPOINTMENT",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
];

@Injectable()
export class FunnelService {
  constructor(private readonly prisma: PrismaService) {}

  isValidTransition(from: FunnelStage, to: FunnelStage): boolean {
    if (from === to) return false;
    if (from === "WON" || from === "LOST") return false; // terminal
    if (to === "LOST") return true;
    const fromIdx = ORDER.indexOf(from);
    const toIdx = ORDER.indexOf(to);
    // Allow any forward move and one step back (humans correct mistakes).
    return toIdx > fromIdx || toIdx === fromIdx - 1;
  }

  async moveLead(
    leadId: string,
    to: FunnelStage,
    opts: { byAgent?: boolean; reason?: string } = {},
  ) {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    if (!this.isValidTransition(lead.stage, to)) {
      throw new BadRequestException(`Invalid transition ${lead.stage} → ${to}`);
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id: leadId }, data: { stage: to } }),
      this.prisma.stageTransition.create({
        data: {
          leadId,
          from: lead.stage,
          to,
          byAgent: opts.byAgent ?? false,
          reason: opts.reason,
        },
      }),
    ]);
    return updated;
  }

  funnelBreakdown(organizationId: string) {
    return this.prisma.lead.groupBy({
      by: ["stage"],
      where: { organizationId },
      _count: true,
    });
  }
}
