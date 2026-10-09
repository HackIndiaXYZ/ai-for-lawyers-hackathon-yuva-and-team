/**
 * Demo-mode loophole checker. It reads the text with simple rules, NOT real AI, so the whole
 * Check a contract screen can be tested and shown before an API key is added.
 */

import { guessType } from "../law";

type Sev = "high" | "medium" | "low";
type St = "not_legal" | "unenforceable" | "risky" | "lawful";

interface Rule {
  test: RegExp;
  severity: Sev;
  title: string;
  issue: string;
  risk: string;
  status: St;
  consequence: string;
  sources: string[];
  fix: string;
}

const RULES: Rule[] = [
  {
    test: /non-?\s?refundable|adjusted by the landlord|forfeit/i,
    severity: "high",
    title: "Deposit can be kept or adjusted at will",
    issue: "The deposit is called non-refundable, and the other side alone decides how to adjust it.",
    risk: "The whole deposit could be kept for any reason, with no proof of loss.",
    status: "unenforceable",
    consequence:
      "A court awards only reasonable compensation for proven loss, so a harsh forfeiture can be cut down. A non-refundable deposit is also a sign of an unfair term.",
    sources: ["ICA-74", "MTA-2021", "ICA-29"],
    fix: "The security deposit is refundable. It will be returned within [number] days of vacating, after deducting only proven unpaid rent or damage beyond normal wear and tear, with receipts.",
  },
  {
    test: /revise the (rent|fee|price)|(rent|fee|price|salary)[^.]{0,60}(revise|increase|change)[^.]{0,40}at any time/i,
    severity: "high",
    title: "Rent or price can change at any time",
    issue: "One side can change the amount whenever it wants, without notice or agreement.",
    risk: "The amount you agreed to could be raised overnight.",
    status: "unenforceable",
    consequence: "A term that is left to one side's discretion is too vague to enforce and can be struck down as unfair.",
    sources: ["ICA-29", "CON-14", "MTA-2021"],
    fix: "The rent may be revised only by written agreement of both parties, and by not more than [percentage] once in every 12 months.",
  },
  {
    test: /until the (landlord|owner|employer|client) decides|continues until|sole discretion/i,
    severity: "medium",
    title: "No fixed end date or open-ended discretion",
    issue: "The term depends on one side's decision rather than a fixed period.",
    risk: "You cannot plan, and the other side can end or extend things on a whim.",
    status: "risky",
    consequence: "Vague terms may be unenforceable, and a lease over one year must also be registered.",
    sources: ["ICA-29", "TPA-107", "REG-17"],
    fix: "The term is [number] months from [start date]. It may be renewed only by written agreement of both parties.",
  },
  {
    test: /vacate immediately|immediately at any time|evict[^.]{0,40}(immediately|any ?time)|throw (them )?out/i,
    severity: "high",
    title: "Removal without notice",
    issue: "One side can ask the other to leave immediately, at any time.",
    risk: "You could lose your home or your work with no warning.",
    status: "not_legal",
    consequence:
      "A tenant cannot lawfully be removed without the agreed notice and the legal process; a defective notice is invalid and forced removal can be challenged.",
    sources: ["TPA-106", "TRC-10", "CON-300A"],
    fix: "Either party may end this agreement by giving [number] days' written notice. The Landlord may seek possession only through the process allowed by law.",
  },
  {
    test: /\b\d+\s*months?'?\s*(rent|notice)|pay\s+\d+\s*months/i,
    severity: "medium",
    title: "Heavy early-exit penalty",
    issue: "A large fixed sum is payable if you leave early, however small the other side's loss.",
    risk: "You could owe months of payment even if the place is re-let quickly.",
    status: "unenforceable",
    consequence: "Courts award only reasonable compensation, not more than the named sum, whatever the clause is called.",
    sources: ["ICA-74", "ICA-73"],
    fix: "If the Tenant leaves before the lock-in ends, compensation is limited to the Landlord's reasonable, proven loss, up to [number] month's rent.",
  },
  {
    test: /old or new|all repairs|borne by the tenant/i,
    severity: "medium",
    title: "You pay for all repairs, even old damage",
    issue: "Every repair is put on one side, including damage that was already there.",
    risk: "You could be billed for wear and tear or defects you did not cause.",
    status: "risky",
    consequence: "The owner has duties too, and ordinary wear and tear is not the tenant's liability.",
    sources: ["TPA-108", "ICA-23"],
    fix: "The Tenant pays for damage caused by the Tenant. The Landlord bears structural repairs and ordinary wear and tear.",
  },
  {
    test: /courts? in (mumbai|delhi|bangalore|bengaluru|chennai|kolkata)|decision of the landlord is final|decision[^.]{0,30}is final|no court/i,
    severity: "high",
    title: "One-sided decider and distant court",
    issue: "Disputes go only to a far-away court, and one side's decision is called final.",
    risk: "You cannot challenge a decision, and a case may be costly or impossible to bring.",
    status: "unenforceable",
    consequence:
      "A clause making one party's decision final, or barring the courts, is void. A court with no real connection to the matter may also lack jurisdiction.",
    sources: ["ICA-28", "ARB-12", "CPC-16"],
    fix: "Disputes will be referred to a sole arbitrator appointed by mutual consent, seated in Hyderabad, under the Arbitration and Conciliation Act 1996.",
  },
  {
    test: /enter[^.]{0,40}at any time|inspect[^.]{0,30}at any time|access at any time/i,
    severity: "medium",
    title: "Entry at any time",
    issue: "One side can enter your home or premises whenever it likes.",
    risk: "Your privacy and quiet use of the place are not protected.",
    status: "risky",
    consequence: "Unlimited entry can be challenged as against privacy and public policy, and breaches the owner's duty of quiet possession.",
    sources: ["CON-21", "TPA-108"],
    fix: "The Landlord may enter on [number] hours' prior notice at a reasonable time, or at once in a genuine emergency.",
  },
  {
    test: /non-?compete|not (to )?(work|compete)[^.]{0,30}(competitor|after)/i,
    severity: "high",
    title: "Non-compete after the contract ends",
    issue: "You are barred from similar work after the job or contract is over.",
    risk: "It could block your livelihood if enforced.",
    status: "not_legal",
    consequence: "A restraint that applies after the contract ends is void; only confidentiality and in-term limits can be enforced.",
    sources: ["ICA-27", "CON-19"],
    fix: "During the term the party shall not work for a direct competitor. After the term, only the confidentiality obligations continue.",
  },
  {
    test: /security cheque|blank cheque|post-?dated cheque/i,
    severity: "medium",
    title: "Security or blank cheque",
    issue: "A signed cheque is held as security.",
    risk: "If it is presented and bounces, the signer can face prosecution.",
    status: "risky",
    consequence: "A bounced cheque given for a legal debt can lead to prosecution, a fine up to twice the amount, or jail.",
    sources: ["NIA-138"],
    fix: "No cheque shall be held as security. Any payment shall be made by bank transfer against a written receipt.",
  },
  {
    test: /unlimited liability|indemnif|hold harmless/i,
    severity: "medium",
    title: "Open-ended liability",
    issue: "One side promises to cover losses with no cap.",
    risk: "A small mistake could create a very large bill.",
    status: "risky",
    consequence: "Only real, provable loss can be recovered, but uncapped wording invites disputes and costly claims.",
    sources: ["ICA-124", "ICA-73"],
    fix: "Each party's total liability under this agreement is limited to the amounts paid or payable in the preceding [number] months.",
  },
  {
    test: /_{3,}|\[\s*\]|\bTBD\b/,
    severity: "low",
    title: "Blanks left in the document",
    issue: "Dates, amounts or names are left empty.",
    risk: "Someone could fill them in later without your agreement.",
    status: "risky",
    consequence: "Blank or uncertain terms may make that term, or the whole deal, unenforceable.",
    sources: ["ICA-29", "BNS-336"],
    fix: "Fill every blank before signing, and initial each page.",
  },
];

const MISSING: { test: RegExp; clause: string; why: string }[] = [
  { test: /arbitrat|dispute resolution/i, clause: "Fair dispute resolution", why: "Without a clear route, small disagreements become expensive court cases." },
  { test: /notice period|days'? (written )?notice|written notice/i, clause: "A written notice period", why: "Both sides need time to prepare before the agreement ends." },
  { test: /stamp/i, clause: "Stamp duty", why: "An unstamped agreement cannot be relied on in court until duty and penalty are paid." },
  { test: /witness/i, clause: "Witnesses", why: "Two independent witnesses make the signatures much easier to prove." },
  { test: /entire agreement|whole agreement/i, clause: "Entire agreement clause", why: "Written terms prevail over oral promises, so everything agreed must be written down." },
  { test: /sever/i, clause: "Severability", why: "If one clause is struck down, the rest of the agreement should still stand." },
];

function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<!\b(?:Rs|Mr|Mrs|Ms|Dr|No))(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function quoteFor(text: string, re: RegExp): string {
  const hit = sentences(text).find((s) => re.test(s)) ?? "";
  const words = hit.split(/\s+/);
  return (words.length > 38 ? words.slice(0, 38).join(" ") + "…" : hit).replace(/"/g, "'");
}

function keyTerms(text: string): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const labels: [RegExp, string][] = [
    [/deposit/i, "Deposit"],
    [/rent/i, "Rent"],
    [/fee|payment|pay\b/i, "Payment"],
    [/salary|ctc/i, "Salary"],
    [/price/i, "Price"],
    [/penalty|penal/i, "Penalty"],
  ];
  for (const s of sentences(text)) {
    const m = s.match(/(?:rs\.?|₹|inr)\s?\d(?:[\d,]*\d)?(?:\.\d+)?/i);
    if (!m) continue;
    const label = labels.find(([re]) => re.test(s))?.[1] ?? "Amount";
    if (!out.some((o) => o.label === label && o.value === m[0])) out.push({ label, value: m[0] });
    if (out.length >= 6) break;
  }
  const date = text.match(/\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
  if (date) out.push({ label: "Start date", value: date[0] });
  return out;
}

function parties(text: string): string[] {
  const out: string[] = [];
  const re = /((?:Mr|Ms|Mrs|Dr)\.?\s[A-Z][\w.]*(?:\s[A-Z][\w.]*)?|[A-Z][\w&. ]{2,40}?)\s*\((Landlord|Tenant|Client|Freelancer|Employer|Employee|Seller|Buyer|Disclosing Party|Receiving Party)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(`${m[1].trim()} (${m[2]})`);
  for (const role of ["Tenant", "Landlord", "Client", "Freelancer", "Employer", "Employee", "Seller", "Buyer"]) {
    if (new RegExp(`\\bthe ${role}\\b`, "i").test(text) && !out.some((o) => o.includes(`(${role})`))) {
      out.push(`The ${role}`);
    }
  }
  return out.slice(0, 5);
}

export function mockReviewLines(text: string, role: string | null): string[] {
  const type = guessType(text) ?? "Contract";
  const hits = RULES.filter((r) => r.test.test(text));
  const penalty = hits.reduce((n, h) => n + (h.severity === "high" ? 12 : h.severity === "medium" ? 6 : 2), 0);
  const score = Math.max(5, 100 - penalty);
  const worst = hits.some((h) => h.status === "not_legal" || h.status === "unenforceable")
    ? "contains unenforceable or illegal terms"
    : hits.length > 0
      ? "mostly lawful"
      : "lawful";
  const who = role ? ` for ${role.replace(/^the\s+/i, "")}` : "";

  const lines: unknown[] = [];
  lines.push({
    kind: "brief",
    type,
    summary: `This looks like a ${type.toLowerCase()}. In demo mode Sandhi reads it with simple word-matching rules, not real AI, so the real AI will give a fuller brief. It found ${hits.length} clause${hits.length === 1 ? "" : "s"} worth a closer look${who}.`,
    parties: parties(text),
    key_terms: keyTerms(text),
    obligations: [],
    unclear: /_{3,}/.test(text) ? ["Some dates, amounts or names are left blank."] : [],
    legal_notes: hits.slice(0, 4).map((h) => ({
      point: h.title,
      status: h.status,
      consequence: h.consequence,
      sources: h.sources,
    })),
  });
  lines.push({
    kind: "meta",
    type,
    safety_score: score,
    headline:
      hits.length === 0
        ? "Demo mode found nothing risky with its simple rules, but this is not a real legal review."
        : `Demo mode found ${hits.length} problem${hits.length === 1 ? "" : "s"}${who}; the worst ones are listed first.`,
    legal_verdict: worst,
  });
  for (const h of hits) {
    lines.push({
      kind: "finding",
      severity: h.severity,
      title: h.title,
      clause: quoteFor(text, h.test),
      issue: h.issue,
      risk: h.risk,
      status: h.status,
      consequence: h.consequence,
      sources: h.sources,
      law: "",
      fix: h.fix,
    });
  }
  for (const m of MISSING) {
    if (!m.test.test(text)) lines.push({ kind: "missing", clause: m.clause, why: m.why });
  }
  return lines.map((l) => JSON.stringify(l));
}

export async function* mockReviewStream(text: string, role: string | null): AsyncGenerator<string> {
  for (const line of mockReviewLines(text, role)) {
    await new Promise((r) => setTimeout(r, 350));
    yield line + "\n";
  }
}
