"use client";

import { useEffect, useState } from "react";
import LawLibrary from "@/components/LawLibrary";
import CheckView from "@/components/check/CheckView";
import VerifyView, { type VerifyPrefill } from "@/components/verify/VerifyView";
import TalkView from "@/components/talk/TalkView";
import type { RedraftRequest } from "@/lib/review";
import { getMode, type ApiMode } from "@/lib/api";
import { SourceProvider } from "@/components/SourceProvider";

type Tab = "talk" | "check" | "verify" | "law";
type Lang = "en" | "hi" | "te";

const TABS: { id: Tab; label: string }[] = [
  { id: "talk", label: "Talk and draft" },
  { id: "check", label: "Check a contract" },
  { id: "verify", label: "Verify a copy" },
  { id: "law", label: "Law library" },
];

const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: "en", label: "EN", name: "English" },
  { id: "hi", label: "हिं", name: "Hindi" },
  { id: "te", label: "తె", name: "Telugu" },
];

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("talk");
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<ApiMode | "offline" | null>(null);
  const [redraft, setRedraft] = useState<RedraftRequest | null>(null);
  const [verifyFor, setVerifyFor] = useState<VerifyPrefill | null>(null);

  useEffect(() => {
    let alive = true;
    getMode().then((m) => {
      if (alive) setMode(m ?? "offline");
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SourceProvider>
      <main className="app">
        {mode === "demo" && (
          <div className="demo-banner" role="status">
            <span className="badge badge-warn">Demo mode</span>
            <span>Sample answers only, not real AI. The real AI will be switched on later.</span>
          </div>
        )}
        {mode === "offline" && (
          <div className="demo-banner" role="alert">
            <span className="badge badge-bad">Offline</span>
            <span>Could not reach the Sandhi server. Please refresh the page.</span>
          </div>
        )}

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

        {/* All four panels stay mounted, so a conversation is not lost when you switch tabs. */}
        <div role="tabpanel" id="panel-talk" aria-labelledby="tab-talk" hidden={tab !== "talk"}>
          <TalkView
            lang={lang}
            redraft={redraft}
            onVerify={(seal) => {
              setVerifyFor({ id: Date.now(), seal });
              setTab("verify");
            }}
          />
        </div>
        <div role="tabpanel" id="panel-check" aria-labelledby="tab-check" hidden={tab !== "check"}>
          <CheckView
            onRedraft={(r) => {
              setRedraft(r);
              setTab("talk");
            }}
          />
        </div>
        <div role="tabpanel" id="panel-verify" aria-labelledby="tab-verify" hidden={tab !== "verify"}>
          <VerifyView prefill={verifyFor} active={tab === "verify"} />
        </div>
        <div role="tabpanel" id="panel-law" aria-labelledby="tab-law" hidden={tab !== "law"}>
          <LawLibrary />
        </div>

        <footer className="footer">
          Sandhi is an assistant, not a lawyer. For high-value or disputed matters, speak to an advocate.
        </footer>
      </main>
    </SourceProvider>
  );
}
