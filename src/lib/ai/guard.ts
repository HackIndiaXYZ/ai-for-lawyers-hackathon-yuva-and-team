import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { logEvent, shortHash } from "../log";
import { dailyBudget, rateLimit } from "../ratelimit";
import { aiMode, AiError } from "./provider";

/** Requests allowed per minute, per visitor, for each route. The AI-heavy routes are the strictest. */
const LIMITS: Record<string, number> = {
  "/api/draft": 12,
  "/api/review": 12,
  "/api/legal-check": 20,
  "/api/obligations": 20,
  "/api/chat": 40,
};
const DEFAULT_LIMIT = 40;

/** A visitor's address as one-way hash: enough to count requests, nothing to leak. */
export async function clientKey(req: Request): Promise<string> {
  const raw =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";
  return shortHash(raw.slice(0, 64));
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
  logEvent("server_error", { error: e instanceof Error ? e.name : "unknown" });
  return failure("server", "Something went wrong on our side. Please try again.", 500);
}

/** Checks the rate limit, then reads and validates the JSON body. */
export async function guarded<T>(
  req: Request,
  schema: ZodType<T>,
  options: { maxBytes?: number } = {},
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const route = new URL(req.url).pathname;
  const who = await clientKey(req);
  const limit = await rateLimit(`${route}:${who}`, LIMITS[route] ?? DEFAULT_LIMIT);
  if (!limit.ok) {
    logEvent("rate_limited", { route, visitor: who });
    return {
      ok: false,
      response: failure("rate_limited", "Too many requests. Please wait a moment.", 429, false, {
        "retry-after": String(limit.retryAfter),
      }),
    };
  }

  // Only real AI calls cost money, so only they count against the daily budget.
  if (aiMode() === "live" && route !== "/api/status") {
    const budget = await dailyBudget();
    if (!budget.ok) {
      logEvent("daily_cap_reached", { route });
      return {
        ok: false,
        response: failure(
          "busy",
          "Sandhi has reached its limit for today. Please try again tomorrow, or ask an advocate to help you now.",
          503,
          true,
          { "retry-after": String(budget.retryAfter) },
        ),
      };
    }
  }

  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > (options.maxBytes ?? 300_000)) {
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
