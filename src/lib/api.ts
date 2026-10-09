import type { ChatState, Turn } from "@/lib/ai/schemas";

export type ApiMode = "demo" | "live";
export type ApiFailure = { ok: false; code: string; message: string; needsHumanReview: boolean };
export type ApiSuccess<T> = { ok: true; mode: ApiMode; data: T; needsHumanReview: boolean };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ChatBody = { turns: Turn[]; state: ChatState };
export type DraftBody = {
  contractType: string;
  userRole: string | null;
  details: Record<string, string>;
  said: string;
  extra?: string;
};

export function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export const ABORTED: ApiFailure = { ok: false, code: "aborted", message: "Stopped.", needsHumanReview: false };
export const NETWORK: ApiFailure = {
  ok: false,
  code: "network",
  message: "Could not reach the server. Check your internet connection and try again.",
  needsHumanReview: false,
};

export async function readFailure(res: Response): Promise<ApiFailure> {
  try {
    const b = await res.json();
    return {
      ok: false,
      code: String(b?.error?.code ?? "error"),
      message: String(b?.error?.message ?? "Something went wrong. Please try again."),
      needsHumanReview: Boolean(b?.needsHumanReview),
    };
  } catch {
    return { ok: false, code: "error", message: "Something went wrong. Please try again.", needsHumanReview: true };
  }
}

export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) return await readFailure(res);
    const b = await res.json();
    return { ok: true, mode: b.mode === "live" ? "live" : "demo", data: b.data as T, needsHumanReview: Boolean(b.needsHumanReview) };
  } catch (e) {
    return isAbort(e) ? ABORTED : NETWORK;
  }
}

/** Reads the contract as it is written. Calls onChunk with each new piece of text. */
export async function streamDraft(
  body: DraftBody,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<ApiResult<null>> {
  try {
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) return await readFailure(res);
    const mode: ApiMode = res.headers.get("x-sandhi-mode") === "live" ? "live" : "demo";
    if (!res.body) {
      onChunk(await res.text());
      return { ok: true, mode, data: null, needsHumanReview: false };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
    return { ok: true, mode, data: null, needsHumanReview: false };
  } catch (e) {
    return isAbort(e) ? ABORTED : NETWORK;
  }
}

/** Asks the server whether the real AI or the demo answers are in use. */
export async function getMode(): Promise<ApiMode | null> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    if (!res.ok) return null;
    const b = await res.json();
    return b.mode === "live" ? "live" : "demo";
  } catch {
    return null;
  }
}
