"use client";

import { useState } from "react";

type Tab = "talk" | "check" | "law";
type Lang = "en" | "hi" | "te";
type OrbState = "idle" | "listening" | "thinking" | "speaking";

const TABS: { id: Tab; label: string }[] = [
  { id: "talk", label: "Talk and draft" },
  { id: "check", label: "Check a contract" },
  { id: "law", label: "Law library" },
];

const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: "en", label: "EN", name: "English" },
  { id: "hi", label: "हिं", name: "Hindi" },
  { id: "te", label: "తె", name: "Telugu" },
];

const STARTERS = [
  "I want to rent out my flat",
  "I'm hiring a freelance designer",
  "I need an NDA before sharing my idea",
  "My landlord won't return my deposit",
  "I'm selling my bike",
];

const ORB_ORDER: OrbState[] = ["idle", "listening", "thinking", "speaking"];

const ORB_LABEL: Record<OrbState, string> = {
  idle: "Tap to talk",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v4" />
    </svg>
  );
}

function TalkView() {
  const [orb, setOrb] = useState<OrbState>("idle");

  // Temporary: tapping the orb cycles through its four looks so you can see them.
  // The real microphone arrives in the voice phase.
  function cycleOrb() {
    const next = ORB_ORDER[(ORB_ORDER.indexOf(orb) + 1) % ORB_ORDER.length];
    setOrb(next);
  }

  return (
    <div className="grid2">
      <section className="card" aria-label="Conversation">
        <h2>Talk to Sandhi</h2>
        <div className="transcript" role="log" aria-live="polite">
          <p className="say">
            Hello, I&apos;m Sandhi. Tell me what&apos;s on your mind: a legal worry, or a
            document you need. Don&apos;t worry, we&apos;ll go through it together.
          </p>
        </div>

        <div className="chips">
          {STARTERS.map((s) => (
            <button key={s} type="button" className="chip" disabled title="Comes alive in the next phase">
              {s}
            </button>
          ))}
        </div>

        <div className="caption" aria-live="polite">
          {orb === "listening" ? "Your words will appear here as you speak." : ""}
        </div>

        <div className="orb-wrap">
          <button
            type="button"
            className="orb"
            data-state={orb}
            onClick={cycleOrb}
            aria-label={ORB_LABEL[orb]}
          >
            <MicIcon />
          </button>
          <span className="muted">{ORB_LABEL[orb]}</span>
        </div>

        <div className="inputrow">
          <input type="text" placeholder="Or type here…" aria-label="Type your message" disabled />
          <button type="button" className="btn btn-primary" disabled>
            Send
          </button>
        </div>
      </section>

      <div className="stack">
        <section className="card" aria-label="Interview progress and details">
          <h2>What I&apos;ve heard so far</h2>
          <div className="muted">Interview step 1 of 6: background</div>
          <div className="progress" aria-hidden="true">
            <span style={{ width: "16%" }} />
          </div>
          <p className="empty">
            Nothing yet. Start talking and I&apos;ll note names, amounts and dates here.
          </p>
        </section>

        <section aria-label="Contract preview">
          <div className="paper">
            <div className="paper-ribbon">
              <span>Your contract</span>
              <small>Not yet stamped or signed</small>
            </div>
            <div className="sheet">
              <h3>AGREEMENT</h3>
              <p>
                Your contract will appear here, line by line, as soon as we have talked
                it through.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PlaceholderView({ title, text }: { title: string; text: string }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="empty">{text}</p>
    </section>
  );
}

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("talk");
  const [lang, setLang] = useState<Lang>("en");

  return (
    <main className="app">
      <div className="demo-banner" role="status">
        <span className="badge badge-warn">Demo mode</span>
        <span>Sample answers only. The real AI will be switched on later.</span>
      </div>

      <header className="topbar">
        <div className="brand">
          <h1 className="brand-name">Sandhi</h1>
          <span className="brand-deva" lang="hi">संधि</span>
          <span className="brand-tag">speak it, sign it</span>
        </div>

        <div className="lang" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={lang === l.id}
              aria-label={l.name}
              onClick={() => setLang(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Sandhi sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className="tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "talk" && <TalkView />}
        {tab === "check" && (
          <PlaceholderView
            title="Check a contract"
            text="Paste or photograph a contract and Sandhi will brief you on it and find the loopholes. Built in Phase 6."
          />
        )}
        {tab === "law" && (
          <PlaceholderView
            title="Law library"
            text="A searchable library of the Indian law provisions Sandhi cites. Built in Phase 3."
          />
        )}
      </div>

      <footer className="footer">
        Sandhi is an assistant, not a lawyer. For high-value or disputed matters, speak to an advocate.
      </footer>
    </main>
  );
}