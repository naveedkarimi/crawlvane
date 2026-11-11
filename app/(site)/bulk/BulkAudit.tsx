"use client";

import { useRef, useState } from "react";
import { api, download } from "@/lib/client";
import { track } from "@/lib/track";
import type { AuditResult } from "@/lib/types";

const MAX = 20;
type Row = { url: string; state: "queued" | "running" | "done" | "error"; r?: AuditResult; error?: string };

/** Pull URLs out of pasted text or a CSV: any token that looks like a domain or URL. */
export function extractUrls(text: string): string[] {
  const out: string[] = [];
  for (const t of text.split(/[\s,;"']+/)) {
    const v = t.trim();
    if (!v || /^url$/i.test(v)) continue;
    if (/^https?:\/\/\S+\.\S+/i.test(v) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)) out.push(v);
  }
  return [...new Set(out)];
}

const tone = (n: number) => (n >= 85 ? "c-pass" : n >= 60 ? "c-warn" : "c-fail");

export default function BulkAudit() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);
  const urls = extractUrls(text);

  const start = async () => {
    const list = urls.slice(0, MAX);
    const init: Row[] = list.map((url) => ({ url, state: "queued" }));
    setRows(init);
    setRunning(true);
    stop.current = false;
    track("Bulk audit", { urls: list.length });
    for (let i = 0; i < list.length && !stop.current; i++) {
      setRows((rs) => rs.map((x, j) => (j === i ? { ...x, state: "running" } : x)));
      try {
        const r = await api<AuditResult>("/api/audit", { method: "POST", body: JSON.stringify({ url: list[i] }) });
        setRows((rs) => rs.map((x, j) => (j === i ? { ...x, state: "done", r } : x)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed";
        setRows((rs) => rs.map((x, j) => (j === i ? { ...x, state: "error", error: msg } : x)));
        if (/too many/i.test(msg)) break;
      }
    }
    setRunning(false);
  };

  const csv = () => {
    const cell = (v: string | number = "") => `"${String(v).replace(/"/g, '""')}"`;
    const lines = rows.map((x) => {
      const r = x.r;
      const issues = r?.checks.filter((c) => c.status === "fail" || c.status === "warn") ?? [];
      const top = [...issues].sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1))[0];
      return [x.url, r?.facts.finalUrl ?? "", r?.scores.overall ?? "", r?.scores.seo ?? "", r?.scores.aeo ?? "", r?.scores.geo ?? "", issues.filter((c) => c.status === "fail").length, issues.filter((c) => c.status === "warn").length, top?.title ?? "", x.error ?? ""].map(cell).join(",");
    });
    download("bulk-audit.csv", ["URL,Final URL,Overall,SEO,AEO,GEO,Failed,Warnings,Top issue,Error", ...lines].join("\n"), "text/csv");
  };

  const done = rows.filter((x) => x.state === "done" || x.state === "error").length;
  return (
    <div className="bulk">
      <div className="card">
        <label className="regex-extra" htmlFor="bulk-urls">
          <span>URLs <span className="muted">(one per line, or paste a CSV column)</span></span>
          <textarea id="bulk-urls" className="field" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"example.com\nexample.com/pricing\nhttps://another.example/blog/"} />
        </label>
        <div className="row wrap bulk-actions">
          <label className="btn btn-ghost bulk-file">
            Upload CSV
            <input type="file" accept=".csv,.txt" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
          </label>
          {running ? (
            <button type="button" className="btn btn-ghost" onClick={() => (stop.current = true)}>Stop</button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!urls.length} onClick={start}>Check {Math.min(urls.length, MAX) || ""} page{urls.length === 1 ? "" : "s"}</button>
          )}
          <span className="muted small">{urls.length > MAX ? `Only the first ${MAX} will be checked.` : `${urls.length} found.`} Each page takes about 5 to 15 seconds.</span>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="card">
          <div className="bulk-head">
            <h3>{running ? `Checking ${done + 1} of ${rows.length}…` : `${done} of ${rows.length} checked`}</h3>
            {done > 0 && <button type="button" className="btn btn-ghost" onClick={csv}>Download CSV</button>}
          </div>
          <div className="table-wrap">
            <table className="bots">
              <thead><tr><th>Page</th><th>Overall</th><th>SEO</th><th>AEO</th><th>GEO</th><th>Top issue</th></tr></thead>
              <tbody>
                {rows.map((x) => {
                  const r = x.r;
                  const top = r?.checks.filter((c) => c.status === "fail").sort((a, b) => b.weight - a.weight)[0] ?? r?.checks.find((c) => c.status === "warn");
                  return (
                    <tr key={x.url}>
                      <td><a href={`/check?url=${encodeURIComponent(x.url)}`} target="_blank" rel="noopener">{x.url}</a></td>
                      {r ? (
                        <>
                          <td className={tone(r.scores.overall)}><strong>{r.scores.overall}</strong></td>
                          <td className={tone(r.scores.seo)}>{r.scores.seo}</td>
                          <td className={tone(r.scores.aeo)}>{r.scores.aeo}</td>
                          <td className={tone(r.scores.geo)}>{r.scores.geo}</td>
                          <td className="small">{top?.title ?? "None"}</td>
                        </>
                      ) : (
                        <td colSpan={5} className={x.state === "error" ? "c-fail small" : "muted small"}>{x.state === "error" ? x.error : x.state === "running" ? "Checking…" : "Waiting"}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
