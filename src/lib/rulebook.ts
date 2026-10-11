import { LAW_BY_ID, codeForType, type ContractCode } from "./law";
import { COMMON_RULES, RULEBOOK, type Rule } from "../data/rulebook";

export type CheckStatus = "included" | "missing" | "problem" | "confirm";

export interface CheckItem {
  id: string;
  title: string;
  need: string;
  law: string[];
  status: CheckStatus;
  note?: string;
}

export interface Compliance {
  items: CheckItem[];
  included: number;
  missing: number;
  problem: number;
  confirm: number;
  /** True when the draft is missing something or breaks a rule, so a human must look at it. */
  needsReview: boolean;
}

/** The rules for a contract type: those every contract needs, then those for its kind. */
export function rulesFor(contractType: string | null | undefined): Rule[] {
  const code = codeForType(contractType);
  return [...COMMON_RULES, ...(code ? RULEBOOK[code as ContractCode] : [])].map((r) => ({
    ...r,
    law: r.law.filter((id) => LAW_BY_ID.has(id)),
  }));
}

/**
 * The clauses of the contract, without the "why" lines (which discuss the law, not the agreement),
 * and without the BEFORE YOU SIGN notes. Lower-cased, ready for matching.
 */
export function clauseText(raw: string): string {
  const out: string[] = [];
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    const t = line.trim();
    if (t === "===BEFORE YOU SIGN===") break;
    if (!t || t.startsWith("> why:")) continue;
    out.push(t.replace(/\*\*/g, ""));
  }
  return out.join("\n").toLowerCase();
}

const MONTHS_RE = /(?:runs for|term of|period of|for a (?:period|term) of|valid for)\s*(\d+)\s*(month|year)s?/;

/** Length of the lease in months if the draft states it, otherwise null. */
export function leaseMonths(text: string): number | null {
  const m = text.match(MONTHS_RE);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "year" ? n * 12 : n;
}

/** Checks a draft against the rulebook. Safe to call on half-written text. */
export function checkDraft(contractType: string | null | undefined, raw: string): Compliance {
  const text = clauseText(raw);
  const items: CheckItem[] = [];

  for (const rule of rulesFor(contractType)) {
    const base = { id: rule.id, title: rule.title, need: rule.need, law: rule.law };
    if (rule.kind === "confirm") {
      let note: string | undefined;
      if (rule.id === "r-register") {
        const months = leaseMonths(text);
        if (months === null) note = "The term is not stated yet, so decide this first.";
        else if (months > 12) note = `This lease runs ${months} months, so it MUST be registered.`;
        else note = `This lease runs ${months} months, so registration is not compulsory, but it is still wise for long-term protection.`;
      }
      items.push({ ...base, status: "confirm", note });
      continue;
    }
    if (rule.onlyIf && !rule.onlyIf.some((re) => re.test(text))) continue;

    const hit = (rule.any ?? []).some((re) => re.test(text));
    if (rule.kind === "forbid") {
      items.push({ ...base, status: hit ? "problem" : "included" });
    } else {
      items.push({ ...base, status: hit ? "included" : "missing" });
    }
  }

  const count = (s: CheckStatus) => items.filter((i) => i.status === s).length;
  const missing = count("missing");
  const problem = count("problem");
  return {
    items,
    included: count("included"),
    missing,
    problem,
    confirm: count("confirm"),
    needsReview: missing > 0 || problem > 0,
  };
}

/** The rule list as text for the drafting prompt. */
export function rulebookPrompt(contractType: string | null | undefined): string {
  const rules = rulesFor(contractType);
  const must = rules.filter((r) => r.kind === "clause");
  const never = rules.filter((r) => r.kind === "forbid");
  const confirm = rules.filter((r) => r.kind === "confirm");
  const ids = (r: Rule) => (r.law.length ? ` (Source: ${r.law.join(", ")})` : "");
  return [
    "RULEBOOK (Indian-law checklist for this document):",
    "The draft MUST contain a clause or line for each of these:",
    ...must.map((r) => `- ${r.title}: ${r.need}${ids(r)}`),
    "The draft must NEVER contain any of these, because Indian law makes them void or unenforceable. If the client asked for one, leave it out and explain in BEFORE YOU SIGN:",
    ...never.map((r) => `- ${r.title}: ${r.need}${ids(r)}`),
    "Put each of these in BEFORE YOU SIGN as a short line, as things the person must do or check themselves. Never invent a figure, rate or date for them:",
    ...confirm.map((r) => `- ${r.title}: ${r.need}${ids(r)}`),
  ].join("\n");
}
