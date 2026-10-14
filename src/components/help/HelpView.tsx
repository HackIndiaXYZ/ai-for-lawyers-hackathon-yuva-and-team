"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postJson, type ApiFailure } from "@/lib/api";
import type { LangCode, Turn } from "@/lib/ai/schemas";
import type { HelpReply } from "@/lib/help/schemas";
import { SourceChips } from "@/components/SourceProvider";
import { ReviewBanner } from "@/components/talk/cards";
import { MIN_CONFIDENCE, useVoice } from "@/components/talk/useVoice";
import VoiceCall, { type LoadClient } from "@/components/talk/VoiceCall";

const GREETING =
  "Hello, I'm Sandhi. Please don't worry. Tell me what has happened in a sentence or two, and I will ask you a few questions, one at a time, so I understand everything before I tell you what to do.";

const STARTERS = [
  "My landlord is not returning my deposit",
  "My employer has not paid my salary",
  "A cheque I received has bounced",
  "I think I was cheated online",
  "My landlord is threatening to throw me out",
];

type Item = { id: number; kind: "you" | "say" | "error"; text: string; review?: boolean };

/** What the advice sounds like when read aloud: the first few things to do and not to do. */
function spokenAdvice(r: HelpReply): string {
  const a = r.advice;
  if (!a) return r.reply;
  const d = a.dos.slice(0, 2).join(" ");
  const n = a.donts.slice(0, 2).join(" ");
  return `${r.reply} ${d ? `What to do: ${d}` : ""} ${n ? `What not to do: ${n}` : ""} The full list is on screen.`.trim();
}

export default function HelpView({
  lang,
  callAvailable,
  loadCallClient,
}: {
  lang: LangCode;
  /** True when the Quick legal help voice agent is set up on the server. */
  callAvailable: boolean;
  loadCallClient?: LoadClient;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const [facts, setFacts] = useState<HelpReply["facts"]>([]);
  const [advice, setAdvice] = useState<HelpReply["advice"]>(null);
  const [urgent, setUrgent] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");

  const nextId = useRef(1);
  const abort = useRef<AbortController | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});

  const showNotice = useCallback((m: string) => {
    setNotice(m);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 5000);
  }, []);

  const voice = useVoice({
    lang,
    onNotice: showNotice,
    onHeard: (text, confidence) => {
      if (confidence !== null && confidence < MIN_CONFIDENCE) {
        setInput(text);
        showNotice("I wasn't sure I heard that right. Please check the words, fix any mistakes, then press Send.");
        return;
      }
      void sendRef.current(text);
    },
  });

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, busy]);

  useEffect(
    () => () => {
      abort.current?.abort();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const take = useCallback((r: HelpReply) => {
    setTopic(r.topic);
    setFacts(r.facts);
    setUrgent(r.urgent);
    setReview(r.review);
    if (r.advice) setAdvice(r.advice);
  }, []);

  const fail = useCallback((f: ApiFailure) => {
    setItems((p) => [...p, { id: nextId.current++, kind: "error", text: f.message, review: f.needsHumanReview }]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy) return;
      voice.cancelAll();
      abort.current?.abort();
      const ctl = new AbortController();
      abort.current = ctl;

      const nextTurns: Turn[] = [...turns, { role: "user", content: clean.slice(0, 1000) }];
      setTurns(nextTurns);
      setItems((p) => [...p, { id: nextId.current++, kind: "you", text: clean }]);
      setInput("");
      setBusy(true);
      const res = await postJson<HelpReply>("/api/help", { turns: nextTurns, lang, topic }, ctl.signal);
      if (abort.current !== ctl) return;
      setBusy(false);
      if (!res.ok) {
        if (res.code !== "aborted") fail(res);
        return;
      }
      take(res.data);
      setTurns((p) => [...p, { role: "assistant", content: res.data.reply }]);
      setItems((p) => [...p, { id: nextId.current++, kind: "say", text: res.data.reply }]);
      voice.speakReply(spokenAdvice(res.data));
    },
    [busy, fail, lang, take, topic, turns, voice],
  );
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /** The voice agent's finished call becomes the whole story, and Sandhi checks the law and advises. */
  const useCall = useCallback(
    async (transcript: string): Promise<boolean> => {
      const ctl = new AbortController();
      abort.current?.abort();
      abort.current = ctl;
      setBusy(true);
      const res = await postJson<HelpReply>(
        "/api/help",
        {
          turns: [{ role: "user", content: "I have just described my problem to the voice agent on a call." }],
          lang,
          topic: null,
          callTranscript: transcript,
        },
        ctl.signal,
      );
      if (abort.current !== ctl) return false;
      setBusy(false);
      if (!res.ok) {
        if (res.code !== "aborted") fail(res);
        return false;
      }
      take(res.data);
      setTurns([
        { role: "user", content: "I have just described my problem to the voice agent on a call." },
        { role: "assistant", content: res.data.reply },
      ]);
      setItems([{ id: nextId.current++, kind: "say", text: res.data.reply }]);
      return true;
    },
    [fail, lang, take],
  );

  function reset() {
    abort.current?.abort();
    voice.cancelAll();
    setTurns([]);
    setItems([]);
    setTopic(null);
    setFacts([]);
    setAdvice(null);
    setUrgent(null);
    setReview(false);
    setBusy(false);
    setInput("");
    setNotice("");
  }

  function onOrb() {
    if (busy && !voice.listening && !voice.speaking) {
      showNotice("One moment. I am still working on your last message.");
      return;
    }
    voice.toggleMic();
  }

  const hasUser = turns.some((t) => t.role === "user");
  const orbState = voice.listening ? "listening" : busy ? "thinking" : voice.speaking ? "speaking" : "idle";
  const orbLabel = voice.listening ? "Listening… tap to stop" : busy ? "Thinking…" : voice.speaking ? "Speaking… tap to interrupt" : "Tap to talk";

  return (
    <div className="grid2">
      <section className="card" aria-label="Quick legal help conversation">
        <h2>Quick legal help</h2>
        <p className="muted help-lede">
          Tell Sandhi what is wrong. It asks one question at a time until it fully understands, then tells you what to do
          and what not to do, using Indian law from its checked library.
        </p>

        <div className="transcript" role="log" aria-live="polite" ref={logRef}>
          <p className="say">{GREETING}</p>
          {items.map((it) =>
            it.kind === "you" ? (
              <p key={it.id} className="you">{it.text}</p>
            ) : it.kind === "say" ? (
              <p key={it.id} className="say">{it.text}</p>
            ) : (
              <div key={it.id} className="note-card note-error" role="alert">
                <p>{it.text}</p>
                <ReviewBanner show={Boolean(it.review)} />
              </div>
            ),
          )}
          {busy && (
            <p className="say muted" aria-label="Sandhi is thinking">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
            </p>
          )}
        </div>

        {!hasUser && (
          <div className="chips">
            {STARTERS.map((t) => (
              <button key={t} type="button" className="chip" onClick={() => void send(t)} disabled={busy}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="caption" aria-live="polite">
          {voice.listening ? (voice.interim ? `I hear: “${voice.interim}”` : "Go ahead, I'm listening…") : notice}
        </div>

        <div className="orb-wrap">
          <button
            type="button"
            className="orb"
            data-state={orbState}
            onClick={onOrb}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? "Stop listening" : voice.speaking ? "Stop speaking and talk" : "Talk to Sandhi"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v4" />
            </svg>
          </button>
          <span className="muted" aria-live="polite">{orbLabel}</span>
          {voice.support.speak && (
            <label className="voice-toggle">
              <input type="checkbox" checked={voice.voiceOn} onChange={(e) => voice.setVoiceOn(e.target.checked)} />
              Read Sandhi&apos;s replies aloud
            </label>
          )}
        </div>

        <form
          className="inputrow"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            aria-label="Type your answer"
            maxLength={1000}
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
        <p className="linkrow">
          <button type="button" className="linkbtn" onClick={reset}>
            Start over
          </button>
        </p>
      </section>

      <div className="stack">
        <VoiceCall
          available={callAvailable}
          lang={lang}
          purpose="help"
          onStart={() => voice.cancelAll()}
          onUse={useCall}
          loadClient={loadCallClient}
        />

        {urgent && (
          <aside className="help-urgent" role="alert">
            <strong>{urgent}</strong>
          </aside>
        )}

        {!advice && (
          <section className="card" aria-label="What Sandhi has understood">
            <h2>What I have understood</h2>
            {facts.length === 0 ? (
              <p className="empty">Your answers will appear here as we go, so you can check that I have understood you correctly.</p>
            ) : (
              <ul className="help-facts">
                {facts.map((f, i) => (
                  <li key={`${f.label}-${i}`}>
                    <span>{f.label}</span>
                    <strong>{f.value}</strong>
                  </li>
                ))}
              </ul>
            )}
            {facts.length > 0 && <p className="muted">I will give you advice once I have the full picture. This is {topic ? "a common situation" : "still being understood"}.</p>}
          </section>
        )}

        {advice && (
          <section className="card help-advice" aria-label="What to do and what not to do">
            <h2>{advice.headline}</h2>
            {advice.understood.length > 0 && (
              <details className="help-understood">
                <summary>What I understood</summary>
                <ul>
                  {advice.understood.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="help-cols">
              <div className="help-do">
                <h3>Do</h3>
                <ul>
                  {advice.dos.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
              <div className="help-dont">
                <h3>Do not</h3>
                <ul>
                  {advice.donts.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            {advice.steps.length > 0 && (
              <>
                <h3>Your next steps</h3>
                <ol className="help-steps">
                  {advice.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </>
            )}
            {advice.who && (
              <p>
                <strong>Who to approach:</strong> {advice.who}
              </p>
            )}

            {advice.sections.length > 0 && (
              <>
                <h3>The law behind this</h3>
                <ul className="help-laws">
                  {advice.sections.map((s, i) => (
                    <li key={`${s.law}-${s.section}-${i}`}>
                      <strong>
                        {s.law}
                        {s.section ? `, ${s.section}` : ""}
                      </strong>{" "}
                      {s.confidence === "verify" && <span className="badge badge-warn">Please confirm</span>}
                      <p>{s.plain}</p>
                      {s.id && <SourceChips ids={[s.id]} />}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <ReviewBanner show={review} action="before you act on it" />
            <p className="muted help-disclaimer">
              This is general information, not legal advice for your exact case. Sandhi is an assistant, not a lawyer.
              Laws and time limits can differ by state and change, so please confirm the details with an advocate before
              you act on anything serious.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
