/**
 * Keeps the live transcript of a voice call.
 *
 * The voice service sends each speaker's current sentence as a growing snapshot ("I want" then "I want to rent").
 * Each snapshot replaces the previous one for the same speaker; a final one settles the sentence.
 */

export type Speaker = "user" | "agent";

export interface CallTurn {
  id: number;
  role: Speaker;
  text: string;
  final: boolean;
}

export interface TranscriptEvent {
  role: Speaker;
  text: string;
  final: boolean;
}

export function applyTranscript(turns: CallTurn[], ev: TranscriptEvent): CallTurn[] {
  const text = ev.text.replace(/\s+/g, " ").trim();
  if (!text) return turns;
  const last = turns[turns.length - 1];
  // The same speaker still mid-sentence: the new snapshot replaces the old one.
  if (last && last.role === ev.role && !last.final) {
    return [...turns.slice(0, -1), { ...last, text, final: ev.final }];
  }
  // A different speaker started while this one's sentence was never marked final: settle it first.
  const settled = turns.map((t, i) => (i === turns.length - 1 && t.role !== ev.role ? { ...t, final: true } : t));
  const id = (turns[turns.length - 1]?.id ?? 0) + 1;
  return [...settled, { id, role: ev.role, text, final: ev.final }];
}

export const MAX_TRANSCRIPT_CHARS = 20000;

/** How many things the client said. A call with none has nothing for Sandhi to write up. */
export function clientLineCount(turns: CallTurn[]): number {
  return turns.filter((t) => t.role === "user").length;
}

/** The call as plain text for Sandhi's own checks. The newest part is kept if the call was very long. */
export function transcriptText(turns: CallTurn[]): string {
  const lines = turns.map((t) => `${t.role === "user" ? "Client" : "Voice agent"}: ${t.text}`);
  let out = lines.join("\n");
  if (out.length > MAX_TRANSCRIPT_CHARS) {
    out = out.slice(out.length - MAX_TRANSCRIPT_CHARS);
    out = out.slice(out.indexOf("\n") + 1); // start on a whole line
  }
  return out;
}

/** Only what the client said, for the demo-mode reader. */
export function clientWords(transcript: string): string {
  return transcript
    .split("\n")
    .filter((l) => l.startsWith("Client: "))
    .map((l) => l.slice(8))
    .join(" ");
}
