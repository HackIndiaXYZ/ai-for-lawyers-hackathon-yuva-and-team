import { NextResponse } from "next/server";
import { failureFrom, guarded } from "@/lib/ai/guard";
import { mockConversation } from "@/lib/ai/mock";
import { conversationPrompt } from "@/lib/ai/prompts";
import { aiMode, completeText, extractJson } from "@/lib/ai/provider";
import {
  chatRequestSchema,
  conversationReplySchema,
  sanitizeReply,
  type ConversationReply,
} from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const g = await guarded(req, chatRequestSchema);
  if (!g.ok) return g.response;
  const { turns, state } = g.data;

  try {
    const mode = aiMode();
    let reply: ConversationReply;

    if (mode === "demo") {
      reply = mockConversation(g.data);
    } else {
      const lastUser = [...turns].reverse().find((t) => t.role === "user")?.content ?? "";
      const text = await completeText({
        system: conversationPrompt(state, lastUser),
        messages: turns,
        tier: "fast",
        maxTokens: 1500,
        signal: req.signal,
      });
      reply = conversationReplySchema.parse(extractJson(text));
    }

    return NextResponse.json({
      ok: true,
      mode,
      data: sanitizeReply(reply, state),
      needsHumanReview: false,
    });
  } catch (e) {
    return failureFrom(e);
  }
}
