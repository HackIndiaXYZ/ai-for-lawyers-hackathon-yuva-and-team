import { describe, expect, it } from "vitest";
import { LAW_BY_ID } from "../law";
import { countQuestions } from "../oneQuestion";
import { mockHelp } from "./mock";
import { DANGER, GENERAL, PLAYBOOKS, playbookFor } from "./playbooks";
import { helpReplySchema, sanitizeHelp, type HelpReply } from "./schemas";

type T = { role: "user" | "assistant"; content: string };
const req = (turns: T[], topic: string | null = null, callTranscript = "") => ({ turns, lang: "en" as const, topic, callTranscript });

/** Plays a whole conversation, answering every question with the next answer, and returns each reply. */
function run(opening: string, answers: string[]): HelpReply[] {
  const turns: T[] = [{ role: "user", content: opening }];
  const out: HelpReply[] = [];
  let topic: string | null = null;
  for (let i = 0; i < 30; i++) {
    const r = mockHelp(req(turns, topic));
    out.push(r);
    topic = r.topic;
    turns.push({ role: "assistant", content: r.reply });
    if (r.stage === "advice") break;
    turns.push({ role: "user", content: answers[i] ?? "no" });
  }
  return out;
}

describe("playbooks", () => {
  it("only cite laws that exist in the library", () => {
    for (const p of [...PLAYBOOKS, GENERAL]) for (const l of p.laws) expect(LAW_BY_ID.has(l.id), `${p.id}: ${l.id}`).toBe(true);
  });
  it("ask one question per step", () => {
    for (const p of [...PLAYBOOKS, GENERAL]) for (const s of p.steps) expect(countQuestions(s.q), `${p.id}: ${s.q}`).toBe(1);
  });
  it("each have real do and do-not lists and a human to approach", () => {
    for (const p of [...PLAYBOOKS, GENERAL]) {
      expect(p.dos.length).toBeGreaterThanOrEqual(3);
      expect(p.donts.length).toBeGreaterThanOrEqual(3);
      expect(p.who.length).toBeGreaterThan(10);
    }
  });
  it("recognise everyday problems", () => {
    expect(playbookFor("my landlord is not returning my deposit")?.id).toBe("deposit");
    expect(playbookFor("my employer has not paid my salary")?.id).toBe("unpaid");
    expect(playbookFor("a cheque I received bounced")?.id).toBe("cheque");
    expect(playbookFor("I was cheated online")?.id).toBe("fraud");
    expect(playbookFor("my landlord is threatening to throw me out")?.id).toBe("tenant_trouble");
    expect(playbookFor("my tenant is not paying rent")?.id).toBe("landlord_trouble");
  });
  it("spot danger words", () => {
    expect(DANGER.test("he threatened to beat me")).toBe(true);
    expect(DANGER.test("he has not paid the rent")).toBe(false);
  });
});

describe("demo Quick legal help", () => {
  it("asks exactly one question at a time and only then gives advice", () => {
    const replies = run("My landlord is not returning my deposit", ["Tenant", "1 lakh", "1 Sept 2026", "he says damage", "WhatsApp chats", "no dues", "full deposit back", "no"]);
    const asking = replies.filter((r) => r.stage === "asking");
    expect(asking.length).toBeGreaterThanOrEqual(6);
    for (const r of asking) {
      expect(countQuestions(r.reply), r.reply).toBe(1);
      expect(r.advice).toBeNull();
    }
    expect(new Set(asking.map((r) => r.reply)).size).toBe(asking.length);
    const last = replies[replies.length - 1];
    expect(last.stage).toBe("advice");
    expect(last.advice?.dos.length).toBeGreaterThan(2);
    expect(last.advice?.donts.length).toBeGreaterThan(2);
    expect(last.advice?.sections.every((s) => s.id === null || LAW_BY_ID.has(s.id))).toBe(true);
    expect(last.advice?.understood.join(" ")).toContain("1 lakh");
    expect(last.review).toBe(true); // the model tenancy law is marked verify, so a human check is requested
  });

  it("asks what the problem is when the opening is vague, then carries on", () => {
    const [first, second] = run("I need help", ["my cheque bounced last week"]);
    expect(first.topic).toBeNull();
    expect(countQuestions(first.reply)).toBe(1);
    expect(second.topic).toBe("cheque");
  });

  it("falls back to the general plan for an unknown problem and asks for a human lawyer", () => {
    const replies = run("something strange happened with my neighbour", ["he did a thing", "my neighbour", "last week", "none", "I lost sleep", "peace", "no"]);
    const last = replies[replies.length - 1];
    expect(last.stage).toBe("advice");
    expect(last.topic).toBe("general");
    expect(last.review).toBe(true);
  });

  it("pushes back once on 'just tell me' when too little is known, then gives limited advice", () => {
    const turns: T[] = [{ role: "user", content: "my salary is unpaid" }];
    let r = mockHelp(req(turns));
    turns.push({ role: "assistant", content: r.reply }, { role: "user", content: "just tell me what to do" });
    r = mockHelp(req(turns, r.topic));
    expect(r.stage).toBe("asking");
    expect(r.reply).toContain("a few more questions");
    expect(countQuestions(r.reply)).toBe(1);
    turns.push({ role: "assistant", content: r.reply }, { role: "user", content: "just tell me what to do" });
    r = mockHelp(req(turns, r.topic));
    expect(r.stage).toBe("advice");
    expect(r.review).toBe(true);
  });

  it("tells the person to call 112 when there is danger", () => {
    const r = mockHelp(req([{ role: "user", content: "my landlord threatened to beat me and throw me out" }]));
    expect(r.reply).toContain("112");
    expect(r.urgent).toContain("112");
  });

  it("turns a finished call into advice at once, from the client's own words", () => {
    const call = "Voice agent: What is wrong?\nClient: A cheque I received for 2 lakh bounced.\nVoice agent: When?\nClient: Last week.\nVoice agent: Why?\nClient: Insufficient funds.\nVoice agent: Wanted?\nClient: My money back.";
    const r = mockHelp(req([{ role: "user", content: "I spoke to the agent" }], null, call));
    expect(r.stage).toBe("advice");
    expect(r.topic).toBe("cheque");
    expect(r.advice?.understood[0]).toContain("cheque");
  });
});

describe("sanitizeHelp (the safety layer for real AI replies)", () => {
  const ai = (over: Record<string, unknown>) =>
    helpReplySchema.parse({
      reply: "Here is the advice.",
      stage: "advice",
      advice: {
        headline: "H",
        understood: ["a"],
        sections: [
          { id: "ICA-73", law: "Contract Act", section: "s.73", plain: "x", confidence: "high" },
          { id: "MADE-UP-99", law: "Invented Act", section: "s.1", plain: "y", confidence: "high" },
          { id: "MTA-2021", law: "Model Tenancy Act", section: "whole", plain: "z", confidence: "high" },
        ],
        dos: ["Do a"],
        donts: ["Do not b"],
        steps: ["s"],
        who: "lawyer",
      },
      ...over,
    });

  it("holds advice back until enough questions were answered, and asks one question instead", () => {
    const r = sanitizeHelp(ai({}), { clientTurns: 2, fromCall: false });
    expect(r.advice).toBeNull();
    expect(r.stage).toBe("asking");
    expect(countQuestions(r.reply)).toBe(1);
  });
  it("allows advice after enough answers, and checks every law id", () => {
    const r = sanitizeHelp(ai({}), { clientTurns: 7, fromCall: false });
    expect(r.stage).toBe("advice");
    const [a, b, c] = r.advice!.sections;
    expect(a).toMatchObject({ id: "ICA-73", confidence: "high" });
    expect(b).toMatchObject({ id: null, confidence: "verify" });
    expect(c).toMatchObject({ id: "MTA-2021", confidence: "verify" }); // library marks it verify
    expect(r.review).toBe(true);
  });
  it("allows advice straight after a call", () => {
    expect(sanitizeHelp(ai({}), { clientTurns: 1, fromCall: true }).stage).toBe("advice");
  });
  it("cuts several questions down to one while still asking", () => {
    const r = sanitizeHelp(helpReplySchema.parse({ reply: "Noted. Who is it? When was it? How much?" }), { clientTurns: 1, fromCall: false });
    expect(countQuestions(r.reply)).toBe(1);
  });
  it("never lets a broken AI reply through as advice with no sources", () => {
    const r = sanitizeHelp(ai({ advice: { headline: "H", understood: [], sections: [], dos: ["x"], donts: ["y"], steps: [], who: "" } }), { clientTurns: 9, fromCall: false });
    expect(r.review).toBe(true);
  });
});

describe("a lawyer's way of speaking and relevance", () => {
  it("recognises a police-conduct problem however it is worded", () => {
    expect(playbookFor("a police was rude to me just because I am walking on the road")?.id).toBe("police");
    expect(playbookFor("I was walking on a road at 1 am, a police is objecting me")?.id).toBe("police");
    expect(playbookFor("police are not registering my FIR")?.id).toBe("police");
    expect(playbookFor("police arrested my brother")?.id).toBe("police");
  });

  it("answers the rights question straight away and never asks about contracts, writing or money", () => {
    const replies = run("a police was rude to me just because I am walking on the road", ["on the main road near my house at 1 am", "he shouted that I should not walk at night", "no, he let me go", "no", "no", "no I did not see", "no", "to know my rights", "no"]);
    const first = replies[0];
    expect(first.topic).toBe("police");
    expect(first.reply).toMatch(/not an offence/);
    expect(first.reply).toMatch(/Where exactly/);
    for (const r of replies.filter((x) => x.stage === "asking")) {
      expect(r.reply, r.reply).not.toMatch(/agreement|receipts|bank transfers|what have you lost/i);
      expect(countQuestions(r.reply)).toBe(1);
    }
    const last = replies[replies.length - 1];
    expect(last.stage).toBe("advice");
    expect(last.advice?.headline).toMatch(/police/i);
    expect(last.advice?.sections.map((s) => s.section).join(" ")).toMatch(/Article 22/);
    expect(last.advice?.sections.filter((s) => s.id === null).every((s) => s.confidence === "verify")).toBe(true);
    expect(last.review).toBe(true);
  });

  it("explains why it asks, in a sentence with no question mark", () => {
    const r = mockHelp(req([{ role: "user", content: "a police stopped me on the road" }]));
    expect(r.reply).toMatch(/place and the time decide/);
    expect(countQuestions(r.reply)).toBe(1);
  });

  it("does not ask a client who already described the problem in a sentence to describe it again", () => {
    const r = mockHelp(req([{ role: "user", content: "my neighbour keeps dumping garbage at my gate every day" }]));
    expect(r.reply).not.toMatch(/what is the problem/i);
    expect(r.topic).toBe("general");
    expect(r.reply).toMatch(/Who is involved/);
  });

  it("varies its acknowledgements instead of saying the same words every turn", () => {
    const replies = run("a police was rude to me on the road", ["road", "shouted", "no", "no", "no"]);
    const leads = replies.filter((r) => r.stage === "asking").slice(1, 5).map((r) => r.reply.split(" ").slice(0, 2).join(" "));
    expect(new Set(leads).size).toBeGreaterThan(2);
  });
});
