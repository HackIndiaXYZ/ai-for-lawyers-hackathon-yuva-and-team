import { describe, expect, it } from "vitest";
import { applyTranscript, clientLineCount, clientWords, MAX_TRANSCRIPT_CHARS, transcriptText, type CallTurn } from "./callTranscript";

const feed = (events: [("user" | "agent"), string, boolean][]): CallTurn[] =>
  events.reduce<CallTurn[]>((turns, [role, text, final]) => applyTranscript(turns, { role, text, final }), []);

describe("live transcript", () => {
  it("replaces a growing snapshot instead of appending to it", () => {
    const t = feed([["user", "I want", false], ["user", "I want to rent", false], ["user", "I want to rent my flat", true]]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ text: "I want to rent my flat", final: true });
  });
  it("starts a new line when the speaker changes or the last line was settled", () => {
    const t = feed([["agent", "What do you need?", true], ["user", "A rent agreement", true], ["user", "for my flat", true]]);
    expect(t.map((x) => x.role)).toEqual(["agent", "user", "user"]);
  });
  it("settles an unfinished line when the other person starts talking", () => {
    const t = feed([["agent", "And the deposit is", false], ["user", "One lakh", false]]);
    expect(t[0].final).toBe(true);
    expect(t).toHaveLength(2);
  });
  it("ignores empty and whitespace-only updates and tidies spacing", () => {
    const t = feed([["user", "   ", false], ["user", "  rent   is  25,000 ", true]]);
    expect(t).toHaveLength(1);
    expect(t[0].text).toBe("rent is 25,000");
  });
  it("gives every line its own increasing id", () => {
    const t = feed([["agent", "a", true], ["user", "b", true], ["agent", "c", true]]);
    expect(t.map((x) => x.id)).toEqual([1, 2, 3]);
  });
});

describe("handing the call to Sandhi", () => {
  const turns = feed([["agent", "What do you need?", true], ["user", "A rent agreement", true], ["agent", "Monthly rent?", true], ["user", "Twenty five thousand", true]]);
  it("counts only what the client said", () => {
    expect(clientLineCount(turns)).toBe(2);
  });
  it("labels who said what, so the agent's questions are never read as the client's facts", () => {
    expect(transcriptText(turns)).toBe("Voice agent: What do you need?\nClient: A rent agreement\nVoice agent: Monthly rent?\nClient: Twenty five thousand");
  });
  it("keeps the newest part of a very long call, on a whole line", () => {
    const long = Array.from({ length: 4000 }, (_, i): CallTurn => ({ id: i, role: "user", text: `sentence number ${i}`, final: true }));
    const out = transcriptText(long);
    expect(out.length).toBeLessThanOrEqual(MAX_TRANSCRIPT_CHARS);
    expect(out.startsWith("Client: ")).toBe(true);
    expect(out.endsWith("sentence number 3999")).toBe(true);
  });
  it("gives the demo reader only the client's words", () => {
    expect(clientWords(transcriptText(turns))).toBe("A rent agreement Twenty five thousand");
  });
});
