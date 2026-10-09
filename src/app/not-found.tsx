import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app">
      <section className="card" aria-labelledby="nf-title">
        <h2 id="nf-title">That page does not exist</h2>
        <p>The address may be mistyped, or the page may have moved.</p>
        <p>
          <Link className="btn btn-primary" href="/">
            Go to Sandhi
          </Link>
        </p>
      </section>
    </main>
  );
}
