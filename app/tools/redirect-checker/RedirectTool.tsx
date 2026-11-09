"use client";

import UrlForm from "@/components/UrlForm";
import CheckList, { type SimpleCheck } from "@/components/CheckList";
import { usePageTool } from "@/components/usePageTool";

interface Hop { url: string; status: number; location?: string; ms: number }
interface Trace { start: string; hops: Hop[]; final: string; finalStatus: number; loop: boolean; error?: string }
interface Report { url: string; main: Trace; variants: Trace[]; canonical: string; checks: SimpleCheck[] }

const tone = (s: number) => (s >= 200 && s < 300 ? "c-pass" : s >= 300 && s < 400 ? "c-warn" : "c-fail");

export default function RedirectTool() {
  const { data: r, loading, error, run } = usePageTool<Report>("redirects");
  return (
    <div className="tool">
      <UrlForm id="redirect-url" button="Trace redirects" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {r && (
        <div className="tool-result">
          <div className="card">
            <h3>Redirect path</h3>
            <ol className="hop-list">
              {r.main.hops.map((h, i) => (
                <li key={i}>
                  <span className={`hop-status ${tone(h.status)}`}>{h.status}</span>
                  <code>{h.url}</code>
                  <span className="muted tiny">{h.ms} ms</span>
                </li>
              ))}
              {r.main.loop && <li><span className="hop-status c-fail">loop</span><code>{r.main.final}</code></li>}
              {r.main.error && <li><span className="hop-status c-fail">error</span><span>{r.main.error}</span></li>}
            </ol>
          </div>
          <div className="card">
            <h3>What to fix</h3>
            <CheckList checks={r.checks} />
          </div>
          <div className="card">
            <h3>Every version of the address</h3>
            <div className="table-wrap">
              <table className="bots">
                <thead><tr><th>You type</th><th>Hops</th><th>Ends on</th><th>Status</th></tr></thead>
                <tbody>
                  {r.variants.map((v) => (
                    <tr key={v.start}>
                      <td><code>{v.start}</code></td>
                      <td>{v.hops.filter((h) => h.status >= 300 && h.status < 400).map((h) => h.status).join(" → ") || "none"}</td>
                      <td><code>{v.final}</code></td>
                      <td className={tone(v.finalStatus)}>{v.loop ? "loop" : v.finalStatus || "no answer"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
