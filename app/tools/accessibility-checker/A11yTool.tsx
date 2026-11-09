"use client";

import UrlForm from "@/components/UrlForm";
import CheckList from "@/components/CheckList";
import { Ring } from "@/components/ui";
import { usePageTool } from "@/components/usePageTool";
import type { A11yReport } from "@/lib/gen/a11y";

export default function A11yTool() {
  const { data: r, loading, error, run } = usePageTool<A11yReport & { url: string }>("a11y");
  return (
    <div className="tool">
      <UrlForm id="a11y-url" button="Check accessibility" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {r && (
        <div className="tool-result">
          <div className="card tool-score">
            <Ring value={r.score} size={110} label="WCAG" />
            <div>
              <h3>Automated WCAG 2.2 checks</h3>
              <p className="muted small">
                {r.counts.images} images, {r.counts.fields} form fields, {r.counts.buttons} buttons and {r.counts.links} links checked in the HTML your server sends.
              </p>
              <CheckList checks={r.checks.map((c) => ({ ...c, title: `${c.title} (WCAG ${c.wcag})` }))} />
            </div>
          </div>
          <div className="card tool-next">
            <h3>What this can&apos;t check</h3>
            <p className="muted small">
              Automated tools find only part of the problems. Before you call a site ADA compliant, also test: text and button colour contrast in your real design,
              using the whole site with only a keyboard (can you see where focus is?), a screen reader (VoiceOver or NVDA) on your key pages, zoom to 200%, and
              captions on videos. This report isn&apos;t legal advice or a compliance certificate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
