"use client";

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <PageHero kicker="Something went wrong" title={<>That didn&apos;t work</>}>
        <p className="hero-sub">An error stopped this page from loading. Trying again usually fixes it.</p>
        <div className="center-actions">
          <button className="btn btn-primary" onClick={() => reset()}>Try again <ArrowRight size={16} aria-hidden="true" /></button>
          <a className="btn btn-ghost" href="/">Go to the home page</a>
        </div>
      </PageHero>
    </main>
  );
}
