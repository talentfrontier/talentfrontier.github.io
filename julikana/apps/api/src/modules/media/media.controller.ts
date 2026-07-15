import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MediaKind } from "@prisma/client";
import { Queue } from "bullmq";
import { Response } from "express";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser, AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { VideoGenerationService } from "../ai/providers/video.providers";
import { QUEUE } from "../queues/queues.constants";
import { queueToken } from "../queues/queues.module";
import { StorageService } from "./storage.service";

class PresignDto {
  @IsString() filename: string;
  @IsString() contentType: string;
}

class RegisterAssetDto {
  @IsEnum(MediaKind) kind: MediaKind;
  @IsString() url: string;
  @IsString() storageKey: string;
  @IsString() mimeType: string;
  @IsOptional() @IsInt() sizeBytes?: number;
}

class GenerateVideoDto {
  @IsString() @MaxLength(2000) prompt: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsInt() durationSec?: number;
  @IsOptional() @IsIn(["9:16", "16:9", "1:1"]) aspectRatio?: "9:16" | "16:9" | "1:1";
}

@ApiTags("media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media")
export class MediaController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly videos: VideoGenerationService,
    @Inject(queueToken(QUEUE.MEDIA_GENERATION)) private readonly mediaQueue: Queue,
  ) {}

  @Post("presign")
  @ApiOperation({ summary: "Get a direct-upload URL for images/videos/documents" })
  presign(@CurrentUser() user: AuthUser, @Body() dto: PresignDto) {
    return this.storage.createUploadTarget(user.organizationId, dto.filename, dto.contentType);
  }

  @Post()
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterAssetDto) {
    return this.prisma.mediaAsset.create({
      data: { ...dto, organizationId: user.organizationId, generator: "upload" },
    });
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("kind") kind?: MediaKind) {
    return this.prisma.mediaAsset.findMany({
      where: { organizationId: user.organizationId, ...(kind && { kind }) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  /**
   * Studio: generate a video from a text prompt. Returns a contentItemId the
   * client polls with GET /media/video/:id. The heavy lifting (polling the
   * provider, saving the asset) runs in the media-generation worker.
   */
  @Post("video")
  @ApiOperation({ summary: "Generate a video from a prompt (Veo/Runway/…)" })
  async generateVideo(@CurrentUser() user: AuthUser, @Body() dto: GenerateVideoDto) {
    const provider = this.videos.pick(dto.provider);
    const job = await provider.start({
      prompt: dto.prompt,
      durationSec: dto.durationSec,
      aspectRatio: dto.aspectRatio ?? "9:16",
    });

    const item = await this.prisma.contentItem.create({
      data: {
        organizationId: user.organizationId,
        type: "REEL",
        status: "GENERATING",
        title: dto.prompt.slice(0, 120),
        body: dto.prompt,
        metadata: { prompt: dto.prompt, videoJob: job } as never,
      },
    });
    await this.mediaQueue.add("poll-video", {
      contentItemId: item.id,
      organizationId: user.organizationId,
      provider: job.provider,
      jobId: job.jobId,
    });

    return { contentItemId: item.id, provider: job.provider, status: "GENERATING" };
  }

  /** Poll a Studio video job. */
  @Get("video/:id")
  async videoStatus(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const item = await this.prisma.contentItem.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { mediaAssets: { where: { kind: "VIDEO" }, take: 1 } },
    });
    if (!item) throw new NotFoundException("Video not found");
    const asset = item.mediaAssets[0];
    return {
      contentItemId: item.id,
      status: item.status, // GENERATING | READY | FAILED
      title: item.title,
      caption: item.body,
      // Clients play the file through the authed proxy below (works for Veo,
      // whose raw URL needs the server key).
      playbackUrl: asset ? `/api/v1/media/${asset.id}/file` : null,
      error:
        item.status === "FAILED"
          ? (item.metadata as Record<string, unknown> | null)?.error ?? "Generation failed"
          : null,
    };
  }

  /**
   * Streams a finished asset. For providers whose URL needs the server-side
   * key (Veo) we fetch the bytes here so the key never reaches the client; for
   * public hosted URLs (Runway) we redirect.
   */
  @Get(":id/file")
  async file(@CurrentUser() user: AuthUser, @Param("id") id: string, @Res() res: Response) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!asset) throw new NotFoundException("Asset not found");

    const provider = asset.generator ? this.videos.byName(asset.generator) : undefined;
    if (provider?.needsAuthedDownload && provider.fetchAsset) {
      const upstream = await provider.fetchAsset(asset.url);
      if (!upstream.ok || !upstream.body) {
        throw new NotFoundException("Upstream asset unavailable");
      }
      res.setHeader("Content-Type", upstream.headers.get("content-type") ?? asset.mimeType);
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Content-Length", buf.length);
      res.send(buf);
      return;
    }
    res.redirect(asset.url);
  }
}
