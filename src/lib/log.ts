/**
 * One JSON line per event, for Vercel's log viewer.
 *
 * Rule: never log what a person said, pasted or photographed. Only codes, route names and timings.
 */
export function logEvent(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  try {
    console.log(JSON.stringify({ t: new Date().toISOString(), app: "sandhi", event, ...fields }));
  } catch {
    /* logging must never break a request */
  }
}

/** A short, one-way fingerprint of a visitor's address, so repeat abuse can be seen without storing the address. */
export async function shortHash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
