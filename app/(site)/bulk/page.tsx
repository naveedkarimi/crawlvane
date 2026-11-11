import type { Metadata } from "next";
import BulkAudit from "./BulkAudit";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Bulk audit: check up to 20 pages at once",
  description: "Paste up to 20 URLs or upload a CSV and get SEO, answer engine and AI search scores for each, with the top issue. Download the results as CSV. Free.",
  alternates: { canonical: "/bulk" },
};

export default function Page() {
  return (
    <main>
      <PageHero kicker="Bulk audit" title={<>Check many pages at once.</>}>
        <p className="hero-sub">Paste up to 20 URLs, from your own site or your clients&apos;. Each one gets the same page check as the main audit.</p>
      </PageHero>
      <section className="section section-tight">
        <div className="container"><BulkAudit /></div>
      </section>
    </main>
  );
}
