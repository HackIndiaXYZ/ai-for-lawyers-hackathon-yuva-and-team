import type { LangCode } from "@/lib/ai/schemas";

/** Browser language tags for each language the app offers. */
export const LANG_TAG: Record<LangCode, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

export const LANG_NAME: Record<LangCode, string> = { en: "English", hi: "Hindi", te: "Telugu" };

/* ---------------- minimal typings (the browser API is not in TypeScript's library) ---------------- */

interface RecResult {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}
interface RecEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecCtor = new () => Recognition;

function recognitionCtor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceSupport(): { listen: boolean; speak: boolean } {
  return {
    listen: recognitionCtor() !== null,
    speak: typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined",
  };
}

/* ---------------- listening ---------------- */

export function explainMicError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "The microphone is blocked. Click the lock icon in the address bar, allow the microphone, then tap the mic again.";
    case "no-speech":
      return "I didn't hear anything. Tap the mic and try again, or type your message.";
    case "audio-capture":
      return "I can't find a microphone on this device. You can type your message instead.";
    case "network":
      return "Voice typing needs an internet connection. Please check it, or type your message.";
    case "language-not-supported":
      return "This browser can't listen in that language. Please switch the language or type your message.";
    default:
      return "Voice input stopped unexpectedly. Please tap the mic again, or type your message.";
  }
}

export interface Listener {
  stop(): void;
  abort(): void;
}

export interface ListenHandlers {
  onInterim(text: string): void;
  /** Called once, with the final words and how sure the browser was (0 to 1, or null if it did not say). */
  onFinal(text: string, confidence: number | null): void;
  onError(message: string): void;
  /** Always called last, whatever happened. */
  onEnd(): void;
}

const MAX_LISTEN_MS = 25_000;

/** Starts listening. Returns null if this browser cannot. */
export function startListening(lang: LangCode, h: ListenHandlers): Listener | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = LANG_TAG[lang];
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = "";
  let finalConf: number | null = null;
  let interim = "";
  let errored = false;
  let ended = false;
  let delivered = false;
  const timer = setTimeout(() => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  }, MAX_LISTEN_MS);

  rec.onresult = (e) => {
    let live = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) {
        finalText += (finalText ? " " : "") + r[0].transcript.trim();
        finalConf = typeof r[0].confidence === "number" && r[0].confidence > 0 ? r[0].confidence : finalConf;
      } else {
        live += r[0].transcript;
      }
    }
    interim = live.trim();
    h.onInterim((finalText + " " + interim).trim());
  };
  rec.onerror = (e) => {
    if (e.error === "aborted") return;
    errored = true;
    h.onError(explainMicError(e.error));
  };
  rec.onend = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    // Some browsers stop without marking the last words final: use what was heard.
    const text = (finalText || interim).trim();
    if (!errored && !delivered && text) {
      delivered = true;
      h.onFinal(text, finalText ? finalConf : null);
    }
    h.onEnd();
  };

  try {
    rec.start();
  } catch {
    clearTimeout(timer);
    h.onError(explainMicError("other"));
    h.onEnd();
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
    abort: () => {
      delivered = true; // the person cancelled: do not send what was heard
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}

/* ---------------- speaking ---------------- */

/** Turns written text into something that sounds right when read aloud. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[\[(?:to be filled:\s*)?(.+?)\]\]/gi, "$1")
    .replace(/\(\s*(?:Source:\s*)?[A-Z]{2,5}-[A-Z0-9]+(?:\s*,\s*[A-Z]{2,5}-[A-Z0-9]+)*\s*\)/g, "")
    .replace(/\bRs\.?\s?(?=\d)/g, "rupees ")
    .replace(/₹\s?/g, "rupees ")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;!?])/g, "$1")
    .trim();
}

/** Browsers cut off long speech, so it is read a sentence or two at a time. */
export function splitForSpeech(text: string, maxLen = 180): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > maxLen && cur) {
      out.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.flatMap((p) => (p.length <= maxLen * 2 ? [p] : p.match(new RegExp(`.{1,${maxLen * 2}}(\\s|$)`, "g")) ?? [p]));
}

/** Picks the best installed voice for a language tag, or null if the device has none for it. */
export function pickVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | null {
  const base = tag.split("-")[0].toLowerCase();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;
  for (const v of voices) {
    const l = v.lang.replace("_", "-").toLowerCase();
    let score = 0;
    if (l === tag.toLowerCase()) score = 10;
    else if (l.split("-")[0] === base) score = 6;
    if (!score) continue;
    if (/google|neural|natural|enhanced|premium|online/i.test(v.name)) score += 2;
    if (!v.localService) score += 1;
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const now = synth.getVoices();
    if (now.length > 0) return resolve(now);
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1200); // some browsers never announce them
  });
}

export interface SpeakHandle {
  cancel(): void;
}

/**
 * Reads text aloud. `onStart` fires when the first words begin, `onDone` when everything has been said
 * (or was cancelled). `onNoVoice` fires when the device has no voice for this language.
 */
export function speak(
  text: string,
  lang: LangCode,
  cb: { onStart?: () => void; onDone?: () => void; onNoVoice?: () => void } = {},
): SpeakHandle {
  let cancelled = false;
  const handle: SpeakHandle = {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* nothing playing */
      }
      cb.onDone?.();
    },
  };

  const spoken = cleanForSpeech(text);
  if (!spoken || !voiceSupport().speak) {
    queueMicrotask(() => cb.onDone?.());
    return handle;
  }

  void (async () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const tag = LANG_TAG[lang];
    const voice = pickVoice(await loadVoices(), tag);
    if (cancelled) return;
    if (!voice) cb.onNoVoice?.();
    const parts = splitForSpeech(spoken);
    let started = false;
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = tag;
      if (voice) u.voice = voice;
      u.rate = 0.97;
      u.onstart = () => {
        if (!started && !cancelled) {
          started = true;
          cb.onStart?.();
        }
      };
      const last = i === parts.length - 1;
      u.onend = () => {
        if (last && !cancelled) {
          cancelled = true;
          cb.onDone?.();
        }
      };
      u.onerror = (e) => {
        // "canceled" and "interrupted" are what happens when we stop it on purpose.
        if (last && !cancelled) {
          cancelled = true;
          cb.onDone?.();
        }
        void e;
      };
      synth.speak(u);
    });
  })();

  return handle;
}
