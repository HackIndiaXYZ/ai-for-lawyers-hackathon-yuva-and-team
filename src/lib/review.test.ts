import { describe, expect, it } from "vitest";
import { FLAWED_SAMPLE } from "@/components/check/sample";
import { mockReviewLines } from "./ai/mockReview";
import { parseReviewLine, sortFindings } from "./review";

describe("demo contract reviewer", () => {
  const lines = mockReviewLines(FLAWED_SAMPLE, "Tenant").map(parseReviewLine);
  it("produces every line in a readable form", () => {
    expect(lines.every((l) => l !== null)).toBe(true);
  });
  it("finds the loopholes in the flawed sample and scores it low", () => {
    const findings = lines.filter((l) => l?.kind === "finding");
    const meta = lines.find((l) => l?.kind === "meta");
    expect(findings.length).toBeGreaterThanOrEqual(8);
    expect(meta && meta.kind === "meta" && meta.value.safety_score).toBeLessThan(50);
  });
});

describe("parseReviewLine", () => {
  it("skips junk instead of failing", () => {
    expect(parseReviewLine("not json")).toBeNull();
    expect(parseReviewLine('{"kind":"finding"}')).toBeNull();
    expect(parseReviewLine("")).toBeNull();
  });
  it("reads a line wrapped in a code fence", () => {
    const l = parseReviewLine('```json{"kind":"missing","clause":"Notice","why":"Needed"}```');
    expect(l?.kind).toBe("missing");
  });
});

describe("sortFindings", () => {
  it("puts the worst first and keeps order within a level", () => {
    const f = (title: string, severity: "high" | "medium" | "low") =>
      ({ severity, title, clause: "", issue: "", risk: "", status: "risky", consequence: "", sources: [], law: "", fix: "" }) as never;
    const out = sortFindings([f("a", "low"), f("b", "high"), f("c", "medium"), f("d", "high")]) as unknown as { title: string }[];
    expect(out.map((x) => x.title)).toEqual(["b", "d", "c", "a"]);
  });
});
