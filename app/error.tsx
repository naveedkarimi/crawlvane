"use client";

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="kicker kicker-center">Something went wrong</div>
          <h1>That didn&apos;t work</h1>
          <p className="lead">An error stopped this page from loading. Trying again usually fixes it.</p>
          <div className="center-actions">
            <button className="btn btn-primary" onClick={() => reset()}>Try again <ArrowRight size={16} aria-hidden="true" /></button>
            <a className="btn btn-ghost" href="/">Go to the home page</a>
          </div>
        </div>
      </section>
    </main>
  );
}
