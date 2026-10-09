"use client";

import { useEffect } from "react";

/** Shown if something in the page crashes. It never shows technical details to the visitor. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Only the short reference goes to the console, never any contract text.
    console.error("Sandhi page error", error.digest ?? "no-reference");
  }, [error]);

  return (
    <main className="app">
      <section className="card" role="alert" aria-labelledby="err-title">
        <h2 id="err-title">Something went wrong on this page</h2>
        <p>
          Sorry. The page hit a problem and had to stop. Whatever you were typing on screen may be lost, but any
          contract you sealed is still saved on this device.
        </p>
        <div className="review-banner" role="note">
          <strong>Please have an advocate review any contract before you sign it.</strong> Sandhi is an assistant,
          not a lawyer.
        </div>
        <div className="btn-row wrap">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </div>
        {error.digest && <p className="muted small">Reference: {error.digest}</p>}
      </section>
    </main>
  );
}
