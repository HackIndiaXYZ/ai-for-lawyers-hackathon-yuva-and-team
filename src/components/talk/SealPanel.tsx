"use client";

import { useEffect, useState } from "react";
import { postJson } from "@/lib/api";
import { copyToClipboard, downloadFile, fileSlug } from "@/lib/download";
import {
  createSeal,
  exportJson,
  exportText,
  groupHex,
  listBlanks,
  saveSeal,
  removeSeal,
  shortCode,
  type ObligationRow,
  type ObligationsOutcome,
  type SealRecord,
} from "@/lib/seal";
import type { LegalState } from "./cards";
import { ReviewBanner } from "./cards";

type Props = {
  draftText: string;
  drafted: boolean;
  drafting: boolean;
  legal: LegalState;
  seal: SealRecord | null;
  onSealed: (s: SealRecord) => void;
  onUnseal: () => void;
  onFill: (values: Record<string, string>) => void;
  onVerify: (s: SealRecord) => void;
  onPrint: () => void;
};

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function SealPanel(p: Props) {
  const { draftText, drafted, drafting, legal, seal } = p;
  const blanks = listBlanks(draftText);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"" | "seal" | "json">("");
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [obNote, setObNote] = useState(false);

  // Forget typed answers when the contract itself is replaced.
  useEffect(() => {
    setValues({});
    setMsg(null);
  }, [drafting]);

  if (!drafted || drafting || draftText.length < 40) return null;

  const legalOk = legal.state === "done" && legal.data.verdict === "ready to sign" && !legal.review;
  const filledCount = blanks.filter((b) => (values[b] ?? "").trim()).length;

  async function doSeal() {
    setBusy("seal");
    setMsg(null);
    try {
      const verdict = legal.state === "done" ? legal.data.verdict : null;
      const rec = await createSeal(draftText, verdict);
      const kept = saveSeal(rec);
      p.onSealed(rec);
      if (!kept) setMsg({ text: "Sealed. Your browser would not keep a copy on this device, so download the text file now.", bad: false });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "The seal could not be made. Please try again.", bad: true });
    } finally {
      setBusy("");
    }
  }

  function doUnseal() {
    if (seal) removeSeal(seal.id);
    setMsg(null);
    setObNote(false);
    p.onUnseal();
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  function downloadText() {
    if (!seal) return;
    const ok = downloadFile(`${fileSlug(seal.title)}-sealed.txt`, exportText(seal, origin), "text/plain");
    setMsg(ok ? { text: "Text file downloaded.", bad: false } : { text: "The download did not start. Use Copy sealed text instead.", bad: true });
  }

  async function downloadJson() {
    if (!seal) return;
    setBusy("json");
    setMsg(null);
    setObNote(false);
    const res = await postJson<ObligationRow[]>("/api/obligations", { contractType: null, text: seal.text });
    let outcome: ObligationsOutcome;
    if (res.ok && res.data.length > 0) {
      outcome = { status: "ok", mode: res.mode, items: res.data };
    } else {
      outcome = {
        status: "unavailable",
        reason: res.ok
          ? "No obligations could be read from this contract automatically. Read the contract text."
          : `Obligations could not be extracted: ${res.message}`,
      };
      setObNote(true);
    }
    const ok = downloadFile(`${fileSlug(seal.title)}-sealed.json`, exportJson(seal, outcome), "application/json");
    setBusy("");
    setMsg(
      ok
        ? {
            text:
              outcome.status === "ok"
                ? outcome.mode === "demo"
                  ? "JSON downloaded. In demo mode the obligations are samples, not read from your contract."
                  : "JSON downloaded."
                : "JSON downloaded with the contract and fingerprint, but without obligations.",
            bad: false,
          }
        : { text: "The download did not start. Please try again.", bad: true },
    );
  }

  async function copyText() {
    if (!seal) return;
    const ok = await copyToClipboard(seal.text);
    setMsg(ok ? { text: "Sealed text copied.", bad: false } : { text: "Your browser blocked copying. Use Download text file instead.", bad: true });
  }

  async function copyHash() {
    if (!seal) return;
    const ok = await copyToClipboard(seal.hash);
    setMsg(ok ? { text: "Fingerprint copied.", bad: false } : { text: "Your browser blocked copying. Select the fingerprint and copy it by hand.", bad: true });
  }

  /* ---------- sealed ---------- */
  if (seal) {
    return (
      <section className="card seal-card sealed" aria-label="Sealed contract">
        <div className="seal-head">
          <h2>Sealed</h2>
          <span className="badge badge-ok">Fingerprint made</span>
        </div>
        <p className="seal-code" aria-label="Short code">{shortCode(seal.hash)}</p>
        <p className="muted small">
          Sealed on {when(seal.sealedAt)} (your device&apos;s clock). Anyone with this fingerprint can check
          that a copy has the same words. If even one comma changes, the check fails.
        </p>
        <details className="seal-full">
          <summary>Show the full fingerprint (SHA-256)</summary>
          <p className="mono" data-testid="full-hash">{groupHex(seal.hash, 8)}</p>
          <button type="button" className="btn btn-small" onClick={() => void copyHash()}>Copy fingerprint</button>
        </details>

        {!legalOk && (
          <>
            <ReviewBanner show />
            <p className="muted small">
              {legal.state === "done"
                ? `The legal check said "${legal.data.verdict}". Sealing does not fix that.`
                : "The legal check did not finish. Sealing does not replace it."}
            </p>
          </>
        )}

        <div className="btn-row wrap">
          <button type="button" className="btn btn-primary" onClick={p.onPrint}>Print or save as PDF</button>
          <button type="button" className="btn" onClick={downloadText}>Download text file</button>
          <button type="button" className="btn" onClick={() => void downloadJson()} disabled={busy === "json"}>
            {busy === "json" ? "Preparing…" : "Download JSON for smart contracts"}
          </button>
          <button type="button" className="btn" onClick={() => void copyText()}>Copy sealed text</button>
          <button type="button" className="btn" onClick={() => p.onVerify(seal)}>Verify a copy</button>
        </div>
        {obNote && <ReviewBanner show />}
        <p className="seal-msg" role="status" data-bad={msg?.bad ? "true" : undefined}>{msg?.text ?? ""}</p>

        <p className="muted small">
          To save a PDF, choose <strong>Save as PDF</strong> as the printer. This seal proves the words have not
          changed. It is <strong>not</strong> a signature, an e-stamp or a registration. Those are still needed
          where the law requires them.
        </p>
        <p className="linkrow">
          <button type="button" className="linkbtn" onClick={doUnseal}>Remove the seal to edit the contract</button>
        </p>
      </section>
    );
  }

  /* ---------- not sealed yet ---------- */
  return (
    <section className="card seal-card" aria-label="Seal the contract">
      <h2>Seal this contract</h2>

      {blanks.length > 0 ? (
        <>
          <p>
            {blanks.length === 1 ? "1 detail is" : `${blanks.length} details are`} still missing. Fill them in,
            then you can seal the contract.
          </p>
          <div className="blank-form">
            {blanks.map((b) => (
              <label key={b} className="field">
                <span>{b}</span>
                <input
                  type="text"
                  value={values[b] ?? ""}
                  maxLength={200}
                  autoComplete="off"
                  onChange={(e) => setValues((v) => ({ ...v, [b]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="btn-row wrap">
            <button
              type="button"
              className="btn btn-primary"
              disabled={filledCount === 0}
              onClick={() => {
                p.onFill(values);
                setValues({});
              }}
            >
              Fill these in{filledCount > 0 ? ` (${filledCount})` : ""}
            </button>
          </div>
        </>
      ) : (
        <p>
          Sealing makes a fingerprint (SHA-256) of the exact words above. Later, anyone can paste a copy and see
          at once whether a single word was changed. Read the contract and the legal check before you seal.
        </p>
      )}

      <div className="btn-row wrap">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void doSeal()}
          disabled={blanks.length > 0 || busy === "seal"}
          title={blanks.length > 0 ? "Fill in the missing details first" : undefined}
        >
          {busy === "seal" ? "Sealing…" : "Seal this contract"}
        </button>
      </div>
      {legal.state === "loading" && <p className="muted small">The legal check is still running. You can wait for it before you seal.</p>}
      <p className="seal-msg" role="status" data-bad={msg?.bad ? "true" : undefined}>{msg?.text ?? ""}</p>
    </section>
  );
}
