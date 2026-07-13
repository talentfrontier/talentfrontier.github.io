import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { authenticator } from "otplib";
import { CryptoService } from "../../common/services/crypto.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/auth.dto";

export interface OAuthProfile {
  provider: "google" | "microsoft";
  subject: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly crypto: CryptoService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException("Email already registered");

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: await argon2.hash(dto.password),
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: dto.organizationName,
                slug: await this.uniqueSlug(dto.organizationName),
                subscription: { create: { tier: "STARTER", status: "trialing" } },
              },
            },
          },
        },
      },
      include: { memberships: true },
    });
    return this.issueTokens(user.id, user.email, user.memberships[0].organizationId);
  }

  async login(email: string, password: string, totpCode?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.twoFactorEnabled) {
      if (!totpCode) return { requiresTwoFactor: true };
      const secret = this.crypto.decrypt(user.twoFactorSecret!);
      if (!authenticator.verify({ token: totpCode, secret })) {
        throw new UnauthorizedException("Invalid 2FA code");
      }
    }
    await this.audit(user.id, "auth.login");
    return this.issueTokens(user.id, user.email, user.memberships[0]?.organizationId);
  }

  async oauthLogin(profile: OAuthProfile) {
    let user = await this.prisma.user.findFirst({
      where: { oauthProvider: profile.provider, oauthSubject: profile.subject },
      include: { memberships: true },
    });
    if (!user) {
      user = await this.prisma.user.upsert({
        where: { email: profile.email },
        update: { oauthProvider: profile.provider, oauthSubject: profile.subject },
        create: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          oauthProvider: profile.provider,
          oauthSubject: profile.subject,
          memberships: {
            create: {
              role: "OWNER",
              organization: {
                create: {
                  name: `${profile.name}'s workspace`,
                  slug: await this.uniqueSlug(profile.name),
                  subscription: { create: { tier: "STARTER", status: "trialing" } },
                },
              },
            },
          },
        },
        include: { memberships: true },
      });
    }
    return this.issueTokens(user.id, user.email, user.memberships[0]?.organizationId);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
      });
      return this.issueTokens(payload.sub, payload.email, payload.org);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async setupTwoFactor(userId: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.crypto.encrypt(secret) },
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      secret,
      otpauthUrl: authenticator.keyuri(
        user.email,
        process.env.TWO_FACTOR_ISSUER ?? "Julikana",
        secret,
      ),
    };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) throw new BadRequestException("Run setup first");
    const secret = this.crypto.decrypt(user.twoFactorSecret);
    if (!authenticator.verify({ token: code, secret })) {
      throw new BadRequestException("Invalid code");
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { enabled: true };
  }

  private async issueTokens(userId: string, email: string, organizationId?: string) {
    const membership = organizationId
      ? await this.prisma.membership.findFirst({
          where: { userId, organizationId },
        })
      : null;
    const payload = {
      sub: userId,
      email,
      org: organizationId,
      role: membership?.role ?? "OWNER",
    };
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
      }),
    };
  }

  private async uniqueSlug(base: string) {
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const clash = await this.prisma.organization.findUnique({ where: { slug } });
    return clash ? `${slug}-${Date.now().toString(36)}` : slug || `org-${Date.now().toString(36)}`;
  }

  private audit(userId: string, action: string) {
    return this.prisma.auditLog.create({ data: { userId, action } });
  }
}
