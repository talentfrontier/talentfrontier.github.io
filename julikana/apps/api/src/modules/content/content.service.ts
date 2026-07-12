import { Injectable } from "@nestjs/common";
import { ContentStatus, ContentType, Prisma } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    page: PaginationDto,
    filters: { type?: ContentType; status?: ContentStatus },
  ) {
    const where: Prisma.ContentItemWhereInput = {
      organizationId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.pageSize,
        include: { mediaAssets: true, scheduledPosts: true },
      }),
      this.prisma.contentItem.count({ where }),
    ]);
    return { items, total, page: page.page, pageSize: page.pageSize };
  }

  get(organizationId: string, id: string) {
    return this.prisma.contentItem.findFirstOrThrow({
      where: { id, organizationId },
      include: { mediaAssets: true, scheduledPosts: { include: { socialAccount: true } } },
    });
  }

  update(
    organizationId: string,
    id: string,
    data: { title?: string; body?: string; hashtags?: string[]; status?: ContentStatus },
  ) {
    return this.prisma.contentItem.update({
      where: { id, organizationId } as never,
      data,
    });
  }

  approve(organizationId: string, id: string) {
    return this.update(organizationId, id, { status: "APPROVED" });
  }

  delete(organizationId: string, id: string) {
    return this.prisma.contentItem.delete({ where: { id, organizationId } as never });
  }
}
