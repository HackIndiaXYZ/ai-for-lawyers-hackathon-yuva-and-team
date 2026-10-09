"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { inlineParts, type ContractModel } from "@/lib/contract";
import { groupHex, shortCode, type SealRecord } from "@/lib/seal";

function Plain({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === "bold" ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.kind === "blank" ? `[ ______ ${p.text} ]` : p.text}</span>,
      )}
    </>
  );
}

/**
 * The page that gets printed. It lives directly under <body>, hidden on screen, and the print stylesheet
 * hides everything else, so "Save as PDF" produces only the contract and its seal.
 */
export default function PrintSheet({ model, seal }: { model: ContractModel; seal: SealRecord | null }) {
  // False while the server builds the page, true once it is running in the browser.
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!inBrowser) return null;

  return createPortal(
    <div id="print-root" aria-hidden="true">
      <article className="print-sheet">
        {model.title && <h1>{model.title}</h1>}
        {model.blocks.map((b, i) => {
          if (b.type === "heading") return <h2 key={i}>{b.text}</h2>;
          if (b.type === "para") {
            return (
              <p key={i}>
                <Plain text={b.text} />
              </p>
            );
          }
          return null; // the "why" notes are for reading on screen, not for the signed copy
        })}
        {model.signs.length > 0 && (
          <div className="print-signs">
            {model.signs.map((s, i) => (
              <div key={i}>
                <div className="print-line" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
        {seal && (
          <footer className="print-seal">
            <strong>Sandhi seal {shortCode(seal.hash)}</strong>
            <span>SHA-256: {groupHex(seal.hash, 8)}</span>
            <span>
              Sealed {seal.sealedAt} (device clock). Check a copy at {typeof window !== "undefined" ? window.location.origin : ""} under
              &ldquo;Verify a copy&rdquo;. The seal proves the words are unchanged; it is not a signature or an e-stamp.
            </span>
          </footer>
        )}
      </article>
    </div>,
    document.body,
  );
}
