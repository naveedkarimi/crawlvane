"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import type { SiteSummary } from "@/lib/accounts";
import type { Tracker } from "@/lib/visibilityTracking";
import LineChart from "./LineChart";
import type { SentimentCounts } from "@/lib/reportTypes";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Weekly AI visibility per site: mention rate per engine over time and share of voice. */
export default function VisibilityPanel({ canEdit }: { canEdit: boolean }) {
  const [trackers, setTrackers] = useState<Tracker[] | null>(null);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [siteId, setSiteId] = useState("");
  const [prompts, setPrompts] = useState("");
  const [rivals, setRivals] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api<{ trackers: Tracker[] }>("/api/me/visibility"), api<{ sites: SiteSummary[] }>("/api/me/sites")]);
      setTrackers(t.trackers);
      setSites(s.sites);
      setSiteId((cur) => cur || s.sites.find((x) => !t.trackers.some((tr) => tr.siteId === x.id))?.id || "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load AI visibility.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr("");
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy("");
    }
  };
  const untracked = sites.filter((s) => !trackers?.some((t) => t.siteId === s.id));

  return (
    <section className="dash-section" aria-label="AI visibility">
      {canEdit && untracked.length > 0 && (
        <form className="card vis-new" onSubmit={(e) => { e.preventDefault(); void act("add", () => api("/api/me/visibility", { method: "POST", body: JSON.stringify({ siteId, prompts: prompts.split("\n"), competitors: rivals.split("\n") }) }).then(() => { setPrompts(""); setRivals(""); })); }}>
          <h3>Track how AI assistants talk about a site</h3>
          <p className="muted small">Every week we ask the same buyer questions in each AI assistant you have a key for, and chart how often your site is mentioned.</p>
          <label className="lbl" htmlFor="vis-site">Site</label>
          <select id="vis-site" className="field" value={siteId} onChange={(e) => setSiteId(e.target.value)}>{untracked.map((s) => <option key={s.id} value={s.id}>{s.domain}</option>)}</select>
          <label className="lbl" htmlFor="vis-prompts">Buyer questions, one per line <span className="muted">(optional: leave empty and we&apos;ll suggest 8)</span></label>
          <textarea id="vis-prompts" className="field" rows={4} value={prompts} onChange={(e) => setPrompts(e.target.value)} placeholder={"best accounting software for freelancers\nhow do I send invoices from my phone"} />
          <label className="lbl" htmlFor="vis-rivals">Competitor sites, one per line <span className="muted">(optional, up to 3)</span></label>
          <textarea id="vis-rivals" className="field" rows={2} value={rivals} onChange={(e) => setRivals(e.target.value)} placeholder="competitor.com" />
          <button className="btn btn-primary" disabled={busy === "add" || !siteId}><Plus size={16} aria-hidden="true" /> {busy === "add" ? "Setting up…" : "Start tracking"}</button>
        </form>
      )}
      {canEdit && !sites.length && <div className="card dash-empty"><h3>Save a site first</h3><p className="muted">AI visibility tracking works on your saved sites. Add one in the Sites tab.</p></div>}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {!trackers ? (
        <div className="loading"><div className="spinner" /> Loading…</div>
      ) : (
        trackers.map((t) => {
          const last = t.runs.at(-1);
          const engines = [...new Set(t.runs.flatMap((r) => r.summary.map((s) => s.engine)))];
          return (
            <article key={t.id} className="card vis-card">
              <div className="site-card-head">
                <div>
                  <h3>{t.domain}</h3>
                  <p className="muted small">{t.prompts.length} questions · {t.lastRunAt ? `last run ${fmt(t.lastRunAt)}` : "not run yet"} · runs weekly</p>
                </div>
                <div className="site-actions">
                  {canEdit && <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => act(t.id, () => api(`/api/me/visibility/${t.id}/run`, { method: "POST" }))}><RefreshCw size={15} aria-hidden="true" /> {busy === t.id ? "Asking AI assistants…" : "Run now"}</button>}
                  {canEdit && <button className="btn btn-sm btn-ghost icon-btn" aria-label={`Stop tracking ${t.domain}`} onClick={() => window.confirm(`Stop AI visibility tracking for ${t.domain}? Its history is deleted.`) && act(`d-${t.id}`, () => api(`/api/me/visibility?id=${t.id}`, { method: "DELETE" }))}><Trash2 size={15} aria-hidden="true" /></button>}
                </div>
              </div>
              {last?.error && <p className="c-fail small">{last.error}</p>}
              {engines.length > 0 && (
                <div className="vis-engines-chart">
                  <div className="card-head">
                    <h4 className="vis-h">Mention rate by AI assistant</h4>
                    <ul className="chart-legend">{engines.map((e, i) => <li key={e} className={`lg-e${i % 5}`}>{e}</li>)}</ul>
                  </div>
                  {t.runs.length < 2 ? (
                    <div className="vis-engines">
                      {engines.map((e) => {
                        const now = last?.summary.find((s) => s.engine === e);
                        return <div key={e} className="vis-engine"><div className="meter-head"><span>{e}</span><strong>{now ? `${now.mentionRate}% mentioned` : "–"}</strong></div>{now && <p className="muted small">Cited in {now.citationRate}% of answers</p>}</div>;
                      })}
                      <p className="muted small">The chart appears after the second run.</p>
                    </div>
                  ) : (
                    <LineChart
                      title={`AI mention rate over time for ${t.domain}`}
                      height={200}
                      labels={t.runs.map((r) => fmt(r.at))}
                      series={engines.map((e, i) => ({ key: e, label: e, className: `s-e${i % 5}`, values: t.runs.map((r) => r.summary.find((s) => s.engine === e)?.mentionRate ?? null) }))}
                    />
                  )}
                </div>
              )}
              {last?.sentiment && (
                <div>
                  <h4 className="vis-h">How answers describe you (latest run)</h4>
                  <SentimentBar c={last.sentiment} />
                </div>
              )}
              {last && last.shareOfVoice.length > 0 && (
                <div>
                  <h4 className="vis-h">Share of voice (latest run)</h4>
                  {(() => {
                    const max = Math.max(1, ...last.shareOfVoice.map((s) => s.mentions));
                    return last.shareOfVoice.map((s) => (
                      <div key={s.name} className="bar-row"><span className="bar-label">{s.name}</span><div className="bar-outer"><div className="bar-inner" style={{ width: `${Math.max(3, (s.mentions / max) * 100)}%` }} /></div><span className="bar-val">{s.mentions}</span></div>
                    ));
                  })()}
                </div>
              )}
              {last?.rows && last.rows.length > 0 && (
                <details>
                  <summary>Latest answers ({last.rows.length})</summary>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Question</th><th>Assistant</th><th>Mentioned</th><th>Answer</th></tr></thead>
                      <tbody>{last.rows.map((r, i) => <tr key={i}><td>{r.prompt}</td><td>{r.engine}</td><td>{r.error ? "Error" : r.mentioned ? (r.sentiment ? `Yes, ${r.sentiment}` : "Yes") : "No"}</td><td className="small">{r.answerExcerpt.slice(0, 220)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </details>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}

function SentimentBar({ c }: { c: SentimentCounts }) {
  const total = c.positive + c.neutral + c.negative || 1;
  const parts = [["positive", "Positive", c.positive], ["neutral", "Neutral", c.neutral], ["negative", "Negative", c.negative]] as const;
  return (
    <div className="sent">
      <div className="sent-bar" role="img" aria-label={parts.map(([, l, n]) => `${l} ${n}`).join(", ")}>
        {parts.map(([k, , n]) => (n ? <i key={k} className={`sent-${k}`} style={{ width: `${(n / total) * 100}%` }} /> : null))}
      </div>
      <ul className="sent-legend">{parts.map(([k, l, n]) => <li key={k} className={`sent-${k}`}>{l}: {n}</li>)}</ul>
    </div>
  );
}
