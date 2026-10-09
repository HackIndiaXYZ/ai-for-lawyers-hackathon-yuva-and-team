"use client";

import type { ConversationReply, LegalCheck } from "@/lib/ai/schemas";
import { SourceChips } from "@/components/SourceProvider";

export type Advice = NonNullable<ConversationReply["advice"]>;
export type Flag = ConversationReply["legal_flags"][number];

const STATUS_LABEL: Record<string, string> = {
  not_legal: "Not legal",
  unenforceable: "Unenforceable",
  risky: "Risky",
  lawful: "Lawful",
};

const STATUS_CLASS: Record<string, string> = {
  not_legal: "badge-bad",
  unenforceable: "badge-bad",
  risky: "badge-warn",
  lawful: "badge-ok",
};

/** A status badge. It always carries a word, so colour is never the only signal. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_CLASS[status] ?? "badge-warn"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function LegalAlertCard({ flag }: { flag: Flag }) {
  return (
    <aside className="note-card note-alert" aria-label="Legal alert">
      <div className="note-head">
        <StatusBadge status={flag.status} />
        <strong>{flag.issue}</strong>
      </div>
      <p>{flag.consequence}</p>
      <SourceChips ids={flag.sources} />
    </aside>
  );
}

export function AdviceCard({ advice }: { advice: Advice }) {
  return (
    <aside className="note-card" aria-label="Advice">
      <h3>{advice.headline}</h3>
      {advice.sections.length > 0 && (
        <>
          <h4>Laws that apply</h4>
          <ul className="note-list">
            {advice.sections.map((s, i) => (
              <li key={`${s.law}-${s.section}-${i}`}>
                <strong>
                  {s.law}, {s.section}
                </strong>{" "}
                {s.plain}{" "}
                {s.id ? (
                  <SourceChips ids={[s.id]} />
                ) : (
                  <span className="badge badge-warn">Check with an advocate</span>
                )}
                {s.id && s.confidence === "verify" && (
                  <span className="badge badge-warn">Verify</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {advice.consequences.length > 0 && (
        <>
          <h4>What can happen</h4>
          <ul className="note-list">
            {advice.consequences.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </>
      )}
      {advice.steps.length > 0 && (
        <>
          <h4>What to do now</h4>
          <ol className="note-list">
            {advice.steps.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </>
      )}
    </aside>
  );
}

export type LegalState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string; review: boolean }
  | { state: "done"; data: LegalCheck; review: boolean };

const VERDICT: Record<LegalCheck["verdict"], { label: string; cls: string }> = {
  "ready to sign": { label: "Ready to sign", cls: "badge-ok" },
  "fix before signing": { label: "Fix before signing", cls: "badge-warn" },
  "not legal as drafted": { label: "Not legal as drafted", cls: "badge-bad" },
};

export function LegalCheckPanel({ legal }: { legal: LegalState }) {
  if (legal.state === "idle") return null;
  return (
    <section className="card" aria-label="Legal check against Indian law" aria-live="polite">
      <h2>Legal check against Indian law</h2>
      {legal.state === "loading" && (
        <p className="muted">
          Checking every clause against the law library <span className="dots" aria-hidden="true"><i /><i /><i /></span>
        </p>
      )}
      {legal.state === "error" && (
        <>
          <p>{legal.message}</p>
          <ReviewBanner show={legal.review} />
        </>
      )}
      {legal.state === "done" && (
        <>
          <p>
            <span className={`badge ${VERDICT[legal.data.verdict].cls}`}>
              {VERDICT[legal.data.verdict].label}
            </span>{" "}
            {legal.data.headline}
          </p>
          <ReviewBanner show={legal.review} />
          <div className="litems">
            {legal.data.items.map((it, i) => (
              <div key={`${it.clause}-${i}`} className="litem">
                <div>
                  <StatusBadge status={it.status} /> <strong>{it.clause}</strong>
                </div>
                {it.consequence && <p>{it.consequence}</p>}
                <SourceChips ids={it.sources} />
              </div>
            ))}
          </div>
          {legal.data.requirements.length > 0 && (
            <>
              <h3>What must happen for it to hold up</h3>
              <div className="litems">
                {legal.data.requirements.map((q, i) => (
                  <div key={`${q.what}-${i}`} className="litem">
                    <p>{q.what}</p>
                    <SourceChips ids={q.sources} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

/** The human-review fallback: shown whenever the automatic check is not enough on its own. */
export function ReviewBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="review-banner" role="note">
      <strong>Please have an advocate review this before you sign.</strong> Sandhi is an
      assistant, not a lawyer, and this result needs a human check.
    </div>
  );
}
