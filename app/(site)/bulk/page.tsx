import type { Metadata } from "next";
import BulkAudit from "./BulkAudit";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Bulk audit: check up to 20 pages at once",
  description: "Paste up to 20 URLs or upload a CSV and get SEO, answer engine and AI search scores for each, with the top issue. Download the results as CSV. Free.",
  alternates: { canonical: "/bulk" },
};

const FAQ = [
  { q: "What does a bulk audit check?", a: "Each URL gets the same checks as the main page check: about 50 checks across SEO, answer engines (AEO) and AI assistants (GEO). You get an overall score, the three category scores and the most important issue to fix for every page." },
  { q: "How many pages can I check at once?", a: "Up to 20. Paste them one per line, paste a column from a spreadsheet, or upload a CSV file and the URLs are picked out of it." },
  { q: "Can I download the results?", a: "Yes. Download a CSV with each page's final URL, scores, number of failed checks and warnings, and its top issue, ready for a spreadsheet or a client report." },
  { q: "When should I run a full site report instead?", a: "A full site report follows the links across your whole site, groups duplicate titles and pages AI can't read, and writes ready-to-paste fixes. Use a bulk audit when you already know which pages to check, such as landing pages or several clients' home pages." },
];

export default function Page() {
  return (
    <main>
      <PageHero kicker="Bulk audit" title={<>Check many pages at once.</>}>
        <p className="hero-sub">Paste up to 20 URLs, from your own site or your clients&apos;. Each one gets the same page check as the main audit.</p>
      </PageHero>
      <section className="section section-tight">
        <div className="container"><BulkAudit /></div>
      </section>
      <section className="section section-tight" aria-labelledby="bulk-faq">
        <div className="container bulk-faq">
          <h2 id="bulk-faq">Bulk audit questions</h2>
          {FAQ.map((f) => (
            <div key={f.q} className="bulk-qa">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
