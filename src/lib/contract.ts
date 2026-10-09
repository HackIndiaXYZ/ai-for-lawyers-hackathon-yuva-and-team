import { validIds } from "./law";

/** One piece of styled text inside a paragraph. */
export type InlinePart = { kind: "text" | "bold" | "blank"; text: string };

export type Block =
  | { type: "heading"; text: string }
  | { type: "para"; text: string }
  | { type: "why"; text: string; sources: string[] };

export interface ContractModel {
  title: string;
  blocks: Block[];
  signs: string[];
  before: { text: string; sources: string[] }[];
}

const BLANK_RE = /\[\[(?:to be filled:\s*)?(.+?)\]\]/gi;
const BOLD_RE = /\*\*(.+?)\*\*/g;
const TRAILING_SOURCES_RE = /\(\s*(?:Source:\s*)?([A-Z]{2,5}-[A-Z0-9]+(?:\s*,\s*[A-Z]{2,5}-[A-Z0-9]+)*)\s*\)\s*$/;

/**
 * Splits a trailing "(Source: ICA-74, TPA-106)" or "(STAMP-35)" off a line.
 * Only IDs that exist in the law library are kept, so an invented ID is dropped.
 */
export function splitTrailingSources(text: string): { text: string; sources: string[] } {
  const m = text.match(TRAILING_SOURCES_RE);
  if (m && m.index !== undefined) {
    return { text: text.slice(0, m.index).trim(), sources: validIds(m[1].split(/\s*,\s*/)) };
  }
  // A "(Source: ICA-" still being written: hide it until it is complete.
  return { text: text.replace(/\s*\(\s*Source:[^)]*$/i, "").trim(), sources: [] };
}

/**
 * Turns the AI's plain-text contract into a structure. It is safe to call on half-written text,
 * so the page can re-parse on every streamed piece.
 */
export function parseContract(raw: string): ContractModel {
  const model: ContractModel = { title: "", blocks: [], signs: [], before: [] };
  let inBefore = false;

  for (const rawLine of raw.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "===BEFORE YOU SIGN===") {
      inBefore = true;
      continue;
    }
    if (line.startsWith("===")) continue; // the marker is still being written

    if (inBefore) {
      if (line.startsWith("- ")) {
        model.before.push({ ...splitTrailingSources(line.slice(2).trim()) });
      } else if (model.before.length > 0) {
        const last = model.before[model.before.length - 1];
        const joined = splitTrailingSources(`${last.text} ${line}`);
        model.before[model.before.length - 1] = {
          text: joined.text,
          sources: [...new Set([...last.sources, ...joined.sources])],
        };
      }
      continue;
    }

    if (/^TITLE:/i.test(line)) {
      model.title = line.replace(/^TITLE:\s*/i, "").trim();
    } else if (line.startsWith("## ")) {
      model.blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith(">")) {
      const body = line.replace(/^>\s*/, "").replace(/^why:\s*/i, "");
      const { text, sources } = splitTrailingSources(body);
      model.blocks.push({ type: "why", text, sources });
    } else if (/^SIGN:/i.test(line)) {
      model.signs.push(line.replace(/^SIGN:\s*/i, "").trim());
    } else {
      model.blocks.push({ type: "para", text: line });
    }
  }
  return model;
}

/** Splits a paragraph into plain, bold and blank pieces so the page can draw them safely. */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(?:to be filled:\s*)?(.+?)\]\]/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ kind: "bold", text: m[1] });
    else parts.push({ kind: "blank", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

function plain(text: string): string {
  return text.replace(BOLD_RE, "$1").replace(BLANK_RE, "[ ______ $1 ]");
}

/**
 * The exact text that gets fingerprinted: title, then every block except the "why" notes,
 * one per line; signature entries start with "Signature: "; bold removed; blanks flattened.
 */
export function canonical(model: ContractModel): string {
  const lines: string[] = [model.title];
  for (const b of model.blocks) {
    if (b.type !== "why") lines.push(plain(b.text));
  }
  for (const s of model.signs) lines.push("Signature: " + plain(s));
  return lines.map((l) => l.trim()).filter(Boolean).join("\n");
}

/** Applies the same clean-up to pasted text, so a copy can be checked against a fingerprint. */
export function normaliseText(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("A secure (https) page is needed to create the fingerprint.");
  }
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
