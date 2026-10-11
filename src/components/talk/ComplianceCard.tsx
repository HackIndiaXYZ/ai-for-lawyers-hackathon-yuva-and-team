"use client";

import { useMemo } from "react";
import { checkDraft, type CheckItem, type CheckStatus } from "@/lib/rulebook";
import { SourceChips } from "../SourceProvider";
import { ReviewBanner } from "./cards";

const LABEL: Record<CheckStatus, { text: string; cls: string }> = {
  included: { text: "Included", cls: "badge-ok" },
  missing: { text: "Missing", cls: "badge-bad" },
  problem: { text: "Not allowed here", cls: "badge-bad" },
  confirm: { text: "You must check", cls: "badge-warn" },
};

const ORDER: CheckStatus[] = ["problem", "missing", "confirm", "included"];

function Row({ item }: { item: CheckItem }) {
  const l = LABEL[item.status];
  return (
    <li className="rule-item" data-status={item.status}>
      <div>
        <span className={`badge ${l.cls}`}>{l.text}</span> <strong>{item.title}</strong>
      </div>
      {item.status !== "included" && <p>{item.need}</p>}
      {item.note && <p className="rule-note">{item.note}</p>}
      <SourceChips ids={item.law} />
    </li>
  );
}

/**
 * Checks the finished draft against Sandhi's rulebook for this kind of document and lists what is in it,
 * what is missing, what the law does not allow, and what only the person can do (stamping, registration, tax).
 */
export default function ComplianceCard({
  contractType,
  draftText,
  drafting,
}: {
  contractType: string | null;
  draftText: string;
  drafting: boolean;
}) {
  const result = useMemo(() => (draftText && !drafting ? checkDraft(contractType, draftText) : null), [contractType, draftText, drafting]);
  if (!result) return null;

  const items = [...result.items].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  return (
    <section className="card rule-card" aria-label="Indian law checklist">
      <h2>Indian law checklist</h2>
      <p className="muted">
        Sandhi checked this draft against what Indian law expects of this kind of document.{" "}
        <strong>{result.included}</strong> in place
        {result.missing > 0 && <>, <strong>{result.missing}</strong> missing</>}
        {result.problem > 0 && <>, <strong>{result.problem}</strong> not allowed</>}
        {result.confirm > 0 && <>, <strong>{result.confirm}</strong> for you to check</>}.
      </p>
      <ReviewBanner show={result.needsReview} />
      <ul className="rule-list">
        {items.map((i) => (
          <Row key={i.id} item={i} />
        ))}
      </ul>
      <p className="muted">
        This is a checklist, not legal advice. Wording is matched automatically, so a clause can be present but still
        need a lawyer&apos;s eye.
      </p>
    </section>
  );
}
