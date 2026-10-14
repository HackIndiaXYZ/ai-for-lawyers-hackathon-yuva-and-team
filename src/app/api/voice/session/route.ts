import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { failure, guarded } from "@/lib/ai/guard";
import { logEvent } from "@/lib/log";
import { createVoiceSession, omnidimConfigured, VoiceError } from "@/lib/omnidim";
import { dailyBudget } from "@/lib/ratelimit";

const LANGUAGES = { en: "English", hi: "Hindi", te: "Telugu" } as const;
const requestSchema = z.object({
  lang: z.enum(["en", "hi", "te"]).default("en"),
  purpose: z.enum(["intake", "help"]).default("intake"),
});

/** Most voice calls Sandhi will start in a day. Calls use paid credits, so this is kept small. */
function dailyVoiceCap(): number {
  const n = Number(process.env.SANDHI_DAILY_VOICE_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
}

export async function POST(req: Request) {
  await connection();
  const g = await guarded(req, requestSchema);
  if (!g.ok) return g.response;

  if (!omnidimConfigured(g.data.purpose)) {
    return failure("not_configured", "Voice calls are not set up yet. You can still type or use the microphone button.", 503, false);
  }

  const budget = await dailyBudget(Date.now(), "voice", dailyVoiceCap());
  if (!budget.ok) {
    logEvent("voice_daily_cap_reached", {});
    return failure("busy", "Voice calls have reached their limit for today. You can still type or use the microphone button.", 503, false, {
      "retry-after": String(budget.retryAfter),
    });
  }

  try {
    const session = await createVoiceSession({ language: LANGUAGES[g.data.lang], purpose: g.data.purpose, signal: req.signal });
    // Only the one-conversation address goes to the browser. The key and token stay here.
    return NextResponse.json({ ok: true, mode: "live", data: session, needsHumanReview: false });
  } catch (e) {
    if (e instanceof VoiceError) {
      logEvent("voice_session_failed", { code: e.code });
      return failure(e.code, e.message, e.status, false);
    }
    logEvent("voice_session_error", { error: e instanceof Error ? e.name : "unknown" });
    return failure("server", "Something went wrong starting the call. Please try again.", 500, false);
  }
}
