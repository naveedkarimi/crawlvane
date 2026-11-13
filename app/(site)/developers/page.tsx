import type { Metadata } from "next";
import { BRAND, contactLink } from "@/lib/brand";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: `${BRAND.name} API`,
  description: `Run ${BRAND.name}'s SEO, answer engine and AI search page audit from your own code. One endpoint, JSON results.`,
  alternates: { canonical: "/developers" },
};

const curl = `curl -H "Authorization: Bearer YOUR_KEY" \\
  "${BRAND.url}/api/v1/audit?url=example.com"`;

const sample = `{
  "url": "example.com",
  "finalUrl": "https://example.com/",
  "auditedAt": "2026-11-06T10:00:00.000Z",
  "scores": { "overall": 72, "seo": 81, "aeo": 58, "geo": 69 },
  "checks": [
    {
      "id": "title", "category": "seo", "group": "Titles & meta",
      "title": "Title tag", "status": "pass", "weight": 3,
      "detail": "\\"Example Domain\\" (14 chars)"
    }
  ],
  "facts": { "status": 200, "title": "Example Domain", "wordCount": 28, "bots": [] }
}`;

export default function Page() {
  return (
    <main>
      <PageHero kicker="Developers" title={<>The {BRAND.name} API.</>}>
        <p className="hero-sub">Run the same page audit as the website from your own scripts, dashboards or client reports.</p>
      </PageHero>
      <section className="section section-tight">
        <div className="container post-container doc-body api-doc">
          <h2>How do I get an API key?</h2>
          <p>The API is in early access. <a href={contactLink(`${BRAND.name}: API access`)}>Ask for a key</a> and tell us roughly how many pages you&apos;ll check a month.</p>

          <h2>How do I run an audit?</h2>
          <p><code>GET /api/v1/audit?url=…</code> with your key in the <code>Authorization</code> header (or <code>x-api-key</code>). A check takes about 5 to 20 seconds.</p>
          <pre><code>{curl}</code></pre>

          <h2>What does the response look like?</h2>
          <pre><code>{sample}</code></pre>
          <ul>
            <li><code>scores</code>: 0 to 100 overall and for SEO, AEO (answer engines) and GEO (AI search).</li>
            <li><code>checks</code>: about 55 checks. <code>status</code> is pass, warn, fail or info; <code>weight</code> 1 to 3 is the impact; <code>fix</code> is set when it doesn&apos;t pass.</li>
            <li><code>facts</code>: what we read from the page: status, title, description, headings, schema types, links, sitemap, llms.txt and AI crawler access.</li>
          </ul>

          <h2>What are the limits and errors?</h2>
          <ul>
            <li>Each key has an hourly limit (100 by default). Over it you get <code>429</code>.</li>
            <li><code>401</code>: missing or wrong key. <code>400</code>: bad or private URL. <code>502</code>: the site didn&apos;t load or showed a bot challenge.</li>
            <li>Results aren&apos;t stored. Scores are readiness signals, not ranking guarantees.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
