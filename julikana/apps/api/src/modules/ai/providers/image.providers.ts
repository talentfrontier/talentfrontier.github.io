import { Injectable, ServiceUnavailableException } from "@nestjs/common";

export interface ImageResult {
  /** URL or data URI of the generated image. */
  url: string;
  provider: string;
}

export interface ImageProvider {
  readonly name: string;
  isConfigured(): boolean;
  generate(prompt: string, opts?: { size?: string; style?: string }): Promise<ImageResult>;
}

class OpenAiImagesProvider implements ImageProvider {
  readonly name = "openai-images";
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }
  async generate(prompt: string, opts?: { size?: string }): Promise<ImageResult> {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: opts?.size ?? "1024x1024",
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI Images ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const item = data.data[0];
    return {
      url: item.url ?? `data:image/png;base64,${item.b64_json}`,
      provider: this.name,
    };
  }
}

class FluxProvider implements ImageProvider {
  readonly name = "flux";
  isConfigured() {
    return !!process.env.FLUX_API_KEY;
  }
  async generate(prompt: string): Promise<ImageResult> {
    // Black Forest Labs async API: submit then poll for the result.
    const submit = await fetch("https://api.bfl.ml/v1/flux-pro-1.1", {
      method: "POST",
      headers: { "x-key": process.env.FLUX_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, width: 1024, height: 1024 }),
    });
    if (!submit.ok) throw new Error(`Flux ${submit.status}`);
    const { id } = await submit.json();
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2_000));
      const poll = await fetch(`https://api.bfl.ml/v1/get_result?id=${id}`, {
        headers: { "x-key": process.env.FLUX_API_KEY! },
      });
      const data = await poll.json();
      if (data.status === "Ready") return { url: data.result.sample, provider: this.name };
      if (data.status === "Error") throw new Error("Flux generation failed");
    }
    throw new Error("Flux generation timed out");
  }
}

class StableDiffusionProvider implements ImageProvider {
  readonly name = "stable-diffusion";
  isConfigured() {
    return !!process.env.STABILITY_API_KEY;
  }
  async generate(prompt: string): Promise<ImageResult> {
    const form = new FormData();
    form.set("prompt", prompt);
    form.set("output_format", "png");
    const res = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "application/json",
      },
      body: form,
    });
    if (!res.ok) throw new Error(`Stability ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { url: `data:image/png;base64,${data.image}`, provider: this.name };
  }
}

@Injectable()
export class ImageGenerationService {
  private readonly providers: ImageProvider[] = [
    new OpenAiImagesProvider(),
    new FluxProvider(),
    new StableDiffusionProvider(),
  ];

  async generate(
    prompt: string,
    opts?: { size?: string; provider?: string },
  ): Promise<ImageResult> {
    const pool = this.providers.filter(
      (p) => p.isConfigured() && (!opts?.provider || p.name === opts.provider),
    );
    if (!pool.length) throw new ServiceUnavailableException("No image provider configured");
    let lastError: unknown;
    for (const provider of pool) {
      try {
        return await provider.generate(prompt, opts);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
}
