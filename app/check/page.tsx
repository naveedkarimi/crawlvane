import { Suspense } from "react";
import type { Metadata } from "next";
import Auditor from "@/app/Auditor";

// Results for someone's URL: useful to them, not to search engines.
export const metadata: Metadata = {
  title: "Your page check",
  description: "SEO, answer engine and AI search results for your page, with the fixes.",
  robots: { index: false, follow: true },
};

export default function CheckPage() {
  return (
    <main>
      <section className="page-hero check-hero">
        <div className="container">
          <div className="kicker kicker-center">Page check</div>
          <h1>Your results</h1>
          <p className="lead">About 50 checks for search engines, answer engines and AI assistants. Check another page any time.</p>
        </div>
      </section>
      <section className="section section-tight check-body">
        <div className="container">
          <div className="tool check-tool" id="audit">
            <Suspense fallback={<div className="tool-fallback" />}>
              <Auditor />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
