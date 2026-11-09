"use client";

import UrlForm from "@/components/UrlForm";
import { CopyBlock } from "@/components/ui";
import { usePageTool } from "@/components/usePageTool";
import type { MarkdownResult } from "@/lib/gen/pageTools";

export default function MarkdownTool() {
  const { data: r, loading, error, run } = usePageTool<MarkdownResult & { url: string }>("markdown");
  let file = "page.md";
  if (r) {
    try {
      const u = new URL(r.url);
      file = `${(u.hostname + u.pathname).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "page"}.md`;
    } catch {
      /* keep default */
    }
  }
  return (
    <div className="tool">
      <UrlForm id="md-url" button="Convert" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {r && (
        <div className="tool-result card">
          <div className={`aiview-verdict ${r.words < 50 ? "bad" : r.words < 250 ? "warn" : "good"}`}>
            {r.words < 50
              ? `Only ${r.words} words arrive in the HTML. This page is probably built by JavaScript, so most AI crawlers get almost nothing.`
              : `${r.words.toLocaleString()} words, about ${r.tokens.toLocaleString()} tokens, taken from the page's <${r.source}> element.`}
          </div>
          <CopyBlock content={r.markdown} filename={file} />
          <p className="muted tiny">
            This is the raw HTML (no JavaScript run) with menus, headers, footers and scripts removed: close to what AI crawlers and tools that
            fetch pages for a model work with. Token counts are an estimate.
          </p>
        </div>
      )}
    </div>
  );
}
