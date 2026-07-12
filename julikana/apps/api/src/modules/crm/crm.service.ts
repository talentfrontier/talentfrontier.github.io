import { Injectable } from "@nestjs/common";
import { FunnelStage, Prisma } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateLeadDto, UpdateLeadDto } from "./dto/lead.dto";

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    organizationId: string,
    page: PaginationDto,
    filters: { stage?: FunnelStage; search?: string },
  ) {
    const where: Prisma.LeadWhereInput = {
      organizationId,
      ...(filters.stage && { stage: filters.stage }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { score: "desc" },
        skip: page.skip,
        take: page.pageSize,
        include: { assignedTo: { select: { id: true, name: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total, page: page.page, pageSize: page.pageSize };
  }

  get(organizationId: string, id: string) {
    return this.prisma.lead.findFirstOrThrow({
      where: { id, organizationId },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { dueAt: "asc" } },
        stageHistory: { orderBy: { createdAt: "desc" } },
        conversations: {
          include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
        },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async create(organizationId: string, dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: { ...dto, organizationId },
    });
    await this.notifications.notifyOrg(organizationId, {
      type: "new_lead",
      title: "New lead",
      body: `${lead.name} from ${lead.source}`,
      data: { leadId: lead.id },
    });
    return lead;
  }

  update(organizationId: string, id: string, dto: UpdateLeadDto) {
    return this.prisma.lead.update({
      where: { id, organizationId } as Prisma.LeadWhereUniqueInput,
      data: dto,
    });
  }

  addNote(leadId: string, body: string, authorId?: string) {
    return this.prisma.leadNote.create({ data: { leadId, body, authorId } });
  }

  addFollowUp(leadId: string, dueAt: Date, note: string) {
    return this.prisma.followUp.create({ data: { leadId, dueAt, note } });
  }
}
