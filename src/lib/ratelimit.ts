import { logEvent } from "./log";

/**
 * Rate limiting and a daily budget cap.
 *
 * - With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, counters live in Upstash Redis, so the
 *   limit holds across every Vercel server instance.
 * - Without them, counters live in this server's memory. That still stops a runaway loop, but each
 *   instance counts on its own, so it is only a soft limit. The app says so in the log, once.
 * - If Redis is set but fails, the limiter falls back to memory instead of blocking everyone.
 */

export interface LimitResult {
  ok: boolean;
  /** Seconds until the window resets. 0 when allowed. */
  retryAfter: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();
let warnedMemory = false;
let warnedRedis = false;

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export function limiterKind(): "shared" | "memory" {
  return redisConfig() ? "shared" : "memory";
}

function memoryCount(key: string, windowSec: number, now: number): { count: number; resetAt: number } {
  if (memory.size > 5000) {
    for (const [k, b] of memory) if (b.resetAt < now) memory.delete(k);
  }
  const b = memory.get(key);
  if (!b || b.resetAt < now) {
    const fresh = { count: 1, resetAt: now + windowSec * 1000 };
    memory.set(key, fresh);
    return fresh;
  }
  b.count += 1;
  return b;
}

/** Adds one to a counter and returns the new total. Throws if Redis is configured but unreachable. */
async function redisIncrement(key: string, windowSec: number): Promise<number> {
  const cfg = redisConfig()!;
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec + 5)],
    ]),
    signal: AbortSignal.timeout(1500),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = (await res.json()) as { result?: unknown }[];
  const n = Number(out?.[0]?.result);
  if (!Number.isFinite(n)) throw new Error("redis bad reply");
  return n;
}

async function increment(key: string, windowSec: number, now: number): Promise<{ count: number; retryAfter: number }> {
  const bucket = Math.floor(now / (windowSec * 1000));
  const retryAfter = Math.max(1, windowSec - Math.floor((now % (windowSec * 1000)) / 1000));

  if (redisConfig()) {
    try {
      return { count: await redisIncrement(`sandhi:${key}:${bucket}`, windowSec), retryAfter };
    } catch (e) {
      if (!warnedRedis) {
        warnedRedis = true;
        logEvent("ratelimit_redis_failed", { error: e instanceof Error ? e.message.slice(0, 80) : "unknown" });
      }
    }
  } else if (!warnedMemory) {
    warnedMemory = true;
    logEvent("ratelimit_memory_only", { note: "UPSTASH_REDIS_REST_URL not set; limits are per server instance" });
  }

  const m = memoryCount(`${key}:${bucket}`, windowSec, now);
  return { count: m.count, retryAfter: Math.max(1, Math.ceil((m.resetAt - now) / 1000)) };
}

/** Allows at most `limit` calls per `windowSec` seconds for this key. */
export async function rateLimit(key: string, limit = 40, windowSec = 60, now = Date.now()): Promise<LimitResult> {
  const { count, retryAfter } = await increment(`rl:${key}`, windowSec, now);
  return count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter };
}

/** The most paid AI calls Sandhi will make in one day, so a bug or a crowd cannot empty the AI account. */
export function dailyCap(): number {
  const n = Number(process.env.SANDHI_DAILY_AI_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2000;
}

export async function dailyBudget(now = Date.now()): Promise<LimitResult> {
  const day = new Date(now).toISOString().slice(0, 10);
  const secondsLeft = Math.max(60, 86_400 - Math.floor((now % 86_400_000) / 1000));
  const { count } = await increment(`day:${day}`, 86_400, now);
  return count <= dailyCap() ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: secondsLeft };
}

/** Test helper: forget every in-memory counter. */
export function resetMemoryLimits(): void {
  memory.clear();
  warnedMemory = false;
  warnedRedis = false;
}
