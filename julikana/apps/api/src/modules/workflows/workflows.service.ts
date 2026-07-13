import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WorkflowDefinition } from "./workflow.types";

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.workflow.findMany({
      where: { organizationId },
      include: { _count: { select: { runs: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  get(organizationId: string, id: string) {
    return this.prisma.workflow.findFirstOrThrow({
      where: { id, organizationId },
      include: { runs: { orderBy: { startedAt: "desc" }, take: 20 } },
    });
  }

  create(organizationId: string, name: string, definition: WorkflowDefinition) {
    this.validate(definition);
    return this.prisma.workflow.create({
      data: { organizationId, name, definition: definition as never },
    });
  }

  update(
    organizationId: string,
    id: string,
    data: { name?: string; enabled?: boolean; definition?: WorkflowDefinition },
  ) {
    if (data.definition) this.validate(data.definition);
    return this.prisma.workflow.update({
      where: { id, organizationId } as never,
      data: { ...data, definition: data.definition as never },
    });
  }

  delete(organizationId: string, id: string) {
    return this.prisma.workflow.delete({ where: { id, organizationId } as never });
  }

  private validate(def: WorkflowDefinition) {
    if (!def?.trigger?.type) throw new BadRequestException("Workflow needs a trigger");
    if (!def.nodes?.length) throw new BadRequestException("Workflow needs at least one action");
    const ids = new Set(def.nodes.map((n) => n.id));
    if (ids.size !== def.nodes.length) throw new BadRequestException("Duplicate node ids");
    for (const edge of def.edges ?? []) {
      if (edge.from !== "trigger" && !ids.has(edge.from)) {
        throw new BadRequestException(`Edge references unknown node ${edge.from}`);
      }
      if (!ids.has(edge.to)) {
        throw new BadRequestException(`Edge references unknown node ${edge.to}`);
      }
    }
    if (!(def.edges ?? []).some((e) => e.from === "trigger")) {
      throw new BadRequestException("No action is connected to the trigger");
    }
  }
}
