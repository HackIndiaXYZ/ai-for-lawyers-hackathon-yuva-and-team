"use client";

/** The last safety net: used only if the page's own frame (layout) crashes. It carries its own plain styling. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#070b14",
          color: "#f3f4f8",
          fontFamily: "system-ui, sans-serif",
          padding: 16,
        }}
      >
        <main style={{ maxWidth: 480 }} role="alert">
          <h1 style={{ fontSize: "1.4rem" }}>Sandhi could not load</h1>
          <p>Sorry, something went wrong. Please try again. If it keeps happening, come back a little later.</p>
          <p>
            <strong>Please have an advocate review any contract before you sign it.</strong>
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ minHeight: 44, padding: "0 20px", borderRadius: 12, border: 0, fontSize: "1rem", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
