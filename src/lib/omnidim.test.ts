import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVoiceSession, isTrustedSocket, omnidimConfigured, VoiceError } from "./omnidim";

const ok = (ws = "wss://voice.omnidim.io/call/abc") =>
  new Response(JSON.stringify({ session_id: 1, token: "sess_secret", expires_at: "2026-10-11T10:00:00Z", ws_url: ws }), { status: 201 });

beforeEach(() => {
  vi.stubEnv("OMNIDIM_API_KEY", "key-123");
  vi.stubEnv("OMNIDIM_AGENT_ID", "158910");
});
afterEach(() => vi.unstubAllEnvs());

describe("setup", () => {
  it("needs both the key and a numeric agent id", () => {
    expect(omnidimConfigured()).toBe(true);
    vi.stubEnv("OMNIDIM_AGENT_ID", "abc");
    expect(omnidimConfigured()).toBe(false);
    vi.stubEnv("OMNIDIM_AGENT_ID", "158910");
    vi.stubEnv("OMNIDIM_API_KEY", "");
    expect(omnidimConfigured()).toBe(false);
  });
  it("refuses politely when it is not set up", async () => {
    vi.stubEnv("OMNIDIM_API_KEY", "");
    await expect(createVoiceSession({ language: "English" })).rejects.toMatchObject({ code: "not_configured" });
  });
});

describe("only OmniDimension's own address is trusted", () => {
  it.each([
    ["wss://omnidim.io/ws/1", true],
    ["wss://voice.omnidim.io/x", true],
    ["ws://voice.omnidim.io/x", false],
    ["wss://evilomnidim.io/x", false],
    ["wss://omnidim.io.evil.com/x", false],
    ["https://omnidim.io/x", false],
    ["not a url", false],
    [42, false],
    [undefined, false],
  ])("%s -> %s", (url, expected) => {
    expect(isTrustedSocket(url)).toBe(expected);
  });
  it("allows localhost only when tests explicitly ask for it", () => {
    expect(isTrustedSocket("ws://localhost:4021/call")).toBe(false);
    vi.stubEnv("SANDHI_ALLOW_TEST_BASE_URL", "1");
    expect(isTrustedSocket("ws://localhost:4021/call")).toBe(true);
    expect(isTrustedSocket("wss://evil.example.com/call")).toBe(false);
  });
});

describe("creating a session", () => {
  it("sends the key only in the header and returns only the address and expiry", async () => {
    const f = vi.fn(async () => ok());
    const s = await createVoiceSession({ language: "Hindi" }, f as unknown as typeof fetch);
    expect(s).toEqual({ wsUrl: "wss://voice.omnidim.io/call/abc", expiresAt: "2026-10-11T10:00:00Z" });
    expect(JSON.stringify(s)).not.toContain("sess_secret");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://omnidim.io/api/v1/sessions/create");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer key-123");
    expect(String(init.body)).not.toContain("key-123");
    expect(JSON.parse(String(init.body))).toMatchObject({ agent_id: 158910, type: "voice", custom_variables: { language: "Hindi" } });
  });
  it.each([
    [401, "auth"],
    [402, "no_credit"],
    [429, "busy"],
    [400, "rejected"],
    [500, "upstream"],
  ])("explains a %s in plain words", async (status, code) => {
    const f = vi.fn(async () => new Response("{}", { status }));
    const err = (await createVoiceSession({ language: "English" }, f as unknown as typeof fetch).catch((e) => e)) as VoiceError;
    expect(err).toBeInstanceOf(VoiceError);
    expect(err.code).toBe(code);
    expect(err.message).not.toMatch(/key-123|Bearer/);
  });
  it("tries the second official address if the first is unreachable or has no such endpoint", async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(ok());
    await createVoiceSession({ language: "English" }, f as unknown as typeof fetch);
    expect(f.mock.calls.map((c) => c[0])).toEqual(["https://omnidim.io/api/v1/sessions/create", "https://backend.omnidim.io/api/v1/sessions/create"]);
    const g = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 404 })).mockResolvedValueOnce(ok());
    await expect(createVoiceSession({ language: "English" }, g as unknown as typeof fetch)).resolves.toBeDefined();
  });
  it("never hands the browser an address outside OmniDimension", async () => {
    const f = vi.fn(async () => ok("wss://evil.example.com/steal"));
    await expect(createVoiceSession({ language: "English" }, f as unknown as typeof fetch)).rejects.toMatchObject({ code: "bad_address" });
  });
  it("copes with an unreadable answer", async () => {
    const f = vi.fn(async () => new Response("<html>", { status: 200 }));
    await expect(createVoiceSession({ language: "English" }, f as unknown as typeof fetch)).rejects.toMatchObject({ code: "upstream" });
  });
  it("only uses a custom address when tests explicitly allow it", async () => {
    vi.stubEnv("OMNIDIM_API_BASE", "https://evil.example.com/api");
    const f = vi.fn(async () => ok());
    await createVoiceSession({ language: "English" }, f as unknown as typeof fetch);
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("https://omnidim.io/api/v1/sessions/create");
  });
});

describe("help voice agent", () => {
  it("has its own agent id and is configured separately", async () => {
    const { omnidimConfigured } = await import("./omnidim");
    const keep = { ...process.env };
    process.env.OMNIDIM_API_KEY = "k";
    process.env.OMNIDIM_AGENT_ID = "11";
    delete process.env.OMNIDIM_HELP_AGENT_ID;
    expect(omnidimConfigured()).toBe(true);
    expect(omnidimConfigured("help")).toBe(false);
    process.env.OMNIDIM_HELP_AGENT_ID = "22";
    expect(omnidimConfigured("help")).toBe(true);
    process.env = keep;
  });
});
