import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConnectionOptions, Job, Worker } from "bullmq";
import { VideoGenerationService } from "../ai/providers/video.providers";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE } from "../queues/queues.constants";
import { REDIS_CONNECTION } from "../queues/queues.module";

interface PollVideoJob {
  contentItemId: string;
  organizationId: string;
  provider: string;
  jobId: string;
}

/**
 * Finishes video-generation jobs that the VideoCreatorAgent (or the Studio
 * endpoint) started. It polls the provider until the clip is rendered, records
 * a MediaAsset, and flips the ContentItem to READY (or FAILED). Without this
 * worker a "generate video" request would start but never complete.
 *
 * The provider's finished URL is stored as-is. For Veo the URL needs the
 * server-side key to download, so MediaAsset.generator records the provider and
 * the media download proxy (GET /media/:id/file) streams it — the key never
 * reaches a client.
 */
@Injectable()
export class MediaGenerationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaGenerationProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly videos: VideoGenerationService,
    @Inject(REDIS_CONNECTION) private readonly connection: ConnectionOptions,
  ) {}

  onModuleInit() {
    this.worker = new Worker(QUEUE.MEDIA_GENERATION, (job) => this.process(job), {
      connection: this.connection,
      concurrency: 3,
    });
    this.worker.on("failed", (job, err) =>
      this.logger.warn(`Media job ${job?.id} (${job?.name}) failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job) {
    if (job.name === "poll-video") return this.pollVideo(job.data as PollVideoJob);
    // "render-edit" (ffmpeg assembly of raw clips) needs a render host with
    // ffmpeg; it's handled by the render worker when that infra is enabled.
    this.logger.debug(`No handler for media job "${job.name}" — skipping`);
  }

  private async pollVideo(data: PollVideoJob) {
    const provider = this.videos.byName(data.provider);
    if (!provider) {
      await this.fail(data.contentItemId, `Unknown video provider "${data.provider}"`);
      return;
    }

    const maxMs = Number(process.env.VIDEO_POLL_TIMEOUT_MS ?? 8 * 60_000);
    const intervalMs = Number(process.env.VIDEO_POLL_INTERVAL_MS ?? 15_000);
    const deadline = Date.now() + maxMs;

    for (;;) {
      let result;
      try {
        result = await provider.poll(data.jobId);
      } catch (e) {
        // Transient provider/network error — retry until the deadline.
        result = { provider: data.provider, jobId: data.jobId, status: "running" as const };
        this.logger.debug(`poll error (will retry): ${(e as Error).message}`);
      }

      if (result.status === "done" && result.url) {
        await this.complete(data, result.url);
        return;
      }
      if (result.status === "failed") {
        await this.fail(data.contentItemId, "Provider reported the render failed");
        return;
      }
      if (Date.now() > deadline) {
        await this.fail(data.contentItemId, "Timed out waiting for the video to render");
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  private async complete(data: PollVideoJob, url: string) {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        organizationId: data.organizationId,
        contentItemId: data.contentItemId,
        kind: "VIDEO",
        url,
        storageKey: `${data.provider}:${data.jobId}`,
        mimeType: "video/mp4",
        generator: data.provider,
      },
    });
    const existing = await this.prisma.contentItem.findUnique({
      where: { id: data.contentItemId },
      select: { metadata: true },
    });
    await this.prisma.contentItem.update({
      where: { id: data.contentItemId },
      data: {
        status: "READY",
        metadata: {
          ...((existing?.metadata as Record<string, unknown>) ?? {}),
          mediaAssetId: asset.id,
          videoUrl: url,
        } as never,
      },
    });
    this.logger.log(`Video ready for content ${data.contentItemId} via ${data.provider}`);
  }

  private async fail(contentItemId: string, reason: string) {
    await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: { status: "FAILED", metadata: { error: reason } as never },
    });
    this.logger.warn(`Video failed for content ${contentItemId}: ${reason}`);
  }
}
