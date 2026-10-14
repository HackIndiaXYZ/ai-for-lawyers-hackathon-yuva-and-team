"use client";

import type { ReactNode } from "react";

export type FeatureId = "talk" | "help" | "check" | "verify" | "law";

interface Feature {
  id: FeatureId;
  title: string;
  text: string;
  cta: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const FEATURES: Feature[] = [
  {
    id: "help",
    title: "Quick legal help",
    text: "In trouble or in a hurry? Tell Sandhi what happened. It asks one question at a time, then tells you what to do and what not to do.",
    cta: "Get help now",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3 4 6v6c0 4.5 3.4 7.6 8 9 4.6-1.4 8-4.5 8-9V6l-8-3Z" />
        <path d="m9 12 2.2 2.2L15.5 10" />
      </svg>
    ),
  },
  {
    id: "talk",
    title: "Draft a contract",
    text: "Speak or type what you need. Sandhi interviews you step by step and writes the agreement under Indian law.",
    cta: "Start drafting",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4M10 12h5M10 16h5" />
      </svg>
    ),
  },
  {
    id: "check",
    title: "Check a contract",
    text: "Paste or photograph a contract and see the loopholes, the risks and the fixes before you sign.",
    cta: "Check a contract",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2M9 11l1.6 1.6L13.5 9.5" />
      </svg>
    ),
  },
  {
    id: "verify",
    title: "Verify a copy",
    text: "Make sure the copy you were given is word for word the contract that was sealed.",
    cta: "Verify a copy",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
      </svg>
    ),
  },
  {
    id: "law",
    title: "Law library",
    text: "Browse the Indian law provisions Sandhi relies on, in plain words, with where each was checked.",
    cta: "Open the library",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
        <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: "1", title: "Tell Sandhi", text: "Speak or type, in English, Hindi or Telugu." },
  { n: "2", title: "Answer one question at a time", text: "No long forms. Sandhi asks, you answer, and it moves on." },
  { n: "3", title: "Get what you need", text: "A contract, a loophole check or clear steps, each tied to the law." },
];

export default function HomeView({ onOpen }: { onOpen: (id: FeatureId) => void }) {
  return (
    <div className="home">
      <section className="hero" aria-label="Welcome">
        <div className="hero-copy">
          <span className="hero-eyebrow">Indian law, in your own words</span>
          <h2 className="hero-title">Say it. Sandhi writes it, checks it and tells you what to do.</h2>
          <p className="hero-text">
            Draft a contract by talking, catch the loopholes before you sign, or get clear do and don&apos;t steps when
            something goes wrong. Every answer points to the law.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => onOpen("help")}>
              Get quick legal help
            </button>
            <button type="button" className="btn" onClick={() => onOpen("talk")}>
              Draft a contract
            </button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="cloud c1" />
          <span className="cloud c2" />
          <span className="cloud c3" />
          <div className="hero-badge">
            <strong>1 question</strong>
            <span>at a time</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-title">
        <div className="section-head">
          <h2 id="features-title">What do you need today?</h2>
          <p className="muted">Pick one. You can come back here any time.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              className="feature-card"
              data-feature={f.id}
              onClick={() => onOpen(f.id)}
              aria-label={f.title}
            >
              <span className="feature-icon">{f.icon}</span>
              <span className="feature-title">{f.title}</span>
              <span className="feature-text">{f.text}</span>
              <span className="feature-cta">
                {f.cta} <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="steps" aria-label="How it works">
        <h2>How it works</h2>
        <div className="step-row">
          {STEPS.map((s) => (
            <div key={s.n} className="step">
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p className="muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
