import { Inject, Injectable } from "@nestjs/common";
import { AgentKind } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../../../../prisma/prisma.service";
import { QUEUE } from "../../../queues/queues.constants";
import { queueToken } from "../../../queues/queues.module";
import { MemoryService } from "../../memory.service";
import { LlmRouter } from "../../providers/llm.router";
import { VideoGenerationService } from "../../providers/video.providers";
import { AgentInput, AgentResult, JulikanaAgent, OrgMemory } from "../agent.interface";

interface VideoScript {
  hook: string;
  scenes: { visual: string; voiceover: string; durationSec: number }[];
  cta: string;
  caption: string;
}

@Injectable()
export class VideoCreatorAgent implements JulikanaAgent {
  readonly kind = AgentKind.VIDEO_CREATOR;
  readonly description =
    "Scripts and generates promotional videos, reels, shorts and cinematic ads with captions.";

  constructor(
    private readonly llm: LlmRouter,
    private readonly videos: VideoGenerationService,
    private readonly prisma: PrismaService,
    @Inject(queueToken(QUEUE.MEDIA_GENERATION)) private readonly mediaQueue: Queue,
  ) {}

  async run(memory: OrgMemory, input: AgentInput): Promise<AgentResult> {
    const script = await this.llm.completeJson<VideoScript>({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "video director") +
            '\nWrite a 15-30s vertical video script. JSON: {"hook", "scenes": ' +
            '[{"visual", "voiceover", "durationSec"}], "cta", "caption"}',
        },
        { role: "user", content: input.instruction },
      ],
      maxTokens: 1200,
    });

    const provider = this.videos.pick(input.params?.provider as string | undefined);
    const job = await provider.start({
      prompt: script.scenes.map((s) => s.visual).join(". "),
      durationSec: script.scenes.reduce((sum, s) => sum + s.durationSec, 0),
    });

    const item = await this.prisma.contentItem.create({
      data: {
        organizationId: memory.organizationId,
        type: "REEL",
        status: "GENERATING",
        title: script.hook.slice(0, 120),
        body: script.caption,
        metadata: { script, videoJob: job } as never,
      },
    });
    // The media worker polls the provider, stores the file, adds subtitles
    // (Whisper) and flips the item to READY.
    await this.mediaQueue.add("poll-video", {
      contentItemId: item.id,
      provider: job.provider,
      jobId: job.jobId,
      organizationId: memory.organizationId,
    });
    return {
      summary: `Video generation started on ${job.provider}`,
      output: { contentItemId: item.id, jobId: job.jobId, script: script as never },
    };
  }
}
