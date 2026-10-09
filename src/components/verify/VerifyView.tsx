"use client";

import { useEffect, useRef, useState } from "react";
import { shortCode, loadSeals, removeSeal, verifyCopy, type SealRecord, type VerifyResult } from "@/lib/seal";

export type VerifyPrefill = { id: number; seal: SealRecord };

const MAX_FILE = 500_000;

export default function VerifyView({ prefill, active = true }: { prefill: VerifyPrefill | null; active?: boolean }) {
  const [kept, setKept] = useState<SealRecord[]>([]);
  const [pick, setPick] = useState("");
  const [fp, setFp] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [fileMsg, setFileMsg] = useState("");
  const handled = useRef(0);

  // Seals are made and removed on the other tab, so look again every time this tab is opened.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (active) setKept(loadSeals());
  }

  useEffect(() => {
    if (!prefill || handled.current === prefill.id) return;
    handled.current = prefill.id;
    setKept(loadSeals());
    setPick(prefill.seal.id);
    setFp(prefill.seal.hash);
    setText("");
    setResult(null);
    setFileMsg("");
  }, [prefill]);

  const picked = kept.find((s) => s.id === pick) ?? (prefill && prefill.seal.id === pick ? prefill.seal : null);

  function onPick(id: string) {
    setPick(id);
    setResult(null);
    const s = kept.find((k) => k.id === id);
    if (s) setFp(s.hash);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileMsg("");
    if (file.size > MAX_FILE) {
      setFileMsg("That file is too large. Please choose the .txt or .json file that Sandhi exported.");
      return;
    }
    if (!/\.(txt|json|md)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setFileMsg("Please choose a .txt or .json file. For a PDF, copy the words out of it and paste them instead.");
      return;
    }
    try {
      setText(await file.text());
      setResult(null);
      setFileMsg(`Loaded ${file.name}.`);
    } catch {
      setFileMsg("That file could not be read.");
    }
  }

  async function check() {
    setBusy(true);
    try {
      setResult(await verifyCopy(text, fp, picked && fp.replace(/[\s\-:]/g, "").toLowerCase() === picked.hash ? picked.text : null));
    } catch (e) {
      setResult({ state: "invalid", message: e instanceof Error ? e.message : "The check could not run. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function forget(id: string) {
    removeSeal(id);
    setKept(loadSeals());
    if (pick === id) {
      setPick("");
      setFp("");
      setResult(null);
    }
  }

  return (
    <div className="grid2 verify">
      <section className="card" aria-label="Verify a copy">
        <h2>Verify a copy</h2>
        <p className="muted">
          Got a copy of a sealed contract and want to know if it is word-for-word the same? Paste it here with the
          fingerprint. Even one changed word, figure or comma will be caught.
        </p>

        {kept.length > 0 && (
          <label className="field">
            <span>Use a contract you sealed on this device</span>
            <select value={pick} onChange={(e) => onPick(e.target.value)}>
              <option value="">Type a fingerprint instead</option>
              {kept.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · {shortCode(s.hash)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>Fingerprint (64 characters) or short code (16)</span>
          <input
            type="text"
            value={fp}
            onChange={(e) => {
              setFp(e.target.value);
              setResult(null);
            }}
            placeholder="For example 7120-B099-1B57-DA5B"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="field">
          <span>The copy you were given</span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            placeholder="Paste the contract words here, or load the .txt or .json file below."
            spellCheck={false}
          />
        </label>

        <div className="btn-row wrap">
          <label className="btn file-btn">
            Load a file
            <input type="file" accept=".txt,.json,.md,text/plain,application/json" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void check()} disabled={busy || !fp.trim() || !text.trim()}>
            {busy ? "Checking…" : "Check this copy"}
          </button>
        </div>
        <p className="muted small" role="status">{fileMsg}</p>
        <p className="muted small">
          Tip: the exported <strong>text</strong> or <strong>JSON</strong> file always verifies. A PDF is for printing and
          signing, so copying words out of a PDF can add stray characters.
        </p>
      </section>

      <div className="stack">
        {result && <Result r={result} />}
        {kept.length > 0 && (
          <section className="card" aria-label="Contracts sealed on this device">
            <h2>Sealed on this device</h2>
            <p className="muted small">Kept only in this browser. Nothing is uploaded.</p>
            <ul className="note-list">
              {kept.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong> <span className="mono">{shortCode(s.hash)}</span>
                  <br />
                  <button type="button" className="linkbtn" onClick={() => forget(s.id)}>Forget this one</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Result({ r }: { r: VerifyResult }) {
  if (r.state === "invalid") {
    return (
      <section className="card verdict" role="alert" aria-label="Result">
        <h2>Cannot check yet</h2>
        <p>{r.message}</p>
      </section>
    );
  }
  if (r.state === "match") {
    return (
      <section className="card verdict verdict-ok" role="status" aria-label="Result">
        <h2><span className="badge badge-ok">Exact match</span> Same words</h2>
        <p>
          This copy has exactly the words that were sealed.
          {r.strength === "short" && " You used the short code, which is a quick check. Use the full fingerprint for a stronger one."}
        </p>
        <p className="muted small">A match does not make the contract legal. It only means nothing was changed after sealing.</p>
      </section>
    );
  }
  return (
    <section className="card verdict verdict-bad" role="alert" aria-label="Result">
      <h2><span className="badge badge-bad">Does not match</span> The words are different</h2>
      <p>
        This copy is <strong>not</strong> the sealed contract. Do not sign it. Ask for the original, and have an
        advocate look at it if it matters.
      </p>
      {r.diff ? (
        <>
          <h3>What is different</h3>
          <ul className="diff" aria-label="Differences">
            {r.diff
              .filter((d) => d.kind !== "same")
              .map((d, i) => (
                <li key={i} data-kind={d.kind}>
                  <span className="diff-tag">{d.kind === "removed" ? "Sealed said" : "Your copy says"}</span> {d.text}
                </li>
              ))}
          </ul>
        </>
      ) : (
        <p className="muted small">
          Sandhi cannot show what changed because the sealed words are not on this device. Compare it with the
          original by eye.
        </p>
      )}
    </section>
  );
}
