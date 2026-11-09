"use client";

import UrlForm from "@/components/UrlForm";
import CheckList, { type SimpleCheck } from "@/components/CheckList";
import { usePageTool } from "@/components/usePageTool";

interface Report {
  url: string;
  found: boolean;
  kind?: "urlset" | "sitemapindex";
  total?: number;
  children?: { loc: string; ok: boolean; count: number; error?: string }[];
  samples?: { loc: string; status: number; final: string }[];
  preview?: { loc: string; lastmod?: string }[];
  checks: SimpleCheck[];
}

export default function SitemapTool() {
  const { data: r, loading, error, run } = usePageTool<Report>("sitemap");
  return (
    <div className="tool">
      <UrlForm id="sitemap-url" button="Check sitemap" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {r && (
        <div className="tool-result">
          <div className="card">
            <h3>{r.found ? (r.kind === "sitemapindex" ? "Sitemap index" : "Sitemap") : "No sitemap found"}</h3>
            {r.found && (
              <p className="muted small">
                <code>{r.url}</code> · {r.total?.toLocaleString()} page URLs{r.kind === "sitemapindex" ? ` in the ${r.children?.length} child sitemaps we opened` : ""}
              </p>
            )}
            <CheckList checks={r.checks} />
          </div>
          {r.samples && r.samples.length > 0 && (
            <div className="card">
              <h3>Spot check of listed pages</h3>
              <div className="table-wrap">
                <table className="bots">
                  <thead><tr><th>URL</th><th>Status</th></tr></thead>
                  <tbody>
                    {r.samples.map((s) => (
                      <tr key={s.loc}>
                        <td><code>{s.loc}</code>{s.final !== s.loc && s.status !== 200 && <div className="tiny muted">→ {s.final}</div>}</td>
                        <td className={s.status === 200 ? "c-pass" : s.status >= 300 && s.status < 400 ? "c-warn" : "c-fail"}>{s.status || "error"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {r.children && r.children.length > 0 && (
            <div className="card">
              <h3>Child sitemaps</h3>
              <ul className="plain small">
                {r.children.map((c) => (
                  <li key={c.loc} className={c.ok ? "" : "c-fail"}><code>{c.loc}</code> · {c.ok ? `${c.count.toLocaleString()} URLs` : c.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
