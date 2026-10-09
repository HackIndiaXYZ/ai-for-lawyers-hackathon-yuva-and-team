import { z } from "zod";
import { CONTRACT_TYPES, LAW_BY_ID, validIds } from "../law";

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

export const STAGES = [
  "background",
  "parties",
  "terms",
  "what-ifs",
  "special conditions",
  "confirm",
] as const;
export type Stage = (typeof STAGES)[number];

export const LANG_CODES = ["en", "hi", "te"] as const;
export type LangCode = (typeof LANG_CODES)[number];

export const LANG_NAMES: Record<LangCode, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
};

/* ------------------------------------------------------------------ */
/* What the browser sends to the server                                */
/* ------------------------------------------------------------------ */

export const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});
export type Turn = z.infer<typeof turnSchema>;

export const chatStateSchema = z.object({
  lang: z.enum(LANG_CODES).default("en"),
  contractType: z.string().max(80).nullable().default(null),
  userRole: z.string().max(80).nullable().default(null),
  stage: z.enum(STAGES).nullable().default(null),
  ready: z.boolean().default(false),
  pushback: z.number().int().min(0).max(20).default(0),
  drafted: z.boolean().default(false),
  details: z.record(z.string().max(80), z.string().max(500)).default({}),
  docContext: z.string().max(40000).default(""),
});
export type ChatState = z.infer<typeof chatStateSchema>;

export const chatRequestSchema = z.object({
  turns: z.array(turnSchema).min(1).max(40),
  state: chatStateSchema,
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const draftRequestSchema = z.object({
  contractType: z.string().max(80),
  userRole: z.string().max(80).nullable().default(null),
  details: z.record(z.string().max(80), z.string().max(500)).default({}),
  said: z.string().max(8000).default(""),
  extra: z.string().max(40000).default(""),
});
export type DraftRequest = z.infer<typeof draftRequestSchema>;

export const textRequestSchema = z.object({
  contractType: z.string().max(80).nullable().default(null),
  text: z.string().min(20).max(60000),
});
export type TextRequest = z.infer<typeof textRequestSchema>;

/* ------------------------------------------------------------------ */
/* What the AI sends back (lenient: bad optional parts fall back)      */
/* ------------------------------------------------------------------ */

const flagStatus = z.enum(["not_legal", "unenforceable", "risky"]);

export const conversationReplySchema = z.object({
  reply: z.string().min(1).max(2000),
  intent: z.enum(["advice", "draft", "review", "chat"]).catch("chat"),
  contract_type: z.string().nullable().catch(null),
  user_role: z.string().nullable().catch(null),
  stage: z.enum(STAGES).nullable().catch(null),
  ready: z.boolean().catch(false),
  pushback: z.boolean().catch(false),
  fields: z
    .array(z.object({ key: z.string(), label: z.string(), value: z.string() }))
    .catch([]),
  missing: z.array(z.string()).catch([]),
  action: z.enum(["none", "draft_now"]).catch("none"),
  legal_flags: z
    .array(
      z.object({
        issue: z.string(),
        status: flagStatus.catch("risky"),
        consequence: z.string(),
        sources: z.array(z.string()).catch([]),
      }),
    )
    .catch([]),
  advice: z
    .object({
      headline: z.string(),
      sections: z
        .array(
          z.object({
            id: z.string().nullable().catch(null),
            law: z.string(),
            section: z.string(),
            plain: z.string(),
            confidence: z.enum(["high", "verify"]).catch("verify"),
          }),
        )
        .catch([]),
      consequences: z.array(z.string()).catch([]),
      steps: z.array(z.string()).catch([]),
    })
    .nullable()
    .catch(null),
});
export type ConversationReply = z.infer<typeof conversationReplySchema>;

const checkStatus = z.enum(["lawful", "risky", "unenforceable", "not_legal"]);

export const legalCheckSchema = z.object({
  verdict: z
    .enum(["ready to sign", "fix before signing", "not legal as drafted"])
    .catch("fix before signing"),
  headline: z.string().catch(""),
  items: z
    .array(
      z.object({
        clause: z.string(),
        status: checkStatus.catch("risky"),
        consequence: z.string().catch(""),
        sources: z.array(z.string()).catch([]),
      }),
    )
    .max(14)
    .catch([]),
  requirements: z
    .array(z.object({ what: z.string(), sources: z.array(z.string()).catch([]) }))
    .max(10)
    .catch([]),
});
export type LegalCheck = z.infer<typeof legalCheckSchema>;

export const obligationsSchema = z
  .array(
    z.object({
      party: z.string(),
      action: z.string(),
      amount: z.string().nullable().catch(null),
      due: z.string().catch(""),
      trigger: z.string().nullable().catch(null),
      penalty: z.string().nullable().catch(null),
    }),
  )
  .max(10);
export type Obligation = z.infer<typeof obligationsSchema>[number];

/* ------------------------------------------------------------------ */
/* Safety layer: never trust the AI's citations or its drafting signal */
/* ------------------------------------------------------------------ */

const KNOWN_TYPES = new Set(CONTRACT_TYPES.map((t) => t.name));

export function sanitizeReply(r: ConversationReply, state: ChatState): ConversationReply {
  // The page-level guard: ignore "draft now" unless the interview is complete
  // or the client has already been pushed back once.
  const draftAllowed = state.ready || r.ready || state.pushback >= 1;
  return {
    ...r,
    contract_type: r.contract_type && KNOWN_TYPES.has(r.contract_type) ? r.contract_type : null,
    action: r.action === "draft_now" && !draftAllowed ? "none" : r.action,
    fields: r.fields
      .map((f) => ({
        key: f.key.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "").slice(0, 60),
        label: f.label.slice(0, 80),
        value: f.value.slice(0, 500),
      }))
      .filter((f) => f.key && f.value),
    legal_flags: r.legal_flags.map((f) => ({ ...f, sources: validIds(f.sources) })),
    advice: r.advice
      ? {
          ...r.advice,
          sections: r.advice.sections.map((s) => {
            const known = s.id !== null && LAW_BY_ID.has(s.id);
            return {
              ...s,
              id: known ? s.id : null,
              // A section that is not in our library is always marked "verify".
              confidence: known ? s.confidence : ("verify" as const),
            };
          }),
        }
      : null,
  };
}

export function sanitizeLegalCheck(c: LegalCheck): LegalCheck {
  return {
    ...c,
    items: c.items.map((i) => ({ ...i, sources: validIds(i.sources) })),
    requirements: c.requirements.map((q) => ({ ...q, sources: validIds(q.sources) })),
  };
}
