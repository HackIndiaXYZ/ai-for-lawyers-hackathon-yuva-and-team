import {
  ACTS,
  LAW_BY_ID,
  LAW_LIBRARY,
  type ContractCode,
  type LawEntry,
} from "../data/lawLibrary";

export { ACTS, LAW_BY_ID, LAW_LIBRARY };
export type { ContractCode, LawEntry };

/** The five contract types Sandhi supports. These exact strings are used everywhere. */
export const CONTRACT_TYPES: { name: string; code: ContractCode }[] = [
  { name: "Residential Rent Agreement", code: "R" },
  { name: "Freelance Services Agreement", code: "F" },
  { name: "Non-Disclosure Agreement", code: "N" },
  { name: "Employment Agreement", code: "E" },
  { name: "Sale of Movable Property", code: "S" },
];

/** The four provisions that matter for almost every contract. */
const CORE_IDS = new Set(["ICA-10", "ICA-23", "ICA-74", "CON-14"]);

export function codeForType(typeName: string | null | undefined): ContractCode | null {
  if (!typeName) return null;
  return CONTRACT_TYPES.find((t) => t.name === typeName)?.code ?? null;
}

/** Simple keyword guess of the contract type from free text. Returns the type name, or null. */
export function guessType(text: string): string | null {
  const t = text.toLowerCase();
  const rules: { code: ContractCode; words: RegExp[] }[] = [
    { code: "R", words: [/\btenan/, /\blandlord/, /\blease\b/, /\brent\b/, /\bdeposit\b/, /\bflat\b/] },
    { code: "N", words: [/\bnda\b/, /non-?disclosure/, /\bconfidential/] },
    { code: "E", words: [/\bemployee\b/, /\bemployer\b/, /\bsalary\b/, /\bprobation/, /\bgratuity/] },
    { code: "F", words: [/\bfreelanc/, /\bdeliverable/, /\bclient\b/, /\bcontractor\b/] },
    { code: "S", words: [/\bbuyer\b/, /\bseller\b/, /\bvehicle\b/, /\bbike\b/, /\bsold\b/, /\bsecond[- ]?hand/] },
  ];
  let best: { code: ContractCode; hits: number } | null = null;
  for (const r of rules) {
    const hits = r.words.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0);
    if (hits > 0 && (!best || hits > best.hits)) best = { code: r.code, hits };
  }
  if (!best) return null;
  return CONTRACT_TYPES.find((c) => c.code === best!.code)?.name ?? null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if the tag appears in the (lower-cased) text. Short tags must match whole words. */
function hasTag(text: string, tag: string): boolean {
  const body = escapeRegExp(tag.toLowerCase());
  const end = tag.length <= 3 ? "(?![a-z0-9])" : "";
  return new RegExp(`(?<![a-z0-9])${body}${end}`).test(text);
}

export function scoreEntry(entry: LawEntry, text: string, code: ContractCode | null): number {
  const lower = text.toLowerCase();
  let score = 0;
  if (CORE_IDS.has(entry.id)) score += 10;
  if (entry.applies === "*") score += 1;
  else if (code && entry.applies.includes(code)) score += 4;
  for (const tag of entry.tags) {
    if (hasTag(lower, tag)) score += 2;
  }
  return score;
}

/**
 * The most relevant provisions for a piece of text (conversation, uploaded document or draft).
 * Entries that score zero are left out.
 */
export function relevant(text: string, contractType: string | null, limit: number): LawEntry[] {
  const code = codeForType(contractType) ?? codeForType(guessType(text));
  return LAW_LIBRARY.map((entry, index) => ({
    entry,
    index,
    score: scoreEntry(entry, text, code),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((r) => r.entry);
}

export function fullReference(entry: LawEntry): string {
  return `${ACTS[entry.act].full}, ${entry.section}`;
}

/** Short label for a source chip, for example "Contract Act s.74". */
export function chipLabel(entry: LawEntry): string {
  const act = ACTS[entry.act].chip;
  const section = entry.section.replace(/\s+\(.*$/, "");
  if (section.startsWith("whole Act") || section.length > 26) return act;
  return `${act} ${section}`;
}

/** The library as plain text lines, ready to put into an AI prompt. */
export function libraryText(entries: LawEntry[]): string {
  return entries
    .map(
      (e) =>
        `${e.id} | ${fullReference(e)} | ${e.title}: ${e.summary} | ${e.consequence}` +
        (e.verify ? " | (needs verification)" : ""),
    )
    .join("\n");
}

/** Keeps only IDs that exist in the library. An invented ID is silently dropped. */
export function validIds(ids: readonly string[] | null | undefined): string[] {
  if (!ids) return [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (LAW_BY_ID.has(id)) seen.add(id);
  }
  return [...seen];
}
