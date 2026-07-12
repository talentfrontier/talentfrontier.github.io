import { Inject, Injectable } from "@nestjs/common";
import { SocialPlatform } from "@prisma/client";
import { Queue } from "bullmq";
import { CryptoService } from "../../common/services/crypto.service";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE } from "../queues/queues.constants";
import { queueToken } from "../queues/queues.module";
import { AdapterRegistry } from "./adapters/adapter.registry";

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly adapters: AdapterRegistry,
    @Inject(queueToken(QUEUE.PUBLISH_POST)) private readonly publishQueue: Queue,
  ) {}

  listAccounts(organizationId: string) {
    return this.prisma.socialAccount.findMany({
      where: { organizationId },
      select: {
        id: true,
        platform: true,
        displayName: true,
        followerCount: true,
        connected: true,
        lastSyncedAt: true,
      },
    });
  }

  /** Store a connected account with the OAuth token encrypted at rest. */
  connectAccount(
    organizationId: string,
    input: {
      platform: SocialPlatform;
      externalId: string;
      displayName: string;
      accessToken: string;
      refreshToken?: string;
      scopes?: string[];
    },
  ) {
    return this.prisma.socialAccount.upsert({
      where: {
        organizationId_platform_externalId: {
          organizationId,
          platform: input.platform,
          externalId: input.externalId,
        },
      },
      update: {
        accessToken: this.crypto.encrypt(input.accessToken),
        refreshToken: input.refreshToken ? this.crypto.encrypt(input.refreshToken) : undefined,
        connected: true,
      },
      create: {
        organizationId,
        platform: input.platform,
        externalId: input.externalId,
        displayName: input.displayName,
        accessToken: this.crypto.encrypt(input.accessToken),
        refreshToken: input.refreshToken ? this.crypto.encrypt(input.refreshToken) : null,
        scopes: input.scopes ?? [],
      },
    });
  }

  async disconnect(organizationId: string, accountId: string) {
    return this.prisma.socialAccount.update({
      where: { id: accountId, organizationId } as never,
      data: { connected: false },
    });
  }

  /** Schedule (or immediately queue) a post for publishing. */
  async schedulePost(
    organizationId: string,
    input: { contentItemId: string; socialAccountId: string; scheduledFor?: Date },
  ) {
    const when = input.scheduledFor ?? new Date();
    const post = await this.prisma.scheduledPost.create({
      data: {
        organizationId,
        contentItemId: input.contentItemId,
        socialAccountId: input.socialAccountId,
        scheduledFor: when,
      },
    });
    await this.publishQueue.add(
      "publish",
      { scheduledPostId: post.id },
      { delay: Math.max(0, when.getTime() - Date.now()) },
    );
    return post;
  }

  listScheduled(organizationId: string) {
    return this.prisma.scheduledPost.findMany({
      where: { organizationId, status: { in: ["SCHEDULED", "PUBLISHING", "FAILED"] } },
      orderBy: { scheduledFor: "asc" },
      include: {
        contentItem: { select: { title: true, type: true } },
        socialAccount: { select: { platform: true, displayName: true } },
      },
    });
  }

  /** Refresh follower counts; called nightly by the scheduler. */
  async syncFollowers(organizationId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { organizationId, connected: true },
    });
    for (const account of accounts) {
      try {
        const adapter = this.adapters.get(account.platform);
        const count = await adapter.fetchFollowerCount(
          this.crypto.decrypt(account.accessToken),
          account.externalId,
        );
        await this.prisma.socialAccount.update({
          where: { id: account.id },
          data: { followerCount: count, lastSyncedAt: new Date() },
        });
      } catch {
        // Token likely expired — surface as disconnected so the UI can prompt.
        await this.prisma.socialAccount.update({
          where: { id: account.id },
          data: { connected: false },
        });
      }
    }
    return { synced: accounts.length };
  }
}
