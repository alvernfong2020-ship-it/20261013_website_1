/**
 * Language-model provider adapter.
 *
 * Provider-specific HTTP calls live here behind a single interface so the
 * vendor can be replaced. When no provider is configured the caller must fall
 * back to the explicitly-labelled demo generator — the app must never claim a
 * real generation succeeded.
 */

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmCallOptions = {
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Ask the provider for strict JSON output when supported. */
  json?: boolean;
  signal?: AbortSignal;
};

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(opts: LlmCallOptions): Promise<string>;
}

export type ProviderStatus = {
  configured: boolean;
  provider: "openai" | "anthropic" | null;
  model: string | null;
  /** Human-readable explanation shown in the UI when not configured. */
  notice: string | null;
};

export function providerStatus(): ProviderStatus {
  const provider = (process.env.AI_PROVIDER || "").trim().toLowerCase();

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return {
      configured: true,
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      notice: null,
    };
  }
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return {
      configured: true,
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
      notice: null,
    };
  }

  const reasons: string[] = [];
  if (!provider) reasons.push("AI_PROVIDER is not set");
  else if (provider === "openai") reasons.push("OPENAI_API_KEY is missing");
  else if (provider === "anthropic") reasons.push("ANTHROPIC_API_KEY is missing");
  else reasons.push(`AI_PROVIDER "${provider}" is not supported`);

  return {
    configured: false,
    provider: null,
    model: null,
    notice: `AI generation is not configured (${reasons.join("; ")}). Requests will run in Demo mode: the platform composes a structured story locally from your input without calling a language model. Set AI_PROVIDER, the matching API key and *_MODEL to enable live generation.`,
  };
}

export function getProvider(): LlmProvider | null {
  const status = providerStatus();
  if (!status.configured) return null;
  if (status.provider === "openai") return new OpenAiProvider();
  if (status.provider === "anthropic") return new AnthropicProvider();
  return null;
}

class OpenAiProvider implements LlmProvider {
  readonly name = "openai";
  readonly model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  async complete(opts: LlmCallOptions): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 4000,
        temperature: opts.temperature ?? 0.7,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI request failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty response.");
    return content;
  }
}

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  readonly model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  async complete(opts: LlmCallOptions): Promise<string> {
    const system = opts.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const messages = opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        system: system || undefined,
        messages,
        max_tokens: opts.maxTokens ?? 4000,
        temperature: opts.temperature ?? 0.7,
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic request failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const content = json.content?.find((c) => c.type === "text")?.text;
    if (!content) throw new Error("Anthropic returned an empty response.");
    return content;
  }
}

/** Extracts the first balanced JSON object from a model response. */
export function extractJson<T = unknown>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The model did not return JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
