import { Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

@Injectable()
export class CrmManagerAgent implements JulikanaAgent {
  readonly kind = AgentKind.CRM_MANAGER;
  readonly description =
    "Keeps the CRM healthy: merges duplicate leads and schedules follow-ups for stale ones.";

  constructor(private readonly prisma: PrismaService) {}

  async run(memory: OrgMemory, _input: AgentInput): Promise<AgentResult> {
    const merged = await this.mergeDuplicates(memory.organizationId);
    const followUps = await this.scheduleStaleFollowUps(memory.organizationId);
    return {
      summary: `Merged ${merged} duplicate leads, scheduled ${followUps} follow-ups`,
      output: { merged, followUps },
    };
  }

  private async mergeDuplicates(organizationId: string): Promise<number> {
    const dupes = await this.prisma.lead.groupBy({
      by: ["email"],
      where: { organizationId, email: { not: null } },
      having: { email: { _count: { gt: 1 } } },
      _count: true,
    });
    let merged = 0;
    for (const dupe of dupes) {
      const leads = await this.prisma.lead.findMany({
        where: { organizationId, email: dupe.email },
        orderBy: { createdAt: "asc" },
      });
      const [keeper, ...rest] = leads;
      for (const dup of rest) {
        await this.prisma.$transaction([
          this.prisma.conversation.updateMany({
            where: { leadId: dup.id },
            data: { leadId: keeper.id },
          }),
          this.prisma.leadNote.updateMany({
            where: { leadId: dup.id },
            data: { leadId: keeper.id },
          }),
          this.prisma.lead.delete({ where: { id: dup.id } }),
        ]);
        merged++;
      }
    }
    return merged;
  }

  private async scheduleStaleFollowUps(organizationId: string): Promise<number> {
    const staleDate = new Date(Date.now() - 3 * 86_400_000);
    const stale = await this.prisma.lead.findMany({
      where: {
        organizationId,
        stage: { in: ["CONTACTED", "INTERESTED", "QUALIFIED"] },
        updatedAt: { lt: staleDate },
        followUps: { none: { done: false } },
      },
      take: 50,
    });
    for (const lead of stale) {
      await this.prisma.followUp.create({
        data: {
          leadId: lead.id,
          dueAt: new Date(Date.now() + 86_400_000),
          note: `Domo: ${lead.name} has been quiet in ${lead.stage} for 3+ days — re-engage.`,
        },
      });
    }
    return stale.length;
  }
}
