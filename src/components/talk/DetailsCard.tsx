"use client";

import { STAGES, type Stage } from "@/lib/ai/schemas";

export type Detail = { label: string; value: string };

export function stageNumber(stage: Stage | null): number {
  return stage ? STAGES.indexOf(stage) + 1 : 0;
}

export function InterviewProgress({ stage, ready }: { stage: Stage | null; ready: boolean }) {
  const n = ready ? 6 : stageNumber(stage);
  const pct = ready ? 100 : Math.round((n / 6) * 100);
  const label = ready
    ? "Interview complete, ready to draft"
    : n === 0
      ? "Interview not started"
      : `Interview step ${n} of 6: ${stage}`;
  return (
    <>
      <div className="muted" role="status">
        {label}
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={6}
        aria-valuenow={n}
        aria-label="Interview progress"
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

export default function DetailsCard({
  details,
  role,
  missing,
  flash,
}: {
  details: Record<string, Detail>;
  role: string | null;
  missing: string[];
  flash: string[];
}) {
  const entries = Object.entries(details);
  return (
    <>
      {role && (
        <p>
          You are the <strong>{role}</strong>.
        </p>
      )}
      {entries.length === 0 ? (
        <p className="empty">
          Nothing yet. Start talking and I&apos;ll note names, amounts and dates here.
        </p>
      ) : (
        <dl className="details">
          {entries.map(([key, d]) => (
            <div key={key} className={flash.includes(key) ? "detail flash" : "detail"}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {missing.length > 0 && (
        <>
          <h3 className="mini">Still needed</h3>
          <ul className="pill-list">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
