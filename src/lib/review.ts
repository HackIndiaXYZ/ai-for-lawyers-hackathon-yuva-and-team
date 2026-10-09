import {
  reviewBriefSchema,
  reviewFindingSchema,
  reviewMetaSchema,
  reviewMissingSchema,
  type ImageType,
  type ReviewBrief,
  type ReviewFinding,
  type ReviewMeta,
  type ReviewMissing,
} from "@/lib/ai/schemas";
import { ABORTED, NETWORK, isAbort, readFailure, type ApiFailure, type ApiMode } from "@/lib/api";

export type ReviewLine =
  | { kind: "brief"; value: ReviewBrief }
  | { kind: "meta"; value: ReviewMeta }
  | { kind: "finding"; value: ReviewFinding }
  | { kind: "missing"; value: ReviewMissing };

/** Reads one line of the AI's JSON Lines answer. Anything unreadable is skipped, never fatal. */
export function parseReviewLine(raw: string): ReviewLine | null {
  const line = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  if (!line || line[0] !== "{") return null;
  let obj: unknown;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  const kind = (obj as { kind?: unknown } | null)?.kind;
  if (kind === "brief") {
    const r = reviewBriefSchema.safeParse(obj);
    return r.success ? { kind, value: r.data } : null;
  }
  if (kind === "meta") {
    const r = reviewMetaSchema.safeParse(obj);
    return r.success ? { kind, value: r.data } : null;
  }
  if (kind === "finding") {
    const r = reviewFindingSchema.safeParse(obj);
    return r.success ? { kind, value: r.data } : null;
  }
  if (kind === "missing") {
    const r = reviewMissingSchema.safeParse(obj);
    return r.success ? { kind, value: r.data } : null;
  }
  return null;
}

const ORDER = { high: 0, medium: 1, low: 2 } as const;

/** Worst first. Equal severities keep the order the AI wrote them in. */
export function sortFindings(list: ReviewFinding[]): ReviewFinding[] {
  return list
    .map((f, i) => ({ f, i }))
    .sort((a, b) => ORDER[a.f.severity] - ORDER[b.f.severity] || a.i - b.i)
    .map((x) => x.f);
}

export interface RedraftRequest {
  id: number;
  contractType: string;
  userRole: string | null;
  extra: string;
}

/** The instruction that turns a checked contract into a safer rewrite. */
export function buildRedraftExtra(
  original: string,
  findings: ReviewFinding[],
  missing: ReviewMissing[],
): string {
  const fixes = sortFindings(findings)
    .map((f) => `- ${f.title}: ${f.issue}${f.fix ? ` Replace with: ${f.fix}` : ""}`)
    .join("\n");
  const gaps = missing.map((m) => `- ${m.clause}: ${m.why}`).join("\n");
  const text = `REWRITE TASK. Rewrite the contract below so it is lawful, clear and fair. Keep every amount, party name, date and address exactly as written. Fix each problem listed, and add the missing protections. Do not invent facts; use [[to be filled: ...]] for anything unknown.

PROBLEMS TO FIX:
${fixes || "(none listed)"}

MISSING PROTECTIONS TO ADD:
${gaps || "(none listed)"}

ORIGINAL CONTRACT:
${original}`;
  return text.slice(0, 38000);
}

/** Asks the server to review a contract and calls onLine for each complete line as it arrives. */
export async function streamReview(
  body: { text: string; role: string | null; images: { mediaType: ImageType; data: string }[] },
  onLine: (line: ReviewLine) => void,
  signal?: AbortSignal,
): Promise<{ ok: true; mode: ApiMode } | ApiFailure> {
  try {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) return await readFailure(res);
    const mode: ApiMode = res.headers.get("x-sandhi-mode") === "live" ? "live" : "demo";

    let pending = "";
    const feed = (chunk: string) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const l of lines) {
        const parsed = parseReviewLine(l);
        if (parsed) onLine(parsed);
      }
    };

    if (!res.body) {
      feed(await res.text());
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        feed(decoder.decode(value, { stream: true }));
      }
    }
    const last = parseReviewLine(pending);
    if (last) onLine(last);
    return { ok: true, mode };
  } catch (e) {
    return isAbort(e) ? ABORTED : NETWORK;
  }
}
