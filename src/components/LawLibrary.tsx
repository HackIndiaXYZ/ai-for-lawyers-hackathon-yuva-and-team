"use client";

import { useMemo, useState } from "react";
import { ACT_ORDER } from "@/data/lawLibrary";
import { ACTS, LAW_LIBRARY, fullReference, type LawEntry } from "@/lib/law";
import { SourceChip } from "@/components/SourceProvider";

function haystack(e: LawEntry): string {
  return [
    e.id,
    ACTS[e.act].full,
    ACTS[e.act].chip,
    e.section,
    e.title,
    e.summary,
    e.consequence,
    e.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

const INDEX = LAW_LIBRARY.map((e) => ({ entry: e, text: haystack(e) }));
const VERIFY_COUNT = LAW_LIBRARY.filter((e) => e.verify).length;

export default function LawLibrary() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return LAW_LIBRARY;
    return INDEX.filter((r) => words.every((w) => r.text.includes(w))).map((r) => r.entry);
  }, [query]);

  const groups = useMemo(
    () =>
      ACT_ORDER.map((act) => ({
        act,
        entries: results.filter((e) => e.act === act),
      })).filter((g) => g.entries.length > 0),
    [results],
  );

  return (
    <div className="stack">
      <section className="card" aria-label="About the law library">
        <h2>Law library</h2>
        <p className="muted">
          {LAW_LIBRARY.length} provisions of Indian law that Sandhi can cite. This is a summary,
          not the statute book, and it is not updated live. {VERIFY_COUNT} entries carry a
          &ldquo;Verify&rdquo; tag because they have not yet been checked against the official
          text.
        </p>
        <label className="law-search">
          <span className="sr-only">Search the law library</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by word, for example deposit, notice or non-compete"
          />
        </label>
        <p className="muted" role="status" aria-live="polite">
          Showing {results.length} of {LAW_LIBRARY.length} provisions
        </p>
      </section>

      {groups.length === 0 && (
        <section className="card">
          <p className="empty">
            No provision matches &ldquo;{query}&rdquo;. Try a shorter word, such as &ldquo;rent&rdquo;
            or &ldquo;notice&rdquo;.
          </p>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.act} className="card" aria-labelledby={`act-${g.act}`}>
          <h2 id={`act-${g.act}`}>{ACTS[g.act].full}</h2>
          <div className="law-list">
            {g.entries.map((e) => (
              <article key={e.id} className="law-entry">
                <div className="law-head">
                  <SourceChip id={e.id} />
                  <h3>{e.title}</h3>
                  {e.verify && <span className="badge badge-warn">Verify</span>}
                </div>
                <p className="law-ref">{fullReference(e)}</p>
                <p>{e.summary}</p>
                <p>
                  <strong>What can happen:</strong> {e.consequence}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
