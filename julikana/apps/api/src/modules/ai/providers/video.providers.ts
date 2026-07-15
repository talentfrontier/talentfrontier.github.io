import { Injectable, ServiceUnavailableException } from "@nestjs/common";

export interface VideoJob {
  provider: string;
  jobId: string;
  status: "queued" | "running" | "done" | "failed";
  url?: string;
}

export interface VideoStartInput {
  prompt: string;
  imageUrl?: string;
  durationSec?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
}

export interface VideoProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Kick off generation; results are polled by the media-generation worker. */
  start(input: VideoStartInput): Promise<VideoJob>;
  poll(jobId: string): Promise<VideoJob>;
  /**
   * True when the URL returned by poll() needs the provider's API key to
   * download (so the API must proxy it instead of handing the link to the
   * client). Veo's file URIs are like this; Runway's hosted URLs are not.
   */
  needsAuthedDownload?: boolean;
  /** Stream/fetch a finished asset server-side (used by the download proxy). */
  fetchAsset?(url: string): Promise<Response>;
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
  async start(input: VideoStartInput): Promise<VideoJob> {
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
 * Google Veo via the Gemini API. Uses the SAME GOOGLE_GEMINI_API_KEY you
 * already set for Domo's text/reasoning, so no extra account is needed — you
 * only pay Google's per-second video rate.
 *
 * Flow: `:predictLongRunning` returns an operation name; we poll the operation
 * until `done`, then read the generated sample's file URI. That URI needs the
 * API key to download, so `needsAuthedDownload` is true and the media worker /
 * download proxy fetches the bytes server-side (the key never reaches a client).
 */
class VeoProvider implements VideoProvider {
  readonly name = "veo";
  readonly needsAuthedDownload = true;
  private readonly model = process.env.VEO_MODEL ?? "veo-3.0-generate-001";
  private readonly base = "https://generativelanguage.googleapis.com/v1beta";

  private key() {
    return process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
  }
  isConfigured() {
    return !!this.key();
  }

  async start(input: VideoStartInput): Promise<VideoJob> {
    const res = await fetch(
      `${this.base}/models/${this.model}:predictLongRunning?key=${this.key()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [
            input.imageUrl
              ? { prompt: input.prompt, image: { imageUri: input.imageUrl } }
              : { prompt: input.prompt },
          ],
          parameters: { aspectRatio: input.aspectRatio ?? "9:16" },
        }),
      },
    );
    if (!res.ok) throw new Error(`Veo ${res.status}: ${await res.text()}`);
    const data = await res.json();
    // operation name, e.g. "models/veo-3.0-generate-001/operations/abc123"
    return { provider: this.name, jobId: data.name, status: "queued" };
  }

  async poll(jobId: string): Promise<VideoJob> {
    const res = await fetch(`${this.base}/${jobId}?key=${this.key()}`);
    if (!res.ok) throw new Error(`Veo poll ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.done) return { provider: this.name, jobId, status: "running" };
    if (data.error) return { provider: this.name, jobId, status: "failed" };
    const uri =
      data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ??
      data.response?.generatedSamples?.[0]?.video?.uri;
    return { provider: this.name, jobId, status: uri ? "done" : "failed", url: uri };
  }

  /** Download the finished MP4 with the server-side key (used by the proxy). */
  fetchAsset(url: string): Promise<Response> {
    const sep = url.includes("?") ? "&" : "?";
    return fetch(`${url}${sep}key=${this.key()}`);
  }
}

/**
 * Higgsfield / Pika expose similar async job APIs; they share this generic
 * REST shape and differ only in endpoint + auth header. Fill in the endpoints
 * as access is granted — the worker only depends on the interface.
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
  async start(input: VideoStartInput): Promise<VideoJob> {
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
  // Veo is first so it's the default when only the Gemini key is set (the
  // common free-to-start case). Runway/Higgsfield/Pika take over when their
  // own keys are present or when a provider is explicitly requested.
  private readonly providers: VideoProvider[] = [
    new VeoProvider(),
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

  /** Look up a provider by name (used by the media worker to poll/download). */
  byName(name: string): VideoProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }
}
