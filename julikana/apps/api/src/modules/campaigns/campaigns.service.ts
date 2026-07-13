import { Injectable } from "@nestjs/common";
import { CampaignStatus, Prisma, SocialPlatform } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contentItems: true } } },
    });
  }

  get(organizationId: string, id: string) {
    return this.prisma.campaign.findFirstOrThrow({
      where: { id, organizationId },
      include: { contentItems: { include: { mediaAssets: true } } },
    });
  }

  create(
    organizationId: string,
    data: {
      name: string;
      objective: string;
      budgetCents?: number;
      platforms?: SocialPlatform[];
      audience?: object;
      startAt?: Date;
      endAt?: Date;
    },
  ) {
    return this.prisma.campaign.create({
      data: { ...data, audience: data.audience as Prisma.InputJsonValue, organizationId },
    });
  }

  update(organizationId: string, id: string, data: Prisma.CampaignUpdateInput) {
    return this.prisma.campaign.update({ where: { id, organizationId } as never, data });
  }

  setStatus(organizationId: string, id: string, status: CampaignStatus) {
    return this.update(organizationId, id, { status });
  }
}
