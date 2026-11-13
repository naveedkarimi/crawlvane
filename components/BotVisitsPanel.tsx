"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { BotSummary } from "@/lib/botHits";

type Site = { id: string; domain: string };
type Snippets = { worker: string; php: string; node: string };
type Data = BotSummary & { set: boolean; snippets: Snippets | null };

const fmt = (n: number) => n.toLocaleString("en-US");
const TABS: { id: keyof Snippets; label: string }[] = [
  { id: "worker", label: "Cloudflare Worker" },
  { id: "php", label: "PHP / WordPress" },
  { id: "node", label: "Node (Express)" },
];

/** Live AI crawler visits per site, counted by a small snippet on the site. */
export default function BotVisitsPanel({ sites, canEdit }: { sites: Site[]; canEdit: boolean }) {
  return (
    <section className="card dash-card google-panel" aria-labelledby="bots-title">
      <div className="card-head">
        <div>
          <h2 id="bots-title">AI bot visits</h2>
          <p className="muted small">See when ChatGPT, Claude, Perplexity and other AI crawlers actually visit. A small snippet on your site counts them; we keep only a daily count per bot, nothing about your visitors.</p>
        </div>
      </div>
      <ul className="google-sites">{sites.map((s) => <BotSite key={s.id} site={s} canEdit={canEdit} />)}</ul>
    </section>
  );
}

function BotSite({ site, canEdit }: { site: Site; canEdit: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  const [tab, setTab] = useState<keyof Snippets>("worker");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const load = () => api<Data>(`/api/me/bot-hits?id=${site.id}`).then(setD).catch((e) => setErr(e instanceof Error ? e.message : "Couldn't load."));
  useEffect(() => { void load(); }, [site.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setup = async (rotate = false) => {
    if (rotate && !window.confirm("Make a new token? The snippet already on your site stops counting until you replace it.")) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ snippets: Snippets }>("/api/me/bot-hits", { method: "POST", body: JSON.stringify({ siteId: site.id, rotate }) });
      setD((x) => (x ? { ...x, set: true, snippets: r.snippets } : x));
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't set up tracking.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!d?.snippets) return;
    await navigator.clipboard.writeText(d.snippets[tab]).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!d) return <li className="google-site"><strong className="mono">{site.domain}</strong>{err && <p className="c-fail small">{err}</p>}</li>;
  const max = Math.max(1, ...d.daily.map((x) => x.hits));
  return (
    <li className="google-site">
      <div className="bots-head">
        <strong className="mono">{site.domain}</strong>
        {d.set && <span className="muted small">{fmt(d.total)} AI bot visit{d.total === 1 ? "" : "s"} in the last {d.days} days</span>}
      </div>
      {!d.set ? (
        canEdit ? <button type="button" className="btn btn-sm" disabled={busy} onClick={() => setup()}>{busy ? "Setting up…" : "Start counting AI bot visits"}</button>
          : <p className="muted small">Not set up yet. Ask an editor to set it up.</p>
      ) : (
        <>
          {d.total > 0 ? (
            <>
              <div className="bots-chart" role="img" aria-label={`AI bot visits per day for the last ${d.days} days, ${fmt(d.total)} in total`}>
                {d.daily.map((x) => <span key={x.day} style={{ height: `${Math.max(4, (x.hits / max) * 100)}%` }} className={x.hits ? "" : "is-zero"} title={`${x.day}: ${fmt(x.hits)}`} />)}
              </div>
              <table className="google-table"><thead><tr><th>Bot</th><th>Who</th><th>Visits</th></tr></thead>
                <tbody>{d.bots.slice(0, 8).map((b) => <tr key={b.bot}><td className="mono small">{b.bot}</td><td className="small">{b.owner}</td><td>{fmt(b.hits)}</td></tr>)}</tbody>
              </table>
            </>
          ) : <p className="muted small">No AI bot visits counted yet. Once the snippet is live, visits show up here within a minute of each crawl.</p>}
          {canEdit && d.snippets && (
            <details className="bots-snippet" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
              <summary className="small">Snippet to add to your site</summary>
              <div className="bots-tabs" role="tablist" aria-label="Snippet type">
                {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>)}
              </div>
              <pre className="bots-code"><code>{d.snippets[tab]}</code></pre>
              <div className="bots-actions">
                <button type="button" className="btn btn-sm" onClick={copy}>{copied ? "Copied" : "Copy snippet"}</button>
                <button type="button" className="link small" disabled={busy} onClick={() => setup(true)}>Make a new token</button>
              </div>
              <p className="muted tiny">The token in the snippet lets it add counts for this site only. Keep it private; make a new one if it leaks.</p>
            </details>
          )}
        </>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </li>
  );
}
