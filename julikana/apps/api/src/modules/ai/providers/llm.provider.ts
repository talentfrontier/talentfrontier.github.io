export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompletionOptions {
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

export interface LlmProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(opts: LlmCompletionOptions): Promise<string>;
}

export class OpenAiProvider implements LlmProvider {
  readonly name = "openai";

  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }

  async complete(opts: LlmCompletionOptions): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
        ...(opts.json && { response_format: { type: "json_object" } }),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }
}

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async complete(opts: LlmCompletionOptions): Promise<string> {
    const system = opts.messages.find((m) => m.role === "system")?.content;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        system,
        messages: opts.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  }
}

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";

  isConfigured() {
    return !!process.env.GOOGLE_GEMINI_API_KEY;
  }

  async complete(opts: LlmCompletionOptions): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: opts.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          systemInstruction: {
            parts: [{ text: opts.messages.find((m) => m.role === "system")?.content ?? "" }],
          },
          generationConfig: {
            maxOutputTokens: opts.maxTokens ?? 1024,
            temperature: opts.temperature ?? 0.7,
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
}
