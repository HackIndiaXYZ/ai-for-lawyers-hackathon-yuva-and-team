import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dailyBudget, dailyCap, limiterKind, rateLimit, resetMemoryLimits } from "./ratelimit";

beforeEach(() => {
  resetMemoryLimits();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("in-memory limiter", () => {
  it("allows up to the limit, then blocks with a wait time", async () => {
    const t = 1_000_000_000_000;
    for (let i = 0; i < 3; i++) expect((await rateLimit("a", 3, 60, t)).ok).toBe(true);
    const blocked = await rateLimit("a", 3, 60, t);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });
  it("counts each visitor separately", async () => {
    const t = 1_000_000_000_000;
    await rateLimit("a", 1, 60, t);
    expect((await rateLimit("a", 1, 60, t)).ok).toBe(false);
    expect((await rateLimit("b", 1, 60, t)).ok).toBe(true);
  });
  it("starts fresh in the next window", async () => {
    const t = 1_000_000_000_000;
    await rateLimit("a", 1, 60, t);
    expect((await rateLimit("a", 1, 60, t)).ok).toBe(false);
    expect((await rateLimit("a", 1, 60, t + 61_000)).ok).toBe(true);
  });
  it("reports which limiter is active", () => {
    expect(limiterKind()).toBe("memory");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    expect(limiterKind()).toBe("shared");
  });
});

describe("shared (Redis) limiter", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
  });
  it("counts in Redis with the token, not in memory", async () => {
    let n = 0;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ result: ++n }, { result: 1 }])));
    vi.stubGlobal("fetch", fetchMock);
    const t = 1_000_000_000_000;
    expect((await rateLimit("a", 2, 60, t)).ok).toBe(true);
    expect((await rateLimit("a", 2, 60, t)).ok).toBe(true);
    expect((await rateLimit("a", 2, 60, t)).ok).toBe(false);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://x.upstash.io/pipeline");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret-token");
    expect(String(init.body)).toContain("INCR");
  });
  it("falls back to memory, and does not lock everyone out, if Redis fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const t = 1_000_000_000_000;
    expect((await rateLimit("a", 1, 60, t)).ok).toBe(true);
    expect((await rateLimit("a", 1, 60, t)).ok).toBe(false);
  });
});

describe("daily budget", () => {
  it("defaults to 2000 and can be set", () => {
    expect(dailyCap()).toBe(2000);
    vi.stubEnv("SANDHI_DAILY_AI_CAP", "3");
    expect(dailyCap()).toBe(3);
    vi.stubEnv("SANDHI_DAILY_AI_CAP", "junk");
    expect(dailyCap()).toBe(2000);
  });
  it("stops AI calls once the cap is reached", async () => {
    vi.stubEnv("SANDHI_DAILY_AI_CAP", "2");
    const t = Date.UTC(2026, 9, 9, 10, 0, 0);
    expect((await dailyBudget(t)).ok).toBe(true);
    expect((await dailyBudget(t)).ok).toBe(true);
    const over = await dailyBudget(t);
    expect(over.ok).toBe(false);
    expect(over.retryAfter).toBeGreaterThan(0);
  });
});
