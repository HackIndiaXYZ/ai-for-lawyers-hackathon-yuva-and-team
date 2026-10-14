"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyTranscript, clientLineCount, transcriptText, type CallTurn, type TranscriptEvent } from "@/lib/callTranscript";
import { readFailure } from "@/lib/api";
import type { LangCode } from "@/lib/ai/schemas";

/** The small part of the OmniDimension browser client this page uses. Tests pass a stand-in. */
export interface CallSession {
  on(event: "status", cb: (s: "connecting" | "active" | { state: "ended"; reason: string }) => void): unknown;
  on(event: "transcript", cb: (t: TranscriptEvent) => void): unknown;
  on(event: "error", cb: (e: Error) => void): unknown;
  start(o: { wsUrl: string }): Promise<void>;
  mute(muted: boolean): void;
  stop(): void;
}
export type LoadClient = () => Promise<{ WebSession: new () => CallSession }>;

const defaultLoad: LoadClient = () => import("@omnidim-ai/client") as unknown as ReturnType<LoadClient>;

type Phase = "idle" | "starting" | "live" | "ended";

const END_REASON: Record<string, string> = {
  hangup: "The call ended.",
  stopped: "You ended the call.",
  insufficient_balance: "The voice credits ran out, so the call stopped. What was said so far is kept below.",
  connection_lost: "The connection was lost. What was said so far is kept below.",
  start_failed: "The call could not start.",
};

function explainStartError(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  const msg = e instanceof Error ? e.message : "";
  if (name === "NotAllowedError" || /permission|denied/i.test(msg)) {
    return "The microphone is blocked. Click the lock icon in the address bar, allow the microphone, then try the call again.";
  }
  if (name === "NotFoundError" || /not found|no.*device/i.test(msg)) return "I can't find a microphone on this device. You can type your message instead.";
  return "The call could not start. Please try again, or type your message instead.";
}

export default function VoiceCall({
  available,
  lang,
  onUse,
  onStart,
  purpose = "intake",
  loadClient = defaultLoad,
}: {
  /** True when the server has voice calls set up. */
  available: boolean;
  lang: LangCode;
  /** Hands the finished call to Sandhi's own checks. */
  onUse: (transcript: string) => Promise<boolean>;
  /** Called when a call begins, so the page can stop its own voice. */
  onStart: () => void;
  /** Which voice agent to call. */
  purpose?: "intake" | "help";
  loadClient?: LoadClient;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState("");
  const [handing, setHanding] = useState(false);
  const session = useRef<CallSession | null>(null);
  const runId = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const hangUp = useCallback(() => {
    runId.current++; // late events from this call are ignored
    session.current?.stop();
    session.current = null;
  }, []);
  useEffect(() => hangUp, [hangUp]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  async function start() {
    if (phase === "starting" || phase === "live") return;
    const my = ++runId.current;
    setPhase("starting");
    setTurns([]);
    setMuted(false);
    setMessage("");
    onStart();

    try {
      const res = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, purpose }),
      });
      if (!res.ok) throw Object.assign(new Error((await readFailure(res)).message), { friendly: true });
      const body = (await res.json()) as { data?: { wsUrl?: string } };
      const wsUrl = body.data?.wsUrl;
      if (!wsUrl) throw Object.assign(new Error("The voice service sent no address."), { friendly: true });
      if (runId.current !== my) return;

      const { WebSession } = await loadClient();
      const s = new WebSession();
      session.current = s;
      s.on("transcript", (t) => {
        if (runId.current === my) setTurns((prev) => applyTranscript(prev, t));
      });
      s.on("status", (st) => {
        if (runId.current !== my) return;
        if (st === "active") setPhase("live");
        else if (typeof st === "object") {
          session.current = null;
          setPhase("ended");
          setMessage(END_REASON[st.reason] ?? "The call ended.");
        }
      });
      s.on("error", () => {
        /* the call can carry on after an error; the status event reports if it did not */
      });
      await s.start({ wsUrl });
      if (runId.current === my) setPhase("live");
    } catch (e) {
      if (runId.current !== my) return;
      session.current = null;
      setPhase("idle");
      setMessage((e as { friendly?: boolean }).friendly ? (e as Error).message : explainStartError(e));
    }
  }

  function end() {
    const s = session.current;
    if (s) s.stop(); // the status event moves us to "ended"
  }

  function toggleMute() {
    const next = !muted;
    session.current?.mute(next);
    setMuted(next);
  }

  async function writeUp() {
    setHanding(true);
    const done = await onUse(transcriptText(turns));
    setHanding(false);
    if (done) {
      // Sandhi has the details now; the call text is no longer needed on screen.
      setTurns([]);
      setPhase("idle");
      setMessage(help ? "Done. Your advice is on the left." : "Done. Sandhi has read your call. Check the details on the right and the questions in the chat.");
    } else {
      setMessage("Sandhi could not read the call just now. Your call text is kept here: please try again.");
    }
  }

  function discard() {
    hangUp();
    setTurns([]);
    setPhase("idle");
    setMessage("");
  }

  const help = purpose === "help";
  const lines = clientLineCount(turns);
  const inCall = phase === "starting" || phase === "live";

  if (!available && phase === "idle") {
    return (
      <section className="card call-card" aria-label="Voice call">
        <h2>{help ? "Tell it on a call" : "Talk it out on a call"}</h2>
        <p className="muted">
          {help
            ? "A voice agent can listen to your problem, one question at a time, and Sandhi then checks the law and tells you what to do and what not to do. The voice call is not set up on this site yet. The microphone button and typing work as usual."
            : "A natural-sounding voice agent can interview you by voice, and Sandhi then writes it up. Voice calls are not set up on this site yet. The microphone button and typing work as usual."}
        </p>
      </section>
    );
  }

  return (
    <section className="card call-card" aria-label="Voice call">
      <h2>{help ? "Tell it on a call" : "Talk it out on a call"}</h2>
      <p className="muted">
        {help
          ? "Speak with the voice agent. It asks one question at a time until it understands your situation. Then press End call and Sandhi checks Indian law and shows what to do and what not to do. The agent only listens and asks; the advice comes from Sandhi's checked law library."
          : "Speak with a natural-sounding voice agent, then press End call. Sandhi reads what you said, fills in the details, checks them against Indian law and is ready to draft. The agent only asks questions; it does not give legal advice."}
      </p>

      <div className="btn-row wrap">
        {!inCall && phase !== "ended" && (
          <button type="button" className="btn btn-primary" onClick={() => void start()}>
            Start voice call
          </button>
        )}
        {inCall && (
          <>
            <button type="button" className="btn btn-primary" onClick={end} disabled={phase === "starting"}>
              End call
            </button>
            <button type="button" className="btn" onClick={toggleMute} aria-pressed={muted} disabled={phase !== "live"}>
              {muted ? "Unmute" : "Mute"}
            </button>
          </>
        )}
        {phase === "ended" && lines > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => void writeUp()} disabled={handing}>
            {handing ? "Sandhi is reading your call…" : help ? "Get my advice" : "Let Sandhi write this up"}
          </button>
        )}
        {phase === "ended" && (
          <button type="button" className="btn" onClick={discard}>
            {lines > 0 ? "Discard this call" : "Close"}
          </button>
        )}
      </div>

      <p className="call-status" role="status">
        {phase === "starting" && "Connecting… please allow the microphone if asked."}
        {phase === "live" && (muted ? "Call is live. You are muted." : "Call is live. Speak naturally.")}
        {phase === "ended" && lines === 0 && "Nothing was said, so there is nothing to write up."}
      </p>
      {message && (
        <p className="call-message" role="alert">
          {message}
        </p>
      )}

      {turns.length > 0 && (
        <div className="call-log" role="log" aria-label="Call transcript" aria-live="polite" ref={logRef}>
          {turns.map((t) => (
            <p key={t.id} className={`call-turn call-${t.role}`} data-final={t.final ? "true" : "false"}>
              <strong>{t.role === "user" ? "You" : "Sandhi"}:</strong> {t.text}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
