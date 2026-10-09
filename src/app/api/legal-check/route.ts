import { NextResponse } from "next/server";
import { failureFrom, guarded } from "@/lib/ai/guard";
import { mockLegalCheck } from "@/lib/ai/mock";
import { legalCheckPrompt } from "@/lib/ai/prompts";
import { aiMode, completeText, extractJson } from "@/lib/ai/provider";
import { legalCheckSchema, sanitizeLegalCheck, textRequestSchema } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const g = await guarded(req, textRequestSchema);
  if (!g.ok) return g.response;

  try {
    const mode = aiMode();
    const raw =
      mode === "demo"
        ? mockLegalCheck(g.data.text)
        : legalCheckSchema.parse(
            extractJson(
              await completeText({
                messages: [{ role: "user", content: legalCheckPrompt(g.data.contractType, g.data.text) }],
                tier: "smart",
                maxTokens: 3000,
                signal: req.signal,
              }),
            ),
          );
    const data = sanitizeLegalCheck(raw);

    // Human-review fallback: anything short of "ready to sign" should be seen by an advocate,
    // and so should any answer that came back with no clause-level findings at all.
    const needsHumanReview = data.verdict !== "ready to sign" || data.items.length === 0;

    return NextResponse.json({ ok: true, mode, data, needsHumanReview });
  } catch (e) {
    return failureFrom(e);
  }
}
