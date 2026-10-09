"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { CONTRACT_TYPES, guessType } from "@/lib/law";
import { shrinkImage, type PickedImage } from "@/lib/images";
import {
  buildRedraftExtra,
  sortFindings,
  streamReview,
  type RedraftRequest,
  type ReviewLine,
} from "@/lib/review";
import { MAX_IMAGES } from "@/lib/ai/schemas";
import type { ReviewBrief, ReviewFinding, ReviewMeta, ReviewMissing } from "@/lib/ai/schemas";
import { SourceChips } from "@/components/SourceProvider";
import { ReviewBanner, StatusBadge } from "@/components/talk/cards";
import { FLAWED_SAMPLE } from "./sample";

interface Report {
  running: boolean;
  error: string | null;
  review: boolean; // needs a human advocate
  brief: ReviewBrief | null;
  meta: ReviewMeta | null;
  findings: ReviewFinding[];
  missing: ReviewMissing[];
  text: string;
  role: string;
}

const EMPTY: Report = {
  running: false,
  error: null,
  review: false,
  brief: null,
  meta: null,
  findings: [],
  missing: [],
  text: "",
  role: "",
};

const SEVERITY_LABEL = { high: "High risk", medium: "Medium risk", low: "Low risk" } as const;
const SEVERITY_CLASS = { high: "badge-bad", medium: "badge-warn", low: "badge-ok" } as const;

function scoreInfo(score: number): { label: string; cls: string } {
  if (score >= 75) return { label: "Fairly safe", cls: "ok" };
  if (score >= 45) return { label: "Needs care", cls: "warn" };
  return { label: "Risky to sign", cls: "bad" };
}

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const info = scoreInfo(score);
  return (
    <div className={`ring ring-${info.cls}`} role="img" aria-label={`Safety score ${Math.round(score)} out of 100: ${info.label}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring-text">
        <strong>{Math.round(score)}</strong>
        <span>{info.label}</span>
      </div>
    </div>
  );
}

function BriefCard({ brief }: { brief: ReviewBrief }) {
  return (
    <section className="card" aria-label="Brief of the document">
      <h2>What this document is{brief.type ? `: ${brief.type}` : ""}</h2>
      <p>{brief.summary}</p>
      {brief.parties.length > 0 && (
        <>
          <h3 className="mini">Who it is between</h3>
          <ul className="pill-list">
            {brief.parties.map((p, i) => (
              <li key={`${p}-${i}`}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {brief.key_terms.length > 0 && (
        <>
          <h3 className="mini">Key terms</h3>
          <dl className="details">
            {brief.key_terms.map((t, i) => (
              <div key={`${t.label}-${i}`} className="detail">
                <dt>{t.label}</dt>
                <dd>{t.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {brief.obligations.length > 0 && (
        <>
          <h3 className="mini">Who must do what</h3>
          <ul className="note-list">
            {brief.obligations.map((o, i) => (
              <li key={i}>
                <strong>{o.party}:</strong> {o.duty}
              </li>
            ))}
          </ul>
        </>
      )}
      {brief.unclear.length > 0 && (
        <>
          <h3 className="mini">Blank or unclear</h3>
          <ul className="note-list">
            {brief.unclear.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </>
      )}
      {brief.legal_notes.length > 0 && (
        <>
          <h3 className="mini">Legal standing under Indian law</h3>
          <div className="litems">
            {brief.legal_notes.map((n, i) => (
              <div key={`${n.point}-${i}`} className="litem">
                <div>
                  <StatusBadge status={n.status} /> <strong>{n.point}</strong>
                </div>
                {n.consequence && <p>{n.consequence}</p>}
                <SourceChips ids={n.sources} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button type="button" className="btn btn-small" onClick={copy}>
      {state === "done" ? "Copied" : state === "failed" ? "Select and copy by hand" : "Copy"}
    </button>
  );
}

function FindingCard({ f }: { f: ReviewFinding }) {
  return (
    <article className="finding">
      <div className="finding-head">
        <span className={`badge ${SEVERITY_CLASS[f.severity]}`}>{SEVERITY_LABEL[f.severity]}</span>
        <StatusBadge status={f.status} />
        <h3>{f.title}</h3>
      </div>
      {f.clause && <blockquote className="quote">{f.clause}</blockquote>}
      {f.issue && (
        <p>
          <strong>The loophole:</strong> {f.issue}
        </p>
      )}
      {f.risk && (
        <p>
          <strong>What could go wrong:</strong> {f.risk}
        </p>
      )}
      {f.consequence && (
        <p>
          <strong>Under Indian law:</strong> {f.consequence}
        </p>
      )}
      <SourceChips ids={f.sources} />
      {f.law && (
        <p className="muted">
          Also relevant: {f.law} <span className="badge badge-warn">Verify</span>
        </p>
      )}
      {f.fix && (
        <div className="fix">
          <div className="fix-head">
            <strong>Safer wording</strong>
            <CopyButton text={f.fix} />
          </div>
          <p>{f.fix}</p>
        </div>
      )}
    </article>
  );
}

export default function CheckView({ onRedraft }: { onRedraft: (r: RedraftRequest) => void }) {
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [notice, setNotice] = useState("");
  const [redraftType, setRedraftType] = useState("");

  const ctl = useRef<AbortController | null>(null);
  const redraftId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      ctl.current?.abort();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const say = useCallback((m: string) => {
    setNotice(m);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 6000);
  }, []);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (file.type === "application/pdf" || lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) {
        say("PDF and Word files cannot be read yet. Please paste the text, or photograph the pages.");
        continue;
      }
      if (file.type.startsWith("image/")) {
        if (images.length >= MAX_IMAGES) {
          say(`You can add up to ${MAX_IMAGES} photos. Remove one to add another.`);
          continue;
        }
        try {
          const picked = await shrinkImage(file);
          setImages((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, picked]));
        } catch (err) {
          say(err instanceof Error ? err.message : "That photo could not be added.");
        }
        continue;
      }
      if (file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
        if (file.size > 200_000) {
          say("That text file is too large. Please paste the part you want checked.");
          continue;
        }
        const body = await file.text();
        setText((prev) => (prev ? `${prev}\n\n${body}` : body).slice(0, 60000));
        continue;
      }
      say("That file type is not supported. Use a photo, a .txt file, or paste the text.");
    }
  }

  const run = useCallback(async () => {
    const cleanText = text.trim();
    if (cleanText.length < 20 && images.length === 0) {
      say("Paste the contract text, or add a photo of it, first.");
      return;
    }
    const controller = new AbortController();
    ctl.current?.abort();
    ctl.current = controller;
    const base: Report = { ...EMPTY, running: true, text: cleanText, role: role.trim() };
    setReport(base);

    const apply = (line: ReviewLine) => {
      setReport((p) => {
        if (!p || ctl.current !== controller) return p;
        if (line.kind === "brief") return { ...p, brief: line.value };
        if (line.kind === "meta") return { ...p, meta: line.value };
        if (line.kind === "finding") return { ...p, findings: [...p.findings, line.value] };
        return { ...p, missing: [...p.missing, line.value] };
      });
    };

    const res = await streamReview(
      {
        text: cleanText,
        role: role.trim() || null,
        images: images.map((i) => ({ mediaType: i.mediaType, data: i.data })),
      },
      apply,
      controller.signal,
    );
    if (ctl.current !== controller) return; // a newer run took over
    ctl.current = null;

    setReport((p) => {
      if (!p) return p;
      if (!res.ok) {
        if (res.code === "aborted") return { ...p, running: false };
        const partial = p.brief || p.findings.length > 0;
        return {
          ...p,
          running: false,
          error: partial
            ? `The check stopped part-way. ${res.message} What arrived is shown below, but it is incomplete.`
            : res.message,
          review: true,
        };
      }
      // Human-review fallback: an incomplete or non-clean answer should be seen by an advocate.
      const complete = Boolean(p.brief && p.meta);
      const clean = p.meta?.legal_verdict === "lawful" && p.findings.length === 0;
      return {
        ...p,
        running: false,
        error: complete ? null : "The answer arrived incomplete, so treat it with care.",
        review: !complete || !clean,
      };
    });
  }, [text, role, images, say]);

  function stop() {
    ctl.current?.abort();
  }

  const findings = useMemo(() => sortFindings(report?.findings ?? []), [report?.findings]);
  const guessed = useMemo(
    () => (report ? (report.meta?.type && CONTRACT_TYPES.some((t) => t.name === report.meta?.type) ? report.meta.type : (guessType(report.text) ?? "")) : ""),
    [report],
  );
  const chosenType = redraftType || guessed;
  const canRedraft = Boolean(report && !report.running && report.text.length >= 20 && (findings.length > 0 || report.missing.length > 0));

  function redraft() {
    if (!report || !chosenType) return;
    redraftId.current += 1;
    onRedraft({
      id: redraftId.current,
      contractType: chosenType,
      userRole: report.role ? report.role.replace(/^the\s+/i, "").slice(0, 80) : null,
      extra: buildRedraftExtra(report.text, report.findings, report.missing),
    });
  }

  const running = report?.running ?? false;

  return (
    <div className="grid2">
      <section className="card" aria-label="The contract to check">
        <h2>Check a contract</h2>
        <p className="muted">
          Paste a contract, or add a photo of it. Sandhi will explain it in plain words and find the
          loopholes.
        </p>

        <label className="field">
          <span>Contract text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={11}
            maxLength={60000}
            placeholder="Paste the full contract here…"
            disabled={running}
          />
        </label>

        {images.length > 0 && (
          <ul className="thumbs" aria-label="Attached photos">
            {images.map((img, i) => (
              <li key={`${img.name}-${i}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt={`Photo ${i + 1} of the contract`} />
                <button
                  type="button"
                  className="thumb-x"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => setImages((p) => p.filter((_, k) => k !== i))}
                  disabled={running}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*,.txt,.md,text/plain,.pdf,.doc,.docx"
          multiple
          hidden
          onChange={onFiles}
          aria-label="Add a photo or text file"
        />
        <div className="btn-row wrap">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={running}>
            Add photo or text file
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setText(FLAWED_SAMPLE);
              setRole("the tenant");
            }}
            disabled={running}
          >
            Load a flawed sample
          </button>
        </div>

        <label className="field">
          <span>Which side are you on? (optional)</span>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="for example: the tenant"
            maxLength={100}
            disabled={running}
          />
        </label>

        <div className="btn-row wrap">
          <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={running}>
            {running ? "Checking…" : "Find the loopholes"}
          </button>
          {running && (
            <button type="button" className="btn" onClick={stop}>
              Stop
            </button>
          )}
        </div>
        <div className="caption" aria-live="polite">
          {notice}
        </div>
      </section>

      <div className="stack" aria-live="polite">
        {!report && (
          <section className="card">
            <h2>Your report will appear here</h2>
            <p className="empty">
              You will get a plain-language brief, a safety score, each risky clause with safer
              wording, and a list of protections that are missing.
            </p>
          </section>
        )}

        {report?.error && (
          <section className="note-card note-error" role="alert">
            <p>{report.error}</p>
          </section>
        )}
        {report && <ReviewBanner show={report.review && !report.running} />}

        {report?.running && !report.brief && (
          <section className="card">
            <p className="muted">
              Reading your contract <span className="dots" aria-hidden="true"><i /><i /><i /></span>
            </p>
          </section>
        )}

        {report?.brief && <BriefCard brief={report.brief} />}

        {report?.meta && (
          <section className="card score" aria-label="Safety score">
            <ScoreRing score={report.meta.safety_score} />
            <div>
              <h2>{report.meta.headline || "Safety score"}</h2>
              {report.meta.legal_verdict && (
                <p>
                  <strong>Legal standing:</strong> {report.meta.legal_verdict}
                </p>
              )}
              <p className="muted">Higher is safer for the reader.</p>
            </div>
          </section>
        )}

        {findings.length > 0 && (
          <section className="card" aria-label="Findings">
            <h2>
              {findings.length} clause{findings.length === 1 ? "" : "s"} to look at
            </h2>
            <div className="findings">
              {findings.map((f, i) => (
                <FindingCard key={`${f.title}-${i}`} f={f} />
              ))}
            </div>
          </section>
        )}

        {report && report.missing.length > 0 && (
          <section className="card" aria-label="Missing protections">
            <h2>Protections that are missing</h2>
            <ul className="note-list">
              {report.missing.map((m, i) => (
                <li key={`${m.clause}-${i}`}>
                  <strong>{m.clause}.</strong> {m.why}
                </li>
              ))}
            </ul>
          </section>
        )}

        {report && !report.running && report.meta && findings.length === 0 && (
          <section className="card">
            <p>
              No risky clauses were found. That does not make the contract safe: Sandhi is an
              assistant, not a lawyer, so have an advocate read anything important.
            </p>
          </section>
        )}

        {report && !report.running && report.meta && (
          <section className="card" aria-label="Redraft">
            <h2>Want a safer version?</h2>
            {report.text.length < 20 ? (
              <p className="muted">
                A rewrite needs the contract as text. Paste the text above and run the check again.
              </p>
            ) : (
              <>
                <p className="muted">
                  Sandhi will rewrite the whole contract with these fixes, keeping your amounts,
                  names and dates. It opens in the Talk and draft tab.
                </p>
                <div className="controls">
                  <label className="field">
                    <span>Contract type</span>
                    <select value={chosenType} onChange={(e) => setRedraftType(e.target.value)}>
                      <option value="">Choose a contract type</option>
                      {CONTRACT_TYPES.map((t) => (
                        <option key={t.code} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={redraft}
                    disabled={!canRedraft || !chosenType}
                    title={chosenType ? undefined : "Choose a contract type first"}
                  >
                    Redraft the contract with these fixes
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
