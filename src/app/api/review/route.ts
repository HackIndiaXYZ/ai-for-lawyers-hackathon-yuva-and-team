import { failureFrom, guarded } from "@/lib/ai/guard";
import { mockReviewStream } from "@/lib/ai/mockReview";
import { reviewPrompt } from "@/lib/ai/prompts";
import { aiMode, streamText, type AiContentBlock } from "@/lib/ai/provider";
import { REVIEW_MAX_BYTES, reviewRequestSchema } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const g = await guarded(req, reviewRequestSchema, { maxBytes: REVIEW_MAX_BYTES });
  if (!g.ok) return g.response;
  const { text, role, images } = g.data;

  try {
    const mode = aiMode();
    let source: AsyncGenerator<string>;

    if (mode === "demo") {
      source = mockReviewStream(text, role);
    } else {
      const content: AiContentBlock[] = [
        ...images.map(
          (i): AiContentBlock => ({
            type: "image",
            source: { type: "base64", media_type: i.mediaType, data: i.data },
          }),
        ),
        { type: "text", text: reviewPrompt(text, role, images.length > 0) },
      ];
      source = streamText({
        messages: [{ role: "user", content }],
        tier: "smart",
        maxTokens: 6000,
        signal: req.signal,
      });
    }

    // Read the first piece before answering, so a problem such as a rejected key
    // is reported as a clear error instead of an empty report.
    const iterator = source[Symbol.asyncIterator]();
    const first = await iterator.next();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let step = first;
          while (!step.done) {
            controller.enqueue(encoder.encode(step.value));
            step = await iterator.next();
          }
        } catch {
          // Stop cleanly. The page shows what arrived and offers a retry plus the advocate-review notice.
        }
        controller.close();
      },
      async cancel() {
        await iterator.return?.(undefined);
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-sandhi-mode": mode,
      },
    });
  } catch (e) {
    return failureFrom(e);
  }
}
