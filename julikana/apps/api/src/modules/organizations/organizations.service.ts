import { ForbiddenException, Injectable } from "@nestjs/common";
import { OrgRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  get(organizationId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: {
        subscription: true,
        memberships: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });
  }

  update(
    organizationId: string,
    data: {
      name?: string;
      industry?: string;
      description?: string;
      brandVoice?: object;
      locale?: string;
      persona?: object;
      emailSenderName?: string;
      emailSenderAddress?: string;
    },
  ) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: data as never,
    });
  }

  async invite(organizationId: string, email: string, role: OrgRole) {
    if (role === "OWNER") throw new ForbiddenException("Cannot invite as OWNER");
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Real deployment: create an Invitation row + send email. Kept minimal here.
      return { invited: email, status: "pending_signup" };
    }
    await this.prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId } },
      update: { role },
      create: { userId: user.id, organizationId, role },
    });
    return { invited: email, status: "added" };
  }

  async removeMember(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (membership.role === "OWNER") throw new ForbiddenException("Cannot remove the owner");
    await this.prisma.membership.delete({ where: { id: membership.id } });
    return { removed: userId };
  }
}
