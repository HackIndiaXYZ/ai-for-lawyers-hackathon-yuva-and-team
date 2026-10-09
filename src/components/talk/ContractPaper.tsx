"use client";

import { inlineParts, type ContractModel } from "@/lib/contract";
import { SourceChips } from "@/components/SourceProvider";

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === "bold" ? (
          <strong key={i}>{p.text}</strong>
        ) : p.kind === "blank" ? (
          <mark key={i} className="blank">
            fill in: {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function ContractPaper({
  model,
  hasText,
  drafting,
  showWhy,
  onToggleWhy,
}: {
  model: ContractModel;
  hasText: boolean;
  drafting: boolean;
  showWhy: boolean;
  onToggleWhy: (v: boolean) => void;
}) {
  return (
    <section aria-label="Contract preview">
      <div className="paper">
        <div className="paper-ribbon">
          <span>{model.title || "Your contract"}</span>
          <small>{drafting ? "Being written…" : "Not yet stamped or signed"}</small>
        </div>
        <div className="sheet" aria-busy={drafting}>
          {!hasText ? (
            <>
              <h3>AGREEMENT</h3>
              <p>
                Your contract will appear here, line by line, as soon as we have talked it
                through.
              </p>
            </>
          ) : (
            <>
              {model.title && <h3>{model.title}</h3>}
              {model.blocks.map((b, i) => {
                if (b.type === "heading") return <h4 key={i}>{b.text}</h4>;
                if (b.type === "para") {
                  return (
                    <p key={i}>
                      <Inline text={b.text} />
                    </p>
                  );
                }
                if (!showWhy) return null;
                return (
                  <p key={i} className="why">
                    <span>Why: {b.text}</span> <SourceChips ids={b.sources} />
                  </p>
                );
              })}
              {model.signs.length > 0 && (
                <div className="signs">
                  {model.signs.map((s, i) => (
                    <div key={i} className="sign">
                      <div className="sign-line" />
                      <span>
                        <Inline text={s} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {drafting && <span className="caret" aria-hidden="true" />}
            </>
          )}
        </div>
      </div>
      {hasText && (
        <label className="toggle">
          <input type="checkbox" checked={showWhy} onChange={(e) => onToggleWhy(e.target.checked)} />
          Show why each clause is there
        </label>
      )}
    </section>
  );
}

export function BeforeYouSign({ model }: { model: ContractModel }) {
  if (model.before.length === 0) return null;
  return (
    <section className="card" aria-label="Before you sign">
      <h2>Before you sign</h2>
      <ul className="note-list">
        {model.before.map((b, i) => (
          <li key={i}>
            {b.text} <SourceChips ids={b.sources} />
          </li>
        ))}
      </ul>
    </section>
  );
}
