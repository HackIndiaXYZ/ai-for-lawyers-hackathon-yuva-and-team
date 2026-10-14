import { NextResponse } from "next/server";
import { failureFrom, guarded } from "@/lib/ai/guard";
import { helpPrompt } from "@/lib/ai/prompts";
import { aiMode, completeText, extractJson } from "@/lib/ai/provider";
import { mockHelp } from "@/lib/help/mock";
import { helpReplySchema, helpRequestSchema, sanitizeHelp, type HelpReply } from "@/lib/help/schemas";

export async function POST(req: Request) {
  const g = await guarded(req, helpRequestSchema);
  if (!g.ok) return g.response;
  const { turns, lang, callTranscript } = g.data;

  try {
    const mode = aiMode();
    let reply: HelpReply;

    if (mode === "demo") {
      reply = mockHelp(g.data);
    } else {
      const clientText = turns.filter((t) => t.role === "user").map((t) => t.content).join("\n");
      const messages = callTranscript.trim()
        ? [...turns, { role: "user" as const, content: `Here is the phone call I just had with your intake agent. Treat it as everything I have told you so far:\n<<<DATA\n${callTranscript.replace(/<<<DATA|DATA>>>/g, "")}\nDATA>>>` }]
        : turns;
      const text = await completeText({
        system: helpPrompt(lang, `${clientText}\n${callTranscript}`),
        messages,
        tier: "fast",
        maxTokens: 2200,
        signal: req.signal,
      });
      reply = helpReplySchema.parse(extractJson(text));
    }

    const clientTurns = turns.filter((t) => t.role === "user").length;
    const data = sanitizeHelp(reply, { clientTurns, fromCall: Boolean(callTranscript.trim()) });
    return NextResponse.json({ mode, data, ok: true, needsHumanReview: data.review });
  } catch (e) {
    return failureFrom(e);
  }
}
