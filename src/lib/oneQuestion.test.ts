import { describe, expect, it } from "vitest";
import { countQuestions, keepOneQuestion } from "./oneQuestion";
import { mockConversation } from "./ai/mock";
import { INTERVIEW } from "./ai/interview";
import { conversationReplySchema, sanitizeReply } from "./ai/schemas";

describe("keepOneQuestion", () => {
  it("leaves a single question alone", () => {
    expect(keepOneQuestion("Thank you. What is the monthly rent?")).toBe("Thank you. What is the monthly rent?");
  });
  it("leaves a statement alone", () => {
    expect(keepOneQuestion("I am drafting it now.")).toBe("I am drafting it now.");
  });
  it("keeps only the first of several questions", () => {
    expect(keepOneQuestion("Got it. What is the rent? When is it due? Is there a deposit?")).toBe("Got it. What is the rent?");
  });
  it("splits a question joined by 'and'", () => {
    expect(keepOneQuestion("What is the rent, and when is it due?")).toBe("What is the rent?");
    expect(keepOneQuestion("How long will it run and what notice is needed?")).toBe("How long will it run?");
  });
  it("does not break a question that merely contains 'and'", () => {
    expect(keepOneQuestion("What are the names of the landlord and the tenant?")).toBe("What are the names of the landlord and the tenant?");
  });
  it("drops what comes after the question", () => {
    expect(keepOneQuestion("What is the rent? Please say it in rupees.")).toBe("What is the rent?");
  });
  it("counts both kinds of question mark", () => {
    expect(countQuestions("a? b？")).toBe(2);
  });
  it("is applied to every reply the server sends", () => {
    const reply = sanitizeReply(conversationReplySchema.parse({ reply: "Noted. Who is the tenant? And what is the rent?" }), { ready: false, pushback: 0 } as never);
    expect(countQuestions(reply.reply)).toBe(1);
  });
});

describe("the demo interview", () => {
  const state = (over = {}) => ({ lang: "en", contractType: null, userRole: null, stage: null, ready: false, pushback: 0, drafted: false, details: {}, docContext: "", callTranscript: "", ...over });
  it("never asks more than one question in a turn, for every contract type", () => {
    for (const [type, steps] of Object.entries(INTERVIEW)) {
      for (const st of steps) expect(countQuestions(st.q), `${type}: ${st.q}`).toBe(1);
    }
  });
  it("walks through a rent interview one question at a time and reads typed answers", () => {
    const turns: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: "I want to rent out my flat" }];
    let st: Record<string, unknown> = state();
    const details: Record<string, string> = {};
    const asked: string[] = [];
    const answers: Record<string, string> = {
      "landlord's full name": "Ramesh Kumar",
      "tenant's full name": "Suresh Reddy",
      "monthly rent": "twenty five thousand",
      "security deposit": "one lakh fifty thousand",
      "address of the property": "Flat 302, Green Heights, Madhapur",
      "date does the tenancy start": "1st November 2026",
      "How long will the tenancy run": "eleven months",
    };
    let done = false;
    for (let i = 0; i < 40 && !done; i++) {
      const r = mockConversation({ turns, state: { ...st, details } } as never);
      expect(countQuestions(r.reply), r.reply).toBeLessThanOrEqual(1);
      for (const f of r.fields) details[f.key] = f.value;
      asked.push(r.reply);
      turns.push({ role: "assistant", content: r.reply });
      st = { ...st, contractType: r.contract_type, userRole: r.user_role, stage: r.stage, ready: r.ready, pushback: r.pushback ? 1 : 0 };
      if (r.stage === "confirm") { done = true; break; }
      const key = Object.keys(answers).find((k) => r.reply.includes(k));
      turns.push({ role: "user", content: key ? answers[key] : "no" });
    }
    expect(done).toBe(true);
    expect(asked.length).toBeGreaterThan(8); // a long, patient interview
    expect(details).toMatchObject({ landlord_name: "Ramesh Kumar", tenant_name: "Suresh Reddy", monthly_rent: "Rs 25,000", security_deposit: "Rs 1,50,000", start_date: "1 November 2026", term: "11 months" });
    expect(new Set(asked).size).toBe(asked.length); // no question is repeated
  });
});
