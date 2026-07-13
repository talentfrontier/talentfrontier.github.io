import { Injectable, ServiceUnavailableException } from "@nestjs/common";

export interface VideoJob {
  provider: string;
  jobId: string;
  status: "queued" | "running" | "done" | "failed";
  url?: string;
}

export interface VideoProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Kick off generation; results are polled by the media-generation worker. */
  start(input: { prompt: string; imageUrl?: string; durationSec?: number }): Promise<VideoJob>;
  poll(jobId: string): Promise<VideoJob>;
}

class RunwayProvider implements VideoProvider {
  readonly name = "runway";
  isConfigured() {
    return !!process.env.RUNWAY_API_KEY;
  }
  private headers() {
    return {
      Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    };
  }
  async start(input: { prompt: string; imageUrl?: string; durationSec?: number }): Promise<VideoJob> {
    const res = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: "gen4_turbo",
        promptText: input.prompt,
        promptImage: input.imageUrl,
        duration: input.durationSec ?? 5,
      }),
    });
    if (!res.ok) throw new Error(`Runway ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { provider: this.name, jobId: data.id, status: "queued" };
  }
  async poll(jobId: string): Promise<VideoJob> {
    const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${jobId}`, {
      headers: this.headers(),
    });
    const data = await res.json();
    const map: Record<string, VideoJob["status"]> = {
      PENDING: "queued",
      RUNNING: "running",
      SUCCEEDED: "done",
      FAILED: "failed",
    };
    return {
      provider: this.name,
      jobId,
      status: map[data.status] ?? "running",
      url: data.output?.[0],
    };
  }
}

/**
 * Higgsfield / Veo / Pika expose similar async job APIs; they share this
 * generic REST shape and differ only in endpoint + auth header. Fill in the
 * endpoints as access is granted — the worker only depends on the interface.
 */
class GenericAsyncVideoProvider implements VideoProvider {
  constructor(
    readonly name: string,
    private readonly envKey: string,
    private readonly baseUrl: string,
  ) {}
  isConfigured() {
    return !!process.env[this.envKey];
  }
  async start(input: { prompt: string; imageUrl?: string }): Promise<VideoJob> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env[this.envKey]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: input.prompt, image_url: input.imageUrl }),
    });
    if (!res.ok) throw new Error(`${this.name} ${res.status}`);
    const data = await res.json();
    return { provider: this.name, jobId: data.id ?? data.job_id, status: "queued" };
  }
  async poll(jobId: string): Promise<VideoJob> {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${process.env[this.envKey]}` },
    });
    const data = await res.json();
    return {
      provider: this.name,
      jobId,
      status: data.status === "completed" ? "done" : data.status === "failed" ? "failed" : "running",
      url: data.video_url ?? data.output_url,
    };
  }
}

@Injectable()
export class VideoGenerationService {
  private readonly providers: VideoProvider[] = [
    new RunwayProvider(),
    new GenericAsyncVideoProvider("higgsfield", "HIGGSFIELD_API_KEY", "https://platform.higgsfield.ai/v1"),
    new GenericAsyncVideoProvider("pika", "PIKA_API_KEY", "https://api.pika.art/v1"),
  ];

  pick(preferred?: string): VideoProvider {
    const pool = this.providers.filter(
      (p) => p.isConfigured() && (!preferred || p.name === preferred),
    );
    if (!pool.length) throw new ServiceUnavailableException("No video provider configured");
    return pool[0];
  }
}
