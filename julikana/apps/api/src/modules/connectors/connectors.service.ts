import { Injectable, NotFoundException } from "@nestjs/common";
import { CryptoService } from "../../common/services/crypto.service";
import { PrismaService } from "../../prisma/prisma.service";

export interface ConnectorInput {
  key: string;
  displayName: string;
  category: string;
  enabled?: boolean;
  credentials?: Record<string, string>; // app-level secrets, encrypted here
  config?: Record<string, unknown>;
}

@Injectable()
export class ConnectorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /** Super-admin view: full list with credential presence (never the secrets). */
  async listForAdmin() {
    const connectors = await this.prisma.connector.findMany({ orderBy: { key: "asc" } });
    return connectors.map(({ credentials, ...c }) => ({
      ...c,
      hasCredentials: !!credentials,
    }));
  }

  /** Org-user view: only which connectors are available to use. No secrets. */
  async listEnabledForOrg() {
    const connectors = await this.prisma.connector.findMany({
      where: { enabled: true },
      select: { key: true, displayName: true, category: true, config: true },
    });
    return connectors;
  }

  async upsert(input: ConnectorInput, superAdminUserId: string) {
    const encrypted = input.credentials
      ? this.crypto.encrypt(JSON.stringify(input.credentials))
      : undefined;
    return this.prisma.connector.upsert({
      where: { key: input.key },
      update: {
        displayName: input.displayName,
        category: input.category,
        enabled: input.enabled ?? undefined,
        ...(encrypted && { credentials: encrypted }),
        config: input.config as never,
      },
      create: {
        key: input.key,
        displayName: input.displayName,
        category: input.category,
        enabled: input.enabled ?? false,
        credentials: encrypted,
        config: input.config as never,
        createdBy: superAdminUserId,
      },
      select: { id: true, key: true, displayName: true, category: true, enabled: true },
    });
  }

  async setEnabled(key: string, enabled: boolean) {
    const connector = await this.prisma.connector.findUnique({ where: { key } });
    if (!connector) throw new NotFoundException("Connector not found");
    return this.prisma.connector.update({
      where: { key },
      data: { enabled },
      select: { key: true, enabled: true },
    });
  }

  /** Internal: decrypt app credentials for use by platform adapters. */
  async getCredentials(key: string): Promise<Record<string, string> | null> {
    const connector = await this.prisma.connector.findUnique({ where: { key } });
    if (!connector?.credentials) return null;
    return JSON.parse(this.crypto.decrypt(connector.credentials));
  }
}
