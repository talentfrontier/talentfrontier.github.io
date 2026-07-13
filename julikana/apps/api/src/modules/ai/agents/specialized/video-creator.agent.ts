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

/** Edit decision list produced from raw footage + the owner's preferences. */
interface EditPlan {
  title: string;
  style: string; // "commercial" | "cinematic" | "ugc" | "fast-cut"
  cuts: {
    sourceAssetId: string;
    startSec: number;
    endSec: number;
    caption?: string;
    transition?: string; // "cut" | "whip" | "fade" | "zoom"
  }[];
  musicMood: string;
  voiceoverScript?: string;
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
    // If the owner fed in raw clips, edit them into a finished video instead
    // of generating from scratch.
    const rawAssetIds = input.params?.rawMediaAssetIds as string[] | undefined;
    if (rawAssetIds?.length) {
      return this.editFromRawFootage(memory, input, rawAssetIds);
    }

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

  /**
   * Raw footage → highly-edited commercial video. Domo inspects the clips,
   * writes an edit decision list (cuts, order, captions, transitions, music
   * mood, optional voiceover) matched to the requested style/preferences,
   * then the media worker renders it (ffmpeg assembly + Whisper captions +
   * ElevenLabs voiceover) and flips the item to READY.
   */
  private async editFromRawFootage(
    memory: OrgMemory,
    input: AgentInput,
    rawAssetIds: string[],
  ): Promise<AgentResult> {
    const clips = await this.prisma.mediaAsset.findMany({
      where: { id: { in: rawAssetIds }, organizationId: memory.organizationId, kind: "VIDEO" },
      select: { id: true, durationSec: true, prompt: true, url: true },
    });
    if (!clips.length) {
      return { summary: "No usable raw video clips found", output: { contentItemId: null } };
    }

    const preferences = (input.params?.preferences as Record<string, unknown>) ?? {};
    const plan = await this.llm.completeJson<EditPlan>({
      messages: [
        {
          role: "system",
          content:
            MemoryService.systemPrompt(memory, "commercial video editor") +
            "\nYou are handed raw clips. Produce an EDIT PLAN that turns them into a " +
            "polished, commercial-grade short. Pick the strongest moments, order them " +
            "for a hook→value→CTA arc, add on-screen captions and transitions, and a " +
            "music mood. Respect the requested style/length. JSON: " +
            '{"title","style","cuts":[{"sourceAssetId","startSec","endSec","caption","transition"}],' +
            '"musicMood","voiceoverScript","caption"}',
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction: input.instruction,
            preferences,
            clips: clips.map((c) => ({ id: c.id, durationSec: c.durationSec, note: c.prompt })),
          }),
        },
      ],
      maxTokens: 1500,
      temperature: 0.6,
    });

    const item = await this.prisma.contentItem.create({
      data: {
        organizationId: memory.organizationId,
        type: "REEL",
        status: "GENERATING",
        title: plan.title.slice(0, 120),
        body: plan.caption,
        metadata: { editPlan: plan, sourceAssetIds: rawAssetIds } as never,
      },
    });
    // The media worker renders the edit (assemble cuts, burn captions, add
    // voiceover/music) and marks the item READY, or downloadable.
    await this.mediaQueue.add("render-edit", {
      contentItemId: item.id,
      organizationId: memory.organizationId,
      editPlan: plan,
    });

    return {
      summary: `Editing ${clips.length} raw clips into a ${plan.style} video`,
      output: { contentItemId: item.id, cuts: plan.cuts.length, style: plan.style },
    };
  }
}
