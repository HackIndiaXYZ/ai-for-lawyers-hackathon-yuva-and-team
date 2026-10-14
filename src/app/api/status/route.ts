import { connection, NextResponse } from "next/server";
import { aiMode } from "@/lib/ai/provider";
import { omnidimConfigured } from "@/lib/omnidim";

// Tells the page whether it is talking to the real AI or the demo answers, and whether voice calls are set up.
export async function GET() {
  await connection(); // read the environment at request time, not at build time
  return NextResponse.json({ mode: aiMode(), voiceCall: omnidimConfigured(), helpCall: omnidimConfigured("help") });
}
