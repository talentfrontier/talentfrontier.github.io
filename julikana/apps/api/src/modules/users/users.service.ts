import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        twoFactorEnabled: true,
        memberships: {
          select: {
            role: true,
            organization: { select: { id: true, name: true, slug: true, industry: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, avatarUrl: true },
    });
  }
}
