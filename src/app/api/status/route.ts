import { connection, NextResponse } from "next/server";
import { aiMode } from "@/lib/ai/provider";

// Tells the page whether it is talking to the real AI or the demo answers.
export async function GET() {
  await connection(); // read the environment at request time, not at build time
  return NextResponse.json({ mode: aiMode() });
}
