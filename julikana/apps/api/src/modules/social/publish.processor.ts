import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConnectionOptions, Job, Worker } from "bullmq";

import { CryptoService } from "../../common/services/crypto.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { QUEUE } from "../queues/queues.constants";
import { REDIS_CONNECTION } from "../queues/queues.module";
import { AdapterRegistry } from "./adapters/adapter.registry";

/** Publishes scheduled posts through the right platform adapter. */
@Injectable()
export class PublishProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublishProcessor.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly adapters: AdapterRegistry,
    private readonly notifications: NotificationsService,
    @Inject(REDIS_CONNECTION) private readonly connection: ConnectionOptions,
  ) {}

  onModuleInit() {
    this.worker = new Worker(QUEUE.PUBLISH_POST, (job) => this.publish(job), {
      connection: this.connection,
      concurrency: 3,
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async publish(job: Job<{ scheduledPostId: string }>) {
    const post = await this.prisma.scheduledPost.findUnique({
      where: { id: job.data.scheduledPostId },
      include: {
        contentItem: { include: { mediaAssets: true } },
        socialAccount: true,
      },
    });
    if (!post || post.status !== "SCHEDULED") return;

    await this.prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "PUBLISHING" },
    });

    try {
      const adapter = this.adapters.get(post.socialAccount.platform);
      const isVideo = ["VIDEO", "REEL", "SHORT", "TIKTOK_VIDEO"].includes(post.contentItem.type);
      const result = await adapter.publish({
        accessToken: this.crypto.decrypt(post.socialAccount.accessToken),
        externalAccountId: post.socialAccount.externalId,
        text: [post.contentItem.body, post.contentItem.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")]
          .filter(Boolean)
          .join("\n\n"),
        mediaUrls: post.contentItem.mediaAssets.map((a) => a.url),
        isVideo,
      });
      await this.prisma.$transaction([
        this.prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "PUBLISHED", externalPostId: result.externalPostId, publishedAt: new Date() },
        }),
        this.prisma.contentItem.update({
          where: { id: post.contentItemId },
          data: { status: "PUBLISHED" },
        }),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Publish failed for post ${post.id}: ${message}`);
      await this.prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: "FAILED", error: message },
      });
      await this.notifications.notifyOrg(post.organizationId, {
        type: "post_failed",
        title: "Post failed to publish",
        body: `${post.socialAccount.platform}: ${message.slice(0, 140)}`,
        data: { scheduledPostId: post.id },
      });
      throw err; // let BullMQ retry with backoff
    }
  }
}
