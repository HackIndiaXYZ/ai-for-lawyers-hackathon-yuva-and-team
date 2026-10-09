import { describe, expect, it } from "vitest";
import { cleanForSpeech, explainMicError, pickVoice, splitForSpeech } from "./voice";

const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService }) as SpeechSynthesisVoice;

describe("speech text", () => {
  it("reads money and drops markup and law IDs", () => {
    expect(cleanForSpeech("Pay **Rs 25,000** monthly (Source: ICA-74, TPA-106). Deposit ₹1,50,000 [[to be filled: date]]")).toBe(
      "Pay rupees 25,000 monthly. Deposit rupees 1,50,000 date",
    );
  });
  it("splits long text so browsers do not cut it off", () => {
    const parts = splitForSpeech("One short sentence. ".repeat(60));
    expect(parts.length).toBeGreaterThan(2);
    expect(parts.every((p) => p.length <= 360)).toBe(true);
  });
  it("splits at the Hindi full stop", () => {
    expect(splitForSpeech("नमस्ते। आप कैसे हैं।", 10)).toHaveLength(2);
  });
});

describe("choosing a voice", () => {
  const list = [voice("Samantha", "en-US"), voice("Rishi", "en-IN"), voice("Google हिन्दी", "hi-IN", false), voice("Lekha", "hi-IN")];
  it("prefers the exact language, then the better-sounding voice", () => {
    expect(pickVoice(list, "en-IN")?.name).toBe("Rishi");
    expect(pickVoice(list, "hi-IN")?.name).toBe("Google हिन्दी");
  });
  it("falls back to the same language, or to none", () => {
    expect(pickVoice([voice("Samantha", "en-US")], "en-IN")?.name).toBe("Samantha");
    expect(pickVoice(list, "te-IN")).toBeNull();
  });
});

describe("microphone errors", () => {
  it("are explained in plain words", () => {
    expect(explainMicError("not-allowed")).toMatch(/blocked/);
    expect(explainMicError("no-speech")).toMatch(/didn't hear/);
    expect(explainMicError("whatever")).toMatch(/type your message/);
  });
});
