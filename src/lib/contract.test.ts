import { describe, expect, it } from "vitest";
import { canonical, inlineParts, normaliseText, parseContract, splitTrailingSources } from "./contract";

const RAW = `TITLE: Test Agreement
This Agreement is made on [[to be filled: date]] between **A** and **B**.
## 1. Payment
Rent is Rs 10.
> why: Clear money terms avoid disputes. (Source: ICA-10, NOT-REAL-99)
SIGN: Landlord
===BEFORE YOU SIGN===
- Pay stamp duty (Source: STAMP-35)`;

describe("parseContract", () => {
  const m = parseContract(RAW);
  it("reads the title, clauses, signatures and notes", () => {
    expect(m.title).toBe("Test Agreement");
    expect(m.blocks.map((b) => b.type)).toEqual(["para", "heading", "para", "why"]);
    expect(m.signs).toEqual(["Landlord"]);
    expect(m.before).toHaveLength(1);
  });
  it("drops invented law IDs but keeps real ones", () => {
    const why = m.blocks.find((b) => b.type === "why");
    expect(why && why.type === "why" && why.sources).toEqual(["ICA-10"]);
  });
  it("is safe on half-written text", () => {
    expect(() => parseContract("TITLE: X\n## 1. Pay\nRent (Source: ICA-")).not.toThrow();
    expect(splitTrailingSources("Text (Source: ICA-7").text).toBe("Text");
  });
});

describe("canonical text", () => {
  it("leaves out the why notes and flattens bold and blanks", () => {
    const c = canonical(parseContract(RAW));
    expect(c).not.toMatch(/why|Why/);
    expect(c).not.toContain("**");
    expect(c).toContain("[ ______ date ]");
    expect(c.split("\n").pop()).toBe("Signature: Landlord");
  });
  it("matches after normalising pasted text", () => {
    const c = canonical(parseContract(RAW));
    expect(normaliseText("  " + c.replace(/\n/g, "\r\n\r\n") + "  ")).toBe(c);
  });
});

describe("inlineParts", () => {
  it("separates bold and blank pieces", () => {
    expect(inlineParts("a **b** [[to be filled: c]]").map((p) => p.kind)).toEqual(["text", "bold", "text", "blank"]);
  });
});
