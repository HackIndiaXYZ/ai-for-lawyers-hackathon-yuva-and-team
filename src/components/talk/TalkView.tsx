"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CONTRACT_TYPES } from "@/lib/law";
import { canonical, parseContract } from "@/lib/contract";
import { postJson, streamDraft } from "@/lib/api";
import type { ChatState, ConversationReply, LangCode, LegalCheck, Stage, Turn } from "@/lib/ai/schemas";
import DetailsCard, { InterviewProgress, type Detail } from "./DetailsCard";
import { AdviceCard, LegalAlertCard, LegalCheckPanel, ReviewBanner, type Advice, type Flag, type LegalState } from "./cards";
import { BeforeYouSign, ContractPaper } from "./ContractPaper";

const MAX_TURNS = 24;

const STARTERS = [
  "I want to rent out my flat",
  "I'm hiring a freelance designer",
  "I need an NDA before sharing my idea",
  "My landlord won't return my deposit",
  "I'm selling my bike",
];

const GREETING =
  "Hello, I'm Sandhi. Tell me what's on your mind: a legal worry, or a document you need. Don't worry, we'll go through it together.";

type Item =
  | { id: number; kind: "you"; text: string }
  | { id: number; kind: "say"; text: string }
  | { id: number; kind: "advice"; advice: Advice }
  | { id: number; kind: "alert"; flag: Flag }
  | { id: number; kind: "error"; text: string; review: boolean };

type NewItem =
  | { kind: "you"; text: string }
  | { kind: "say"; text: string }
  | { kind: "advice"; advice: Advice }
  | { kind: "alert"; flag: Flag }
  | { kind: "error"; text: string; review: boolean };

interface Session {
  nextId: number;
  items: Item[];
  turns: Turn[];
  details: Record<string, Detail>;
  missing: string[];
  contractType: string | null;
  userRole: string | null;
  stage: Stage | null;
  ready: boolean;
  pushback: number;
  drafted: boolean;
  draftText: string;
  busy: boolean;
  drafting: boolean;
  legal: LegalState;
  flash: string[];
}

const INITIAL: Session = {
  nextId: 1,
  items: [],
  turns: [],
  details: {},
  missing: [],
  contractType: null,
  userRole: null,
  stage: null,
  ready: false,
  pushback: 0,
  drafted: false,
  draftText: "",
  busy: false,
  drafting: false,
  legal: { state: "idle" },
  flash: [],
};

function flatDetails(d: Record<string, Detail>): Record<string, string> {
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.value]));
}

function withItem(p: Session, item: NewItem): Session {
  return { ...p, nextId: p.nextId + 1, items: [...p.items, { ...item, id: p.nextId } as Item] };
}

export default function TalkView({ lang }: { lang: LangCode }) {
  const [s, setS] = useState<Session>(INITIAL);
  // The ref always holds the latest session, so async steps never read stale values.
  const sRef = useRef<Session>(INITIAL);
  const update = useCallback((fn: (p: Session) => Session) => {
    sRef.current = fn(sRef.current);
    setS(sRef.current);
  }, []);

  const [input, setInput] = useState("");
  const [showWhy, setShowWhy] = useState(true);
  const [notice, setNotice] = useState("");

  const chatAbort = useRef<AbortController | null>(null);
  const draftAbort = useRef<AbortController | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      chatAbort.current?.abort();
      draftAbort.current?.abort();
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.items.length, s.busy]);

  const model = useMemo(() => parseContract(s.draftText), [s.draftText]);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 5000);
  }, []);

  /* ---------------- legal check ---------------- */

  const runLegalCheck = useCallback(
    async (text: string, contractType: string | null) => {
      const canon = canonical(parseContract(text));
      if (canon.length < 20) return;
      update((p) => ({ ...p, legal: { state: "loading" } }));
      const res = await postJson<LegalCheck>("/api/legal-check", { contractType, text: canon });
      if (res.ok) {
        update((p) => ({ ...p, legal: { state: "done", data: res.data, review: res.needsHumanReview } }));
      } else if (res.code !== "aborted") {
        update((p) => ({ ...p, legal: { state: "error", message: `The legal check could not run. ${res.message}`, review: true } }));
      }
    },
    [update],
  );

  /* ---------------- drafting ---------------- */

  const generateContract = useCallback(async () => {
    const cur = sRef.current;
    if (cur.drafting) return;
    if (!cur.contractType) {
      update((p) => withItem(p, { kind: "error", text: "Please choose a contract type first.", review: false }));
      return;
    }

    const ctl = new AbortController();
    draftAbort.current = ctl;
    update((p) => ({ ...p, drafting: true, draftText: "", legal: { state: "idle" } }));

    const said = cur.turns
      .filter((t) => t.role === "user")
      .slice(-10)
      .map((t) => t.content)
      .join("\n")
      .slice(0, 8000);

    // Write the contract to the page at most once per screen refresh, however fast it streams in.
    let buffer = "";
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (!buffer) return;
      const piece = buffer;
      buffer = "";
      update((p) => ({ ...p, draftText: p.draftText + piece }));
    };

    const res = await streamDraft(
      {
        contractType: cur.contractType,
        userRole: cur.userRole,
        details: flatDetails(cur.details),
        said,
      },
      (chunk) => {
        buffer += chunk;
        if (!frame) frame = requestAnimationFrame(flush);
      },
      ctl.signal,
    );
    if (frame) cancelAnimationFrame(frame);
    flush();

    const text = sRef.current.draftText;
    const keepPartial = text.length > 200;

    if (res.ok) {
      update((p) =>
        withItem(
          { ...p, drafting: false, drafted: true },
          {
            kind: "say",
            text: "Your contract is on the right. Please read it carefully, and look at the legal check under it before you sign.",
          },
        ),
      );
      await runLegalCheck(text, cur.contractType);
      return;
    }

    // The draft was stopped or failed. Keep it only if a meaningful amount was written.
    update((p) => ({
      ...p,
      drafting: false,
      drafted: keepPartial ? true : p.drafted,
      draftText: keepPartial ? p.draftText : "",
    }));
    if (res.code !== "aborted") {
      update((p) =>
        withItem(p, {
          kind: "error",
          text: keepPartial
            ? `The contract stopped part-way. ${res.message} You can keep what is written, or press Redraft to try again.`
            : res.message,
          review: res.needsHumanReview,
        }),
      );
    }
  }, [runLegalCheck, update]);

  /* ---------------- conversation ---------------- */

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      const cur = sRef.current;
      if (!text || cur.busy || cur.drafting) return;

      const turns: Turn[] = [...cur.turns, { role: "user", content: text }];
      update((p) => withItem({ ...p, busy: true, turns }, { kind: "you", text }));

      const state: ChatState = {
        lang,
        contractType: cur.contractType,
        userRole: cur.userRole,
        stage: cur.stage,
        ready: cur.ready,
        pushback: cur.pushback,
        drafted: cur.drafted,
        details: flatDetails(cur.details),
        docContext: "",
      };

      const ctl = new AbortController();
      chatAbort.current = ctl;
      const res = await postJson<ConversationReply>("/api/chat", { turns: turns.slice(-MAX_TURNS), state }, ctl.signal);

      if (!res.ok) {
        update((p) => {
          const next = { ...p, busy: false };
          return res.code === "aborted"
            ? next
            : withItem(next, { kind: "error", text: res.message, review: res.needsHumanReview });
        });
        return;
      }

      const d = res.data;
      const changed: string[] = [];
      update((p) => {
        const details = { ...p.details };
        for (const f of d.fields) {
          if (details[f.key]?.value !== f.value) changed.push(f.key);
          details[f.key] = { label: f.label, value: f.value };
        }
        let next: Session = {
          ...p,
          busy: false,
          turns: [...p.turns, { role: "assistant", content: d.reply }],
          details,
          missing: d.missing,
          contractType: d.contract_type ?? p.contractType,
          userRole: d.user_role ?? p.userRole,
          stage: d.stage ?? p.stage,
          ready: d.ready,
          pushback: p.pushback + (d.pushback ? 1 : 0),
          flash: changed,
        };
        next = withItem(next, { kind: "say", text: d.reply });
        for (const flag of d.legal_flags) next = withItem(next, { kind: "alert", flag });
        if (d.advice) next = withItem(next, { kind: "advice", advice: d.advice });
        return next;
      });

      if (changed.length > 0) {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => update((p) => ({ ...p, flash: [] })), 1400);
      }

      // "Draft now" only counts once the interview is complete, or after the client insisted.
      const allowed = d.ready || cur.pushback >= 1;
      if (d.action === "draft_now" && allowed) await generateContract();
    },
    [generateContract, lang, update],
  );

  /* ---------------- buttons ---------------- */

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input;
    setInput("");
    void send(text);
  }

  function onDraftClick() {
    const cur = sRef.current;
    if (cur.drafted || cur.ready) void generateContract();
    else void send("Please draft it now.");
  }

  function onStop() {
    draftAbort.current?.abort();
    chatAbort.current?.abort();
  }

  function onReset() {
    draftAbort.current?.abort();
    chatAbort.current?.abort();
    sRef.current = INITIAL;
    setS(INITIAL);
    setInput("");
  }

  function onOrb() {
    showNotice("Voice input is added in a later phase. For now, please type your message.");
  }

  function onPickType(value: string) {
    update((p) => ({ ...p, contractType: value || null }));
  }

  const orbState = s.busy || s.drafting ? "thinking" : "idle";
  const orbLabel = s.busy ? "Thinking…" : s.drafting ? "Writing your contract…" : "Tap to talk";
  const hasUserTurn = s.turns.some((t) => t.role === "user");
  const draftLabel = s.drafted ? "Redraft" : "Draft contract";
  const draftDisabled = !s.contractType || s.busy || s.drafting;

  return (
    <div className="grid2">
      <section className="card" aria-label="Conversation">
        <h2>Talk to Sandhi</h2>

        <div className="transcript" role="log" aria-live="polite" ref={transcriptRef}>
          <p className="say">{GREETING}</p>
          {s.items.map((it) => {
            if (it.kind === "you") return <p key={it.id} className="you">{it.text}</p>;
            if (it.kind === "say") return <p key={it.id} className="say">{it.text}</p>;
            if (it.kind === "alert") return <LegalAlertCard key={it.id} flag={it.flag} />;
            if (it.kind === "advice") return <AdviceCard key={it.id} advice={it.advice} />;
            return (
              <div key={it.id} className="note-card note-error" role="alert">
                <p>{it.text}</p>
                <ReviewBanner show={it.review} />
              </div>
            );
          })}
          {s.busy && (
            <p className="say muted" aria-label="Sandhi is thinking">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
            </p>
          )}
        </div>

        {!hasUserTurn && (
          <div className="chips">
            {STARTERS.map((t) => (
              <button key={t} type="button" className="chip" onClick={() => void send(t)} disabled={s.busy}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="caption" aria-live="polite">
          {notice}
        </div>

        <div className="orb-wrap">
          <button type="button" className="orb" data-state={orbState} onClick={onOrb} aria-label="Voice input (coming soon)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v4" />
            </svg>
          </button>
          <span className="muted">{orbLabel}</span>
        </div>

        <form className="inputrow" onSubmit={onSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            aria-label="Type your message"
            maxLength={1000}
            disabled={s.busy || s.drafting}
          />
          <button type="submit" className="btn btn-primary" disabled={s.busy || s.drafting || !input.trim()}>
            Send
          </button>
        </form>
        <p className="linkrow">
          <button type="button" className="linkbtn" onClick={onReset}>
            Start over
          </button>
        </p>
      </section>

      <div className="stack">
        <section className="card" aria-label="Contract controls">
          <div className="controls">
            <label className="field">
              <span>Contract type</span>
              <select value={s.contractType ?? ""} onChange={(e) => onPickType(e.target.value)} disabled={s.drafting}>
                <option value="">Choose a contract type</option>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.code} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="btn-row">
              {s.drafting && (
                <button type="button" className="btn" onClick={onStop}>
                  Stop
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={onDraftClick}
                disabled={draftDisabled}
                title={s.contractType ? undefined : "Choose a contract type first"}
              >
                {draftLabel}
              </button>
            </div>
          </div>
          <InterviewProgress stage={s.stage} ready={s.ready} />
        </section>

        <section className="card" aria-label="What I have heard so far">
          <h2>What I&apos;ve heard so far</h2>
          <DetailsCard details={s.details} role={s.userRole} missing={s.missing} flash={s.flash} />
        </section>

        <ContractPaper
          model={model}
          hasText={s.draftText.length > 0}
          drafting={s.drafting}
          showWhy={showWhy}
          onToggleWhy={setShowWhy}
        />
        <LegalCheckPanel legal={s.legal} />
        <BeforeYouSign model={model} />
      </div>
    </div>
  );
}
