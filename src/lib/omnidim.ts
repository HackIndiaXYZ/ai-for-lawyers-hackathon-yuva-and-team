import { logEvent } from "./log";

/**
 * Starts a voice-call session with an OmniDimension agent. Server only.
 *
 * The API key never leaves this file: the browser receives only a short-lived, single-call WebSocket address.
 * Setup is two values: OMNIDIM_API_KEY and OMNIDIM_AGENT_ID (see docs/OMNIDIMENSION_AGENT.md).
 */

export type VoiceErrorCode = "not_configured" | "auth" | "no_credit" | "not_found" | "busy" | "rejected" | "upstream" | "bad_address";

export class VoiceError extends Error {
  constructor(
    public code: VoiceErrorCode,
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "VoiceError";
  }
}

const OFFICIAL_BASES = ["https://omnidim.io/api/v1", "https://backend.omnidim.io/api/v1"];

export function omnidimConfigured(): boolean {
  const id = Number(process.env.OMNIDIM_AGENT_ID);
  return Boolean(process.env.OMNIDIM_API_KEY) && Number.isInteger(id) && id > 0;
}

/** Only the official addresses are used, unless a developer explicitly allows a test address. */
function bases(): string[] {
  const custom = process.env.OMNIDIM_API_BASE;
  if (custom && process.env.SANDHI_ALLOW_TEST_BASE_URL === "1") return [custom.replace(/\/+$/, "")];
  return OFFICIAL_BASES;
}

/** The browser may only be handed an address on OmniDimension's own domain (or localhost in tests). */
export function isTrustedSocket(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase();
  if (process.env.SANDHI_ALLOW_TEST_BASE_URL === "1" && (host === "localhost" || host === "127.0.0.1")) {
    return u.protocol === "ws:" || u.protocol === "wss:";
  }
  return u.protocol === "wss:" && (host === "omnidim.io" || host.endsWith(".omnidim.io"));
}

export interface VoiceSession {
  wsUrl: string;
  expiresAt: string | null;
}

function explain(status: number): VoiceError {
  switch (status) {
    case 401:
      return new VoiceError("auth", "The voice service rejected Sandhi's key. Please tell the person who runs Sandhi.", 502);
    case 402:
      return new VoiceError("no_credit", "The voice credits have run out, so voice calls are paused. You can still type or use the microphone button.", 503);
    case 404:
      return new VoiceError("not_found", "The voice agent was not found. Please tell the person who runs Sandhi.", 502);
    case 429:
      return new VoiceError("busy", "The voice line is busy right now. Please try again in a minute.", 503);
    case 400:
      return new VoiceError("rejected", "The voice service did not accept the request. Please try again.", 502);
    default:
      return new VoiceError("upstream", "The voice service is not answering. You can still type or use the microphone button.", 502);
  }
}

export async function createVoiceSession(
  opts: { language: string; signal?: AbortSignal },
  fetchImpl: typeof fetch = fetch,
): Promise<VoiceSession> {
  if (!omnidimConfigured()) {
    throw new VoiceError("not_configured", "Voice calls are not set up yet. You can still type or use the microphone button.", 503);
  }
  const body = JSON.stringify({
    agent_id: Number(process.env.OMNIDIM_AGENT_ID),
    type: "voice",
    custom_variables: { language: opts.language, product: "Sandhi" },
    metadata: { source: "sandhi-web" },
  });

  let lastError: VoiceError | null = null;
  for (const base of bases()) {
    let res: Response;
    try {
      res = await fetchImpl(`${base}/sessions/create`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.OMNIDIM_API_KEY}`, "content-type": "application/json" },
        body,
        signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError" && opts.signal?.aborted) throw e;
      lastError = new VoiceError("upstream", "The voice service could not be reached. You can still type or use the microphone button.", 502);
      continue; // try the other official address
    }

    if (res.status === 404 && bases().length > 1) {
      lastError = explain(404);
      continue; // this address may not serve the endpoint; try the other
    }
    if (!res.ok) throw explain(res.status);

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new VoiceError("upstream", "The voice service sent an unreadable answer. Please try again.", 502);
    }
    const j = json as { ws_url?: unknown; expires_at?: unknown };
    if (!isTrustedSocket(j?.ws_url)) {
      logEvent("voice_bad_address", {});
      throw new VoiceError("bad_address", "The voice service sent an unexpected address, so the call was not started. Please tell the person who runs Sandhi.", 502);
    }
    return { wsUrl: j.ws_url, expiresAt: typeof j.expires_at === "string" ? j.expires_at : null };
  }
  throw lastError ?? new VoiceError("upstream", "The voice service is not answering.", 502);
}
