import { ACTS, LAW_BY_ID } from "../law";
import type { HelpAdvice, HelpReply, HelpRequest } from "./schemas";
import { MIN_ANSWERS } from "./schemas";
import { DANGER, GENERAL, playbookById, playbookFor, type Playbook } from "./playbooks";

/**
 * Quick legal help without the real AI. It works like a careful advocate on a first call:
 * it finds out which problem this is, asks ONE question at a time until it has the whole picture,
 * and only then gives advice, built from the Sandhi law library.
 */

const SAFETY = "If anyone is in danger right now, please call 112 first.";
const JUST_TELL = /just tell me|skip|enough questions|no more questions|give me the (advice|answer)|tell me what to do|stop asking/i;
const PUSHED_BACK = "a few more questions";

const ACKS = ["Understood.", "Noted.", "I see.", "That is useful to know.", "Thank you for telling me.", "Good, that helps."];
const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);

/** Client lines from a call transcript ("Client: ..."), in order. */
function clientLines(transcript: string): string[] {
  return transcript
    .split(/\n+/)
    .map((l) => l.match(/^\s*(?:client|you|user|caller)\s*:\s*(.+)$/i)?.[1]?.trim())
    .filter((l): l is string => !!l);
}

function buildAdvice(pb: Playbook, facts: { label: string; value: string }[]): HelpAdvice {
  return {
    headline: pb.headline,
    understood: facts.map((f) => `${f.label}: ${clip(f.value)}`),
    sections: [
      ...pb.laws.map((l) => {
      const e = LAW_BY_ID.get(l.id);
      return {
        id: e ? l.id : null,
        law: e ? ACTS[e.act].full : "Indian law",
        section: e ? e.section : "",
        plain: l.plain,
        confidence: e && !e.verify ? ("high" as const) : ("verify" as const),
      };
      }),
      ...(pb.extras ?? []).map((x) => ({ id: null, law: x.law, section: x.section, plain: x.plain, confidence: "verify" as const })),
    ],
    dos: pb.dos,
    donts: pb.donts,
    steps: pb.next,
    who: pb.who,
  };
}

function adviceReply(pb: Playbook, facts: { label: string; value: string }[], limited: boolean, danger: boolean): HelpReply {
  const advice = buildAdvice(pb, facts);
  const review = limited || advice.sections.some((s) => s.confidence === "verify") || pb.id === GENERAL.id;
  return {
    reply: `${danger ? `${SAFETY} ` : ""}Thank you, I now have a clear picture. ${limited ? "I have less detail than I would like, so please treat this as a starting point. " : ""}Here is what to do and what not to do. It is on screen.`,
    topic: pb.id,
    stage: "advice",
    facts,
    urgent: danger ? `${SAFETY} Your safety comes first.` : null,
    advice,
    review,
  };
}

export function mockHelp(req: HelpRequest): HelpReply {
  const user = req.turns.filter((t) => t.role === "user").map((t) => t.content);
  const assistant = req.turns.filter((t) => t.role === "assistant").map((t) => t.content);
  const lastUser = user[user.length - 1] ?? "";
  const allText = user.join(" \n");
  const heardDanger = DANGER.test(allText);
  const saidSafety = assistant.some((a) => a.includes("112"));
  const safetyLine = heardDanger && !saidSafety ? `${SAFETY} ` : "";

  /* ---------- a finished call: the whole story arrives at once ---------- */
  if (req.callTranscript.trim()) {
    const lines = clientLines(req.callTranscript);
    const said = lines.join(" ");
    const pb = playbookFor(said) ?? GENERAL;
    const facts = lines.slice(0, 8).map((l, i) => ({ label: i === 0 ? "What happened" : `You said (${i + 1})`, value: l }));
    return adviceReply(pb, facts, lines.length < MIN_ANSWERS + 1, DANGER.test(said));
  }

  /* ---------- typed or spoken, one question at a time ---------- */
  const firstMatch = playbookFor(user[0] ?? "");
  // A client who has already described the problem in a full sentence is not asked to describe it again.
  const described = Boolean(firstMatch) || wordCount(user[0] ?? "") >= 5;
  const pb = firstMatch ?? playbookById(req.topic) ?? playbookFor(allText) ?? (described || user.length >= 2 ? GENERAL : null);

  if (!pb) {
    return {
      reply: `${safetyLine}I'm here to help, and please don't worry. In a sentence or two, what is the problem?`,
      topic: null,
      stage: "asking",
      facts: [],
      urgent: heardDanger ? SAFETY : null,
      advice: null,
      review: false,
    };
  }

  // If the first message was too vague to place, the next message is the description of the problem.
  const descriptionIdx = described ? 0 : 1;
  const answers = user.slice(descriptionIdx + 1);
  const startAt = 0;
  const answered = answers.length;
  const stepIdx = startAt + answered;

  const facts: { label: string; value: string }[] = [];
  const description = user[descriptionIdx];
  if (description) facts.push({ label: "What happened", value: description });
  answers.forEach((a, i) => {
    const step = pb.steps[startAt + i];
    if (step) facts.push({ label: step.label, value: a });
  });

  const wantsAdvice = JUST_TELL.test(lastUser);
  const alreadyPushed = assistant.some((a) => a.includes(PUSHED_BACK));
  const stepsLeft = stepIdx < pb.steps.length;

  if (wantsAdvice && stepsLeft) {
    if (answered >= MIN_ANSWERS || alreadyPushed) return adviceReply(pb, facts, answered < pb.steps.length - startAt, heardDanger);
    return {
      reply: `${safetyLine}I understand you want answers. To give you advice that is right for you and not just general, I need a few more questions. ${pb.steps[stepIdx].q}`,
      topic: pb.id,
      stage: "asking",
      facts,
      urgent: heardDanger ? SAFETY : null,
      advice: null,
      review: false,
    };
  }

  if (!stepsLeft) return adviceReply(pb, facts, false, heardDanger);

  const step = pb.steps[stepIdx];
  const ack = ACKS[answered % ACKS.length];
  const lead =
    answered === 0
      ? pb.opening ?? "I'm sorry you are dealing with this. Please don't worry, we will go through it step by step."
      : ack;
  const q = `${step.why ? `${step.why} ` : ""}${step.q}`;
  return {
    reply: `${safetyLine}${lead} ${q}`,
    topic: pb.id,
    stage: "asking",
    facts,
    urgent: heardDanger ? SAFETY : null,
    advice: null,
    review: false,
  };
}
