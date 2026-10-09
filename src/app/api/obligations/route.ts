import { NextResponse } from "next/server";
import { failureFrom, guarded } from "@/lib/ai/guard";
import { mockObligations } from "@/lib/ai/mock";
import { obligationsPrompt } from "@/lib/ai/prompts";
import { aiMode, completeText, extractJson } from "@/lib/ai/provider";
import { obligationsSchema, textRequestSchema } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const g = await guarded(req, textRequestSchema);
  if (!g.ok) return g.response;

  try {
    const mode = aiMode();
    const data =
      mode === "demo"
        ? mockObligations()
        : obligationsSchema.parse(
            extractJson(
              await completeText({
                messages: [{ role: "user", content: obligationsPrompt(g.data.text) }],
                tier: "fast",
                maxTokens: 2000,
                signal: req.signal,
              }),
            ),
          );

    return NextResponse.json({ ok: true, mode, data, needsHumanReview: data.length === 0 });
  } catch (e) {
    return failureFrom(e);
  }
}
