import { describe, expect, it } from "vitest";
import { ACTS, LAW_BY_ID, LAW_LIBRARY, validIds } from "./law";

describe("law library", () => {
  it("has unique ids that start with a known Act", () => {
    const ids = LAW_LIBRARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of LAW_LIBRARY) {
      expect(ACTS[e.act], e.id).toBeDefined();
      expect(e.id.startsWith(e.act + "-"), e.id).toBe(true);
    }
  });
  it("has complete entries", () => {
    for (const e of LAW_LIBRARY) {
      expect(e.title.length, e.id).toBeGreaterThan(3);
      expect(e.summary.length, e.id).toBeGreaterThan(20);
      expect(e.consequence.length, e.id).toBeGreaterThan(10);
    }
  });
  it("still has entries waiting for a check against India Code (see docs/LAW_VERIFICATION.md)", () => {
    const pending = LAW_LIBRARY.filter((e) => e.verify);
    expect(pending.length).toBeGreaterThan(0);
  });
  it("validIds keeps real ids and drops anything else", () => {
    expect(validIds(["ICA-74", "FAKE-1", "ICA-74"])).toEqual(["ICA-74"]);
    expect(validIds(null)).toEqual([]);
    expect(LAW_BY_ID.get("ICA-74")).toBeDefined();
  });
});
