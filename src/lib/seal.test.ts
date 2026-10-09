import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonical, parseContract } from "./contract";
import { mockDraftText } from "./ai/mock";
import * as S from "./seal";

const draft = (details: Record<string, string> = {}) =>
  mockDraftText({ contractType: "Residential Rent Agreement", userRole: "Landlord", details, said: "", extra: "" } as never);

function fillAll(text: string): string {
  const values: Record<string, string> = {};
  for (const b of S.listBlanks(text)) values[b] = "filled";
  return S.fillBlanks(text, values);
}

describe("blanks", () => {
  it("lists each open blank once", () => {
    const blanks = S.listBlanks(draft());
    expect(blanks.length).toBeGreaterThan(4);
    expect(new Set(blanks).size).toBe(blanks.length);
  });
  it("fills only blanks that were answered", () => {
    const text = draft();
    const first = S.listBlanks(text)[0];
    const next = S.fillBlanks(text, { [first]: "1 Nov 2026" });
    expect(S.listBlanks(next)).not.toContain(first);
    expect(S.listBlanks(next).length).toBe(S.listBlanks(text).length - 1);
  });
  it("leaves a blank alone when the answer is only spaces", () => {
    const text = draft();
    const first = S.listBlanks(text)[0];
    expect(S.fillBlanks(text, { [first]: "   " })).toBe(text);
  });
  it("cannot be used to inject contract markup", () => {
    expect(S.cleanValue("**x** [[y]]\n## z")).toBe("x y ## z");
    expect(S.cleanValue("## New clause")).toBe("New clause");
    expect(S.cleanValue("SIGN: someone")).toBe("someone");
    expect(S.cleanValue("===BEFORE YOU SIGN===")).toBe("BEFORE YOU SIGN");
    expect(S.cleanValue("a".repeat(500)).length).toBe(200);
  });
});

describe("seal", () => {
  it("fingerprints exactly the canonical text with SHA-256", async () => {
    const text = fillAll(draft());
    const seal = await S.createSeal(text, "ready to sign", new Date("2026-10-09T10:00:00Z"));
    const expected = createHash("sha256").update(canonical(parseContract(text))).digest("hex");
    expect(seal.hash).toBe(expected);
    expect(seal.sealedAt).toBe("2026-10-09T10:00:00.000Z");
    expect(S.shortCode(seal.hash)).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
  });
  it("changes if a single character changes", async () => {
    const text = fillAll(draft());
    const a = await S.createSeal(text, null);
    const b = await S.createSeal(text.replace("filled", "filleD"), null);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("verifying a copy", () => {
  it("accepts the exported text file, ignoring the seal block", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    const r = await S.verifyCopy(S.exportText(seal, "https://x.app"), seal.hash, seal.text);
    expect(r.state).toBe("match");
  });
  it("accepts the exported JSON file and a spaced, upper-case fingerprint", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    const json = S.exportJson(seal, { status: "unavailable", reason: "test" });
    const r = await S.verifyCopy(json, S.groupHex(seal.hash), null);
    expect(r.state).toBe("match");
  });
  it("ignores harmless spacing and line-ending differences", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    const messy = "  " + seal.text.replace(/\n/g, "\r\n\r\n  ") + "\n\n";
    expect((await S.verifyCopy(messy, seal.hash, null)).state).toBe("match");
  });
  it("catches one changed figure and shows exactly that line", async () => {
    const seal = await S.createSeal(fillAll(draft({ monthly_rent: "Rs 25,000" })), null);
    const tampered = seal.text.replace("Rs 25,000", "Rs 2,500");
    const r = await S.verifyCopy(tampered, seal.hash, seal.text);
    expect(r.state).toBe("mismatch");
    if (r.state !== "mismatch") return;
    const changed = r.diff!.filter((d) => d.kind !== "same");
    expect(changed).toHaveLength(2);
    expect(changed[0].text).toContain("Rs 25,000");
    expect(changed[1].text).toContain("Rs 2,500");
  });
  it("catches a deleted signature line", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    const cut = seal.text.split("\n").slice(0, -1).join("\n");
    expect((await S.verifyCopy(cut, seal.hash, null)).state).toBe("mismatch");
  });
  it("treats the short code as a quick check and says so", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    const r = await S.verifyCopy(seal.text, S.shortCode(seal.hash), null);
    expect(r.state === "match" && r.strength).toBe("short");
  });
  it("rejects a malformed fingerprint and an empty copy in plain words", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    const bad = await S.verifyCopy(seal.text, "12345", null);
    expect(bad.state === "invalid" && bad.message).toMatch(/64 letters and numbers/);
    expect((await S.verifyCopy("hi", seal.hash, null)).state).toBe("invalid");
  });
  it("does not freeze on a huge comparison", () => {
    expect(S.diffLines("a\n".repeat(900), "b\n".repeat(900))).toBeNull();
  });
});

describe("JSON export", () => {
  it("is always marked for human review and flags demo obligations", async () => {
    const seal = await S.createSeal(fillAll(draft()), "fix before signing");
    const j = JSON.parse(
      S.exportJson(seal, {
        status: "ok",
        mode: "demo",
        items: [{ party: "A", action: "Pay", amount: null, due: "monthly", trigger: null, penalty: null }],
      }),
    );
    expect(j.schema).toBe("sandhi.contract.v1");
    expect(j.seal.sha256).toBe(seal.hash);
    expect(j.needsHumanReview).toBe(true);
    expect(j.obligationsNote).toMatch(/Demo mode/);
    expect(j.legalCheckVerdict).toBe("fix before signing");
  });
  it("says so when obligations could not be read", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    const j = JSON.parse(S.exportJson(seal, { status: "unavailable", reason: "upstream down" }));
    expect(j.obligations).toEqual([]);
    expect(j.obligationsStatus).toBe("unavailable");
    expect(j.obligationsNote).toBe("upstream down");
  });
});

describe("seals kept on this device", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
  });
  it("saves, lists and removes", async () => {
    const seal = await S.createSeal(fillAll(draft()), null);
    expect(S.saveSeal(seal)).toBe(true);
    expect(S.loadSeals()).toHaveLength(1);
    S.removeSeal(seal.id);
    expect(S.loadSeals()).toHaveLength(0);
  });
  it("ignores damaged or hand-edited entries instead of crashing", () => {
    store.set("sandhi.seals.v1", JSON.stringify([{ id: 1 }, { id: "a", hash: "nothex", text: "t", sealedAt: "x" }, null]));
    expect(S.loadSeals()).toEqual([]);
    store.set("sandhi.seals.v1", "{not json");
    expect(S.loadSeals()).toEqual([]);
  });
  it("keeps only the newest few", async () => {
    for (let i = 0; i < 12; i++) {
      S.saveSeal(await S.createSeal(fillAll(draft()).replace("filled", `v${i}`), null));
    }
    expect(S.loadSeals().length).toBe(8);
  });
  it("survives a browser that refuses to store anything", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    const seal = await S.createSeal(fillAll(draft()), null);
    expect(S.saveSeal(seal)).toBe(false);
  });
});
