/**
 * The only file that talks to the Anthropic API.
 *
 * - No ANTHROPIC_API_KEY set  -> "demo" mode (the routes use mock.ts instead of calling this).
 * - ANTHROPIC_API_KEY set     -> "live" mode.
 *
 * The key is read on the server only. It must never be committed to GitHub or sent to the browser.
 */

export type AiMode = "demo" | "live";
export type AiTier = "fast" | "smart";

export type AiErrorCode =
  | "auth"
  | "rate_limited"
  | "refused"
  | "timeout"
  | "bad_output"
  | "upstream";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
    public status: number = 502,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export function aiMode(): AiMode {
  return process.env.ANTHROPIC_API_KEY ? "live" : "demo";
}

function modelFor(tier: AiTier): string {
  return tier === "fast"
    ? (process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-5-5")
    : (process.env.ANTHROPIC_MODEL_SMART ?? "claude-sonnet-5-5");
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiRequest {
  system?: string;
  messages: AiMessage[];
  tier: AiTier;
  maxTokens: number;
  signal?: AbortSignal;
}

const API_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 90_000;

/** The API needs the first message to be from the user. */
function normalise(messages: AiMessage[]): AiMessage[] {
  const out = [...messages];
  while (out.length > 0 && out[0].role !== "user") out.shift();
  return out;
}

async function call(req: AiRequest, stream: boolean): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("auth", "The AI is not configured.", 503);

  const messages = normalise(req.messages);
  if (messages.length === 0) throw new AiError("bad_output", "Nothing to send to the AI.", 400);

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelFor(req.tier),
        max_tokens: req.maxTokens,
        system: req.system,
        messages,
        stream,
      }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new AiError("timeout", "The AI took too long to answer.", 504);
    }
    throw new AiError("upstream", "Could not reach the AI service.", 502);
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new AiError("auth", "The AI key was rejected.", 503);
    }
    if (res.status === 429 || res.status === 529) {
      throw new AiError("rate_limited", "The AI is busy. Please try again in a moment.", 429);
    }
    throw new AiError("upstream", "The AI service returned an error.", 502);
  }
  return res;
}

/** One complete answer as text. */
export async function completeText(req: AiRequest): Promise<string> {
  const res = await call(req, false);
  const body = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  if (body.stop_reason === "refusal") {
    throw new AiError("refused", "The AI declined to answer this request.", 422);
  }
  const text = (body.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
  if (!text.trim()) throw new AiError("bad_output", "The AI sent an empty answer.", 502);
  return text;
}

/** The answer as it is written, piece by piece. */
export async function* streamText(req: AiRequest): AsyncGenerator<string> {
  const res = await call(req, true);
  if (!res.body) throw new AiError("upstream", "The AI sent no data.", 502);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let event: { type?: string; delta?: { type?: string; text?: string }; error?: unknown };
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        if (event.type === "error") {
          throw new AiError("upstream", "The AI stopped in the middle of the answer.", 502);
        }
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
          yield event.delta.text;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Pulls the first JSON object or array out of the AI's text (it may add code fences). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const starts = [cleaned.indexOf("{"), cleaned.indexOf("[")].filter((i) => i >= 0);
  if (starts.length === 0) throw new AiError("bad_output", "The AI did not send structured data.", 502);
  const start = Math.min(...starts);
  const closer = cleaned[start] === "{" ? "}" : "]";
  const end = cleaned.lastIndexOf(closer);
  if (end <= start) throw new AiError("bad_output", "The AI sent incomplete data.", 502);
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AiError("bad_output", "The AI sent data that could not be read.", 502);
  }
}
