import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { AiError } from "./provider";

/**
 * Basic abuse protection.
 *
 * NOTE: this counter lives in memory, so each Vercel server instance keeps its own count.
 * That is fine for a hackathon and stops runaway loops. Before a real launch, replace it
 * with a shared store (for example Upstash Redis) so the limit holds across instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 40, windowMs = 60_000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  return b.count <= limit
    ? { ok: true, retryAfter: 0 }
    : { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous").slice(0, 64);
}

type FailureBody = {
  ok: false;
  error: { code: string; message: string };
  /** The page shows "Ask an advocate to review" whenever this is true. */
  needsHumanReview: boolean;
};

export function failure(code: string, message: string, status: number, needsHumanReview = true, headers?: HeadersInit) {
  const body: FailureBody = { ok: false, error: { code, message }, needsHumanReview };
  return NextResponse.json(body, { status, headers });
}

export function failureFrom(e: unknown) {
  if (e instanceof AiError) {
    const retry = e.code === "rate_limited" ? { "retry-after": "20" } : undefined;
    return failure(e.code, e.message, e.status, e.code !== "rate_limited", retry);
  }
  console.error("Unexpected server error:", e);
  return failure("server", "Something went wrong on our side. Please try again.", 500);
}

/** Checks the rate limit, then reads and validates the JSON body. */
export async function guarded<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return {
      ok: false,
      response: failure("rate_limited", "Too many requests. Please wait a moment.", 429, false, {
        "retry-after": String(limit.retryAfter),
      }),
    };
  }

  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > 300_000) {
    return { ok: false, response: failure("too_large", "That request is too large.", 413, false) };
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: failure("bad_request", "The request could not be read.", 400, false) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: failure("bad_request", "The request was not in the expected shape.", 400, false) };
  }
  return { ok: true, data: parsed.data };
}
