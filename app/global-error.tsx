"use client";

import "./globals.css";

/** Replaces the whole page when the main layout itself fails. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main>
          <section className="page-hero">
            <div className="container">
              <h1>That didn&apos;t work</h1>
              <p className="lead">An error stopped the site from loading. Trying again usually fixes it.</p>
              <div className="center-actions">
                <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
