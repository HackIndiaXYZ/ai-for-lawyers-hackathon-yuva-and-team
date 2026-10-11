import { describe, expect, it } from "vitest";
import { mockDraftText } from "./ai/mock";
import { CONTRACT_TYPES, LAW_BY_ID } from "./law";
import { RULEBOOK, COMMON_RULES } from "../data/rulebook";
import { checkDraft, clauseText, leaseMonths, rulebookPrompt, rulesFor } from "./rulebook";
import { PROVENANCE } from "../data/provenance";

const draft = (type: string) => mockDraftText({ contractType: type, userRole: null, details: {}, said: "", extra: "" } as never);

describe("rulebook data", () => {
  it("only cites provisions that exist in the law library", () => {
    for (const r of [...COMMON_RULES, ...Object.values(RULEBOOK).flat()]) {
      for (const id of r.law) expect(LAW_BY_ID.has(id), `${r.id} cites ${id}`).toBe(true);
    }
  });
  it("gives every rule a unique id and a way to be checked", () => {
    const all = [...COMMON_RULES, ...Object.values(RULEBOOK).flat()];
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
    for (const r of all) if (r.kind !== "confirm") expect(r.any?.length, r.id).toBeGreaterThan(0);
  });
  it("has provenance only for provisions that exist", () => {
    for (const id of Object.keys(PROVENANCE)) expect(LAW_BY_ID.has(id), id).toBe(true);
  });
});

describe("what the drafts must contain", () => {
  for (const t of CONTRACT_TYPES) {
    it(`the sample ${t.name} satisfies its own rulebook`, () => {
      const c = checkDraft(t.name, draft(t.name));
      const bad = c.items.filter((i) => i.status === "missing" || i.status === "problem").map((i) => i.id);
      expect(bad).toEqual([]);
      expect(c.confirm).toBeGreaterThan(0);
    });
  }
});

describe("what the checker catches", () => {
  const base = draft("Residential Rent Agreement");
  it("notices a missing clause", () => {
    const stripped = base.replace(/## \d+\. Termination and notice[\s\S]*?(?=## )/, "");
    const c = checkDraft("Residential Rent Agreement", stripped);
    expect(c.items.find((i) => i.id === "r-notice")?.status).toBe("missing");
    expect(c.needsReview).toBe(true);
  });
  it("flags clauses the law makes void", () => {
    const evil = base.replace("===BEFORE YOU SIGN===", "The decision of the Landlord shall be final. The Landlord may evict the Tenant at any time without notice. The entire security deposit is forfeited on early exit.\n===BEFORE YOU SIGN===");
    const c = checkDraft("Residential Rent Agreement", evil);
    const problems = c.items.filter((i) => i.status === "problem").map((i) => i.id);
    expect(problems).toEqual(expect.arrayContaining(["void-remedies", "r-evict", "penalty"]));
    expect(c.needsReview).toBe(true);
  });
  it("flags a post-employment non-compete", () => {
    const e = draft("Employment Agreement").replace("===BEFORE YOU SIGN===", "After termination of employment the Employee shall not work for any competitor for two years.\n===BEFORE YOU SIGN===");
    expect(checkDraft("Employment Agreement", e).items.find((i) => i.id === "e-noncompete")?.status).toBe("problem");
  });
  it("does not let a 'why' line stand in for a real clause", () => {
    const onlyWhy = "TITLE: X\n## 1. Rent\nThe parties agree.\n> why: Dispute resolution by arbitration, courts at Hyderabad, governed by the laws of India. (Source: ARB-7)";
    const c = checkDraft("Residential Rent Agreement", onlyWhy);
    expect(c.items.find((i) => i.id === "disputes")?.status).toBe("missing");
    expect(c.items.find((i) => i.id === "law")?.status).toBe("missing");
  });
  it("ignores the BEFORE YOU SIGN notes when looking for clauses", () => {
    expect(clauseText("## 1. A\nbody\n===BEFORE YOU SIGN===\n- arbitration courts")).not.toContain("arbitration");
  });
  it("only asks vehicle questions for a vehicle sale", () => {
    const phone = "TITLE: SALE\n## 1. Item\nThe Seller sells a phone described as a laptop. Price paid. Delivered. Title is free from claims. Sold as is.";
    const ids = checkDraft("Sale of Movable Property", phone).items.map((i) => i.id);
    expect(ids).not.toContain("s-transfer");
    const bike = checkDraft("Sale of Movable Property", phone.replace("laptop", "bike")).items.map((i) => i.id);
    expect(bike).toContain("s-transfer");
  });
  it("always asks the person to confirm stamping and never quotes a rate", () => {
    const c = checkDraft("Residential Rent Agreement", base);
    const stamp = c.items.find((i) => i.id === "stamp");
    expect(stamp?.status).toBe("confirm");
    expect(stamp?.need).not.toMatch(/\d+(\.\d+)?\s?%/);
  });
  it("says whether the lease must be registered", () => {
    expect(leaseMonths("the tenancy runs for 11 months")).toBe(11);
    expect(leaseMonths("term of 3 years")).toBe(36);
    expect(leaseMonths("runs for [[to be filled]]")).toBeNull();
    const long = checkDraft("Residential Rent Agreement", "the tenancy begins today and runs for 3 years.");
    expect(long.items.find((i) => i.id === "r-register")?.note).toMatch(/MUST be registered/);
  });
  it("handles an unknown type with only the common rules", () => {
    expect(rulesFor(null).length).toBeGreaterThan(5);
    expect(checkDraft(null, "").needsReview).toBe(true);
  });
});

describe("what the AI is told", () => {
  it("lists what must, must not and must be confirmed", () => {
    const p = rulebookPrompt("Freelance Services Agreement");
    expect(p).toMatch(/MUST contain/);
    expect(p).toMatch(/NEVER contain/);
    expect(p).toMatch(/CRA-19/);
    expect(p).toMatch(/Never invent a figure, rate or date/);
  });
});
