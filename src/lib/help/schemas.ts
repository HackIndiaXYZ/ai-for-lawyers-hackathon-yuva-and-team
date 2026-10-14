import { z } from "zod";
import { LAW_BY_ID } from "../law";
import { turnSchema } from "../ai/schemas";
import { keepOneQuestion } from "../oneQuestion";

/** What the browser sends for one turn of Quick legal help. */
export const helpRequestSchema = z.object({
  turns: z.array(turnSchema).min(1).max(60),
  lang: z.enum(["en", "hi", "te"]).default("en"),
  /** The playbook the demo settled on, sent back so it stays the same all conversation. Ignored by the real AI. */
  topic: z.string().max(40).nullable().default(null),
  /** Words from a voice call with the help agent. Sent once, when the call is handed to Sandhi. */
  callTranscript: z.string().max(20000).default(""),
});
export type HelpRequest = z.infer<typeof helpRequestSchema>;

const str = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

export const helpReplySchema = z.object({
  reply: z.string().min(1).max(2000),
  topic: z.string().nullable().catch(null),
  stage: z.enum(["asking", "advice"]).catch("asking"),
  facts: z.array(z.object({ label: str(60), value: str(300) })).max(20).catch([]),
  urgent: z.string().nullable().catch(null),
  advice: z
    .object({
      headline: str(160),
      understood: z.array(str(300)).max(12).catch([]),
      sections: z
        .array(
          z.object({
            id: z.string().nullable().catch(null),
            law: str(160),
            section: str(80),
            plain: str(500),
            confidence: z.enum(["high", "verify"]).catch("verify"),
          }),
        )
        .max(10)
        .catch([]),
      dos: z.array(str(400)).max(10).catch([]),
      donts: z.array(str(400)).max(10).catch([]),
      steps: z.array(str(300)).max(8).catch([]),
      who: str(300).catch(""),
    })
    .nullable()
    .catch(null),
  review: z.boolean().catch(false),
});
export type HelpReply = z.infer<typeof helpReplySchema>;
export type HelpAdvice = NonNullable<HelpReply["advice"]>;

/** Sandhi asks at least this many questions before it advises, unless the client has told it everything on a call. */
export const MIN_ANSWERS = 3;

const FALLBACK_QUESTION = "Could you tell me a little more about what happened?";

/**
 * The safety layer for Quick legal help. Whatever the AI sends:
 *  - advice is held back until the client has answered enough questions (or told it all on a call),
 *  - every law id is checked against the library, and anything not in it is marked "verify",
 *  - a reply without advice carries exactly one question,
 *  - advice built on a "verify" law, or on thin information, always asks for a human lawyer to check.
 */
export function sanitizeHelp(r: HelpReply, ctx: { clientTurns: number; fromCall: boolean }): HelpReply {
  const enough = ctx.fromCall || ctx.clientTurns - 1 >= MIN_ANSWERS;

  if (!r.advice || !enough) {
    let reply = keepOneQuestion(r.reply);
    if (!reply.includes("?")) reply = `${reply} ${FALLBACK_QUESTION}`.trim();
    return { ...r, reply: keepOneQuestion(reply), stage: "asking", advice: null, review: false };
  }

  const sections = r.advice.sections.map((s) => {
    const known = s.id !== null && LAW_BY_ID.has(s.id);
    const entry = known ? LAW_BY_ID.get(s.id as string) : null;
    return {
      ...s,
      id: known ? s.id : null,
      confidence: entry && !entry.verify && s.confidence === "high" ? ("high" as const) : ("verify" as const),
    };
  });
  const advice = { ...r.advice, sections };
  const review = sections.length === 0 || sections.some((s) => s.confidence === "verify") || ctx.clientTurns < 6;
  return { ...r, stage: "advice", advice, review };
}
