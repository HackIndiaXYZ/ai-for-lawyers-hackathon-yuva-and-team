import { canonical, normaliseText, parseContract, sha256Hex } from "./contract";

/** Marks where the seal block starts in an exported text file. Everything after it is ignored when checking. */
export const SEAL_MARKER = "--- SANDHI SEAL ---";

export interface SealRecord {
  id: string;
  title: string;
  /** Full 64-character SHA-256 fingerprint of `text`. */
  hash: string;
  /** From the device clock. It proves the words, not the time. */
  sealedAt: string;
  /** The exact fingerprinted text. */
  text: string;
  /** The legal-check verdict at the moment of sealing, or null if there was none. */
  verdict: string | null;
}

/* ---------------- blanks ---------------- */

const BLANK_RE = /\[\[(?:to be filled:\s*)?(.+?)\]\]/gi;

/** The distinct blanks still open in a contract, in reading order. */
export function listBlanks(text: string): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(BLANK_RE)) {
    const label = m[1].trim();
    if (!seen.includes(label)) seen.push(label);
  }
  return seen;
}

/** Removes anything that could break the contract's line format from a value typed into a blank. */
export function cleanValue(v: string): string {
  return v
    .replace(/[\r\n]+/g, " ")
    .replace(/\[\[|\]\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*(?:##|>|-|TITLE:|SIGN:)\s*/i, "")
    .replace(/={3,}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Fills the blanks the user answered. Blanks left empty stay as they are. */
export function fillBlanks(text: string, values: Record<string, string>): string {
  return text.replace(BLANK_RE, (whole, label: string) => {
    const v = cleanValue(values[label.trim()] ?? "");
    return v ? v : whole;
  });
}

/* ---------------- fingerprint ---------------- */

/** Groups a fingerprint in fours for reading aloud: "A1B2 C3D4 …". */
export function groupHex(hex: string, groupSize = 4): string {
  return hex.toUpperCase().replace(new RegExp(`(.{${groupSize}})(?=.)`, "g"), "$1 ");
}

/** The short code: the first 16 characters in four groups of four. */
export function shortCode(hash: string): string {
  return groupHex(hash.slice(0, 16)).replace(/ /g, "-");
}

/** Reads a fingerprint typed or pasted by a person. Returns lower-case hex, or null if it isn't one. */
export function parseFingerprint(input: string): { hex: string; kind: "full" | "short" } | null {
  const hex = input.replace(/^\s*(?:sha-?256\s*:?)?/i, "").replace(/[\s\-:]/g, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(hex)) return null;
  if (hex.length === 64) return { hex, kind: "full" };
  if (hex.length === 16) return { hex, kind: "short" };
  return null;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Fingerprints the contract. The caller has already checked that there are no open blanks. */
export async function createSeal(draftText: string, verdict: string | null, now = new Date()): Promise<SealRecord> {
  const model = parseContract(draftText);
  const text = canonical(model);
  const hash = await sha256Hex(text);
  return {
    id: newId(),
    title: model.title || "Contract",
    hash,
    sealedAt: now.toISOString(),
    text,
    verdict,
  };
}

/* ---------------- exports ---------------- */

export function sealBlock(seal: SealRecord, origin: string): string {
  return [
    SEAL_MARKER,
    `Fingerprint (SHA-256): ${seal.hash}`,
    `Short code: ${shortCode(seal.hash)}`,
    `Sealed on: ${seal.sealedAt} (device clock)`,
    `To check a copy: open ${origin || "Sandhi"} and choose "Verify a copy".`,
  ].join("\n");
}

/** The text file: the exact sealed words, then the seal block. */
export function exportText(seal: SealRecord, origin: string): string {
  return `${seal.text}\n\n${sealBlock(seal, origin)}\n`;
}

export interface ObligationRow {
  party: string;
  action: string;
  amount: string | null;
  due: string;
  trigger: string | null;
  penalty: string | null;
}

export type ObligationsOutcome =
  | { status: "ok"; mode: "demo" | "live"; items: ObligationRow[] }
  | { status: "unavailable"; reason: string };

/** The machine-readable file for a smart-contract tool. Every field is spelled out so another program can read it. */
export function exportJson(seal: SealRecord, obligations: ObligationsOutcome): string {
  const ok = obligations.status === "ok";
  const body = {
    schema: "sandhi.contract.v1",
    title: seal.title,
    text: seal.text,
    seal: {
      algorithm: "SHA-256",
      sha256: seal.hash,
      shortCode: shortCode(seal.hash),
      sealedAt: seal.sealedAt,
      clock: "device",
    },
    legalCheckVerdict: seal.verdict,
    obligations: ok ? obligations.items : [],
    obligationsStatus: ok ? "ok" : "unavailable",
    obligationsNote: ok
      ? obligations.mode === "demo"
        ? "Demo mode: these are sample obligations, not read from the contract. Do not rely on them."
        : "Extracted by AI. A person should check them against the contract text."
      : obligations.reason,
    needsHumanReview: true,
    disclaimer:
      "Sandhi is an assistant, not a lawyer. Have an advocate review this before signing. The fingerprint proves the words have not changed; it is not a signature or a stamp.",
  };
  return JSON.stringify(body, null, 2) + "\n";
}

/* ---------------- verifying a copy ---------------- */

/**
 * Pulls the contract words out of whatever the person pasted or loaded: a text file exported by Sandhi
 * (the seal block is dropped), a JSON export (its "text" field is used), or the plain words.
 */
export function extractContractText(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed);
      if (j && typeof j.text === "string" && typeof j.schema === "string" && j.schema.startsWith("sandhi.contract")) {
        return normaliseText(j.text);
      }
    } catch {
      /* not JSON: treat it as plain text */
    }
  }
  const cut = input.indexOf(SEAL_MARKER);
  return normaliseText(cut >= 0 ? input.slice(0, cut) : input);
}

export type DiffLine = { kind: "same" | "removed" | "added"; text: string };

/** A line-by-line comparison (longest common subsequence). Capped so a huge paste cannot freeze the page. */
export function diffLines(sealed: string, copy: string): DiffLine[] | null {
  const a = sealed.split("\n");
  const b = copy.split("\n");
  if (a.length > 800 || b.length > 800) return null;
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "removed", text: a[i++] });
    } else {
      out.push({ kind: "added", text: b[j++] });
    }
  }
  while (i < n) out.push({ kind: "removed", text: a[i++] });
  while (j < m) out.push({ kind: "added", text: b[j++] });
  return out;
}

export type VerifyResult =
  | { state: "invalid"; message: string }
  | { state: "match"; strength: "full" | "short"; hash: string }
  | { state: "mismatch"; hash: string; diff: DiffLine[] | null };

/**
 * Checks a copy against a fingerprint. If the sealed words are on this device, a mismatch also says which lines differ.
 */
export async function verifyCopy(
  pasted: string,
  fingerprintInput: string,
  sealedText: string | null,
): Promise<VerifyResult> {
  const fp = parseFingerprint(fingerprintInput);
  if (!fp) {
    return {
      state: "invalid",
      message: "That fingerprint doesn't look right. It should be 64 letters and numbers (0 to 9, A to F), or the 16-character short code.",
    };
  }
  const text = extractContractText(pasted);
  if (text.length < 20) {
    return { state: "invalid", message: "Paste the contract words (or load the file) first." };
  }
  const hash = await sha256Hex(text);
  const same = fp.kind === "full" ? hash === fp.hex : hash.startsWith(fp.hex);
  if (same) return { state: "match", strength: fp.kind, hash };
  const diff = sealedText ? diffLines(sealedText, text) : null;
  return { state: "mismatch", hash, diff };
}

/* ---------------- sealed contracts kept on this device ---------------- */

const STORE_KEY = "sandhi.seals.v1";
const MAX_KEPT = 8;

export function loadSeals(): SealRecord[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (s): s is SealRecord =>
          s && typeof s.id === "string" && typeof s.hash === "string" && /^[0-9a-f]{64}$/.test(s.hash) && typeof s.text === "string" && typeof s.sealedAt === "string",
      )
      .map((s) => ({ ...s, title: String(s.title ?? "Contract"), verdict: s.verdict ?? null }));
  } catch {
    return [];
  }
}

function writeSeals(list: SealRecord[]): boolean {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Keeps the seal on this device. Returns false if the browser refused (private window, full storage). */
export function saveSeal(seal: SealRecord): boolean {
  const rest = loadSeals().filter((s) => s.id !== seal.id && s.hash !== seal.hash);
  return writeSeals([seal, ...rest].slice(0, MAX_KEPT));
}

export function removeSeal(id: string): void {
  writeSeals(loadSeals().filter((s) => s.id !== id));
}
