import { failureFrom, guarded } from "@/lib/ai/guard";
import { mockDraftStream } from "@/lib/ai/mock";
import { draftPrompt } from "@/lib/ai/prompts";
import { aiMode, streamText } from "@/lib/ai/provider";
import { draftRequestSchema } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const g = await guarded(req, draftRequestSchema);
  if (!g.ok) return g.response;

  try {
    const mode = aiMode();
    const source =
      mode === "demo"
        ? mockDraftStream(g.data)
        : streamText({
            messages: [{ role: "user", content: draftPrompt(g.data) }],
            tier: "smart",
            maxTokens: 6000,
            signal: req.signal,
          });

    // Read the first piece before answering, so a problem such as a rejected key
    // is reported as a clear error instead of an empty page.
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
          controller.close();
        } catch {
          // Stop cleanly. The page keeps whatever was written so far and offers a retry.
          controller.close();
        }
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
