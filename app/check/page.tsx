import { Suspense } from "react";
import type { Metadata } from "next";
import Auditor from "@/app/Auditor";
import PageHero from "@/components/PageHero";

// Results for someone's URL: useful to them, not to search engines.
export const metadata: Metadata = {
  title: "Your page check",
  description: "SEO, answer engine and AI search results for your page, with the fixes.",
  robots: { index: false, follow: true },
};

export default function CheckPage() {
  return (
    <main>
      <PageHero kicker="Page check" title={<>Your results</>} className="check-hero">
        <p className="hero-sub">About 50 checks for search engines, answer engines and AI assistants. Check another page any time.</p>
      </PageHero>
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
