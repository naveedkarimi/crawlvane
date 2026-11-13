import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import { listSamples } from "@/lib/samples";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sample reports",
  description: `Real ${BRAND.name} full site reports, published with each site owner's permission: scores, issues and the fixes.`,
  alternates: { canonical: "/examples" },
};

export default async function ExamplesPage() {
  const samples = await listSamples().catch(() => []);
  return (
    <main>
      <PageHero kicker="Sample reports" title="Real reports, shared with permission.">
        <p className="hero-sub">Full site reports on real websites, published with each owner&apos;s permission. Open one to see the scores, the issues and the fixes.</p>
      </PageHero>
      <section className="section section-tight">
        <div className="container">
          {samples.length ? (
            <div className="sample-grid">
              {samples.map((s) => (
                <a key={s.reportId} className="card sample-card" href={`/report/${s.reportId}`}>
                  <div className="sample-head">
                    <span className="mono muted small">{s.site}</span>
                    {s.score !== null && <span className="sample-score">{s.score}</span>}
                  </div>
                  <h2>{s.title}</h2>
                  {s.summary && <p className="muted">{s.summary}</p>}
                  <span className="sample-open">Open the report <ArrowRight size={14} aria-hidden="true" /></span>
                </a>
              ))}
            </div>
          ) : (
            <div className="card dash-empty">
              <h2>No sample reports published yet</h2>
              <p className="muted">Run a free audit on your own site to see what a report looks like.</p>
              <a className="btn btn-primary" href="/#audit">Run a free audit <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
