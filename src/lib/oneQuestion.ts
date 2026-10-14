/**
 * Sandhi asks ONE question at a time. The AI is told so, and this is the safety net: whatever it sends, a spoken
 * reply keeps at most one question, and that question is not two questions joined by "and".
 */

const QUESTION_WORD = "(?:what|how|when|where|who|whom|which|why|whose|is|are|was|were|do|does|did|will|would|can|could|should|shall|have|has)";
// "What is the rent, and when is it due?" -> "What is the rent?"
const JOINED = new RegExp(`\\s*,?\\s+(?:and|also|plus|then)\\s+${QUESTION_WORD}\\b[^?]*\\?$`, "i");
// Hindi and Telugu questions often end with "?" too, so the sentence split covers the danda as well.
const SENTENCE_END = /(?<=[.!?।？])\s+/;

export function countQuestions(text: string): number {
  return (text.match(/[?？]/g) ?? []).length;
}

/** Keeps the lead-in and the first question, and drops everything after it. */
export function keepOneQuestion(reply: string): string {
  const text = reply.trim();
  if (countQuestions(text) === 0) return text;

  const sentences = text.split(SENTENCE_END);
  const out: string[] = [];
  for (const s of sentences) {
    if (/[?？]\s*$/.test(s) || /[?？]/.test(s)) {
      // A sentence that holds the question: cut it back to a single ask.
      let q = s.trim();
      const firstMark = q.search(/[?？]/);
      q = q.slice(0, firstMark + 1);
      q = q.replace(JOINED, "?");
      out.push(q);
      return out.join(" ").trim();
    }
    out.push(s);
  }
  return out.join(" ").trim();
}
