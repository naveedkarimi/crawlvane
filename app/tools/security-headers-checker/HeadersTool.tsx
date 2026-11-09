"use client";

import UrlForm from "@/components/UrlForm";
import CheckList, { type SimpleCheck } from "@/components/CheckList";
import { Ring } from "@/components/ui";
import { usePageTool } from "@/components/usePageTool";

interface Report { url: string; status: number; score: number; checks: SimpleCheck[]; rows: { name: string; value: string | null }[] }

export default function HeadersTool() {
  const { data: r, loading, error, run } = usePageTool<Report>("headers");
  return (
    <div className="tool">
      <UrlForm id="headers-url" button="Check headers" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {r && (
        <div className="tool-result">
          <div className="card tool-score">
            <Ring value={r.score} size={110} label="headers" />
            <div>
              <h3>Security headers</h3>
              <p className="muted small"><code>{r.url}</code> answered {r.status}.</p>
              <CheckList checks={r.checks} />
            </div>
          </div>
          <div className="card">
            <h3>Raw headers</h3>
            <div className="table-wrap">
              <table className="bots">
                <tbody>
                  {r.rows.map((h) => (
                    <tr key={h.name}>
                      <td><code>{h.name}</code></td>
                      <td className={h.value ? "small" : "muted small"}>{h.value ?? "not set"}</td>
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
