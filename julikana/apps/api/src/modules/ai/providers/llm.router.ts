import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import {
  AnthropicProvider,
  GeminiProvider,
  LlmCompletionOptions,
  LlmProvider,
  OpenAiProvider,
} from "./llm.provider";

/**
 * Routes completions to the first configured provider, failing over to the
 * next on error. Order: Anthropic → OpenAI → Gemini (override with LLM_ORDER).
 */
@Injectable()
export class LlmRouter {
  private readonly logger = new Logger(LlmRouter.name);
  private readonly providers: LlmProvider[];

  constructor() {
    const all: Record<string, LlmProvider> = {
      anthropic: new AnthropicProvider(),
      openai: new OpenAiProvider(),
      gemini: new GeminiProvider(),
    };
    const order = (process.env.LLM_ORDER ?? "anthropic,openai,gemini").split(",");
    this.providers = order.map((n) => all[n.trim()]).filter(Boolean);
  }

  available(): LlmProvider[] {
    return this.providers.filter((p) => p.isConfigured());
  }

  async complete(opts: LlmCompletionOptions): Promise<string> {
    const candidates = this.available();
    if (!candidates.length) {
      throw new ServiceUnavailableException("No LLM provider configured");
    }
    let lastError: unknown;
    for (const provider of candidates) {
      try {
        return await provider.complete(opts);
      } catch (err) {
        lastError = err;
        this.logger.warn(`${provider.name} failed, trying next: ${err}`);
      }
    }
    throw lastError;
  }

  /** Completion that must return valid JSON; retries once on parse failure. */
  async completeJson<T>(opts: LlmCompletionOptions): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.complete({ ...opts, json: true });
      try {
        const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        return JSON.parse(match ? match[0] : raw) as T;
      } catch {
        this.logger.warn("LLM returned invalid JSON, retrying");
      }
    }
    throw new Error("LLM failed to produce valid JSON");
  }
}
