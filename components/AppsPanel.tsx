"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { countryName, STORE_COUNTRIES } from "@/lib/countries";
import type { TrackedApp } from "@/lib/orgMonitoring";
import type { Store } from "@/lib/appStore";
import { Ring } from "./ui";
import Sparkline from "./Sparkline";

const ago = (iso: string | null) => (iso ? `${Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000))} days ago` : "never");

/** Tracked apps: weekly snapshots, rating trend and competitors. */
export default function AppsPanel({ canEdit }: { canEdit: boolean }) {
  const [apps, setApps] = useState<TrackedApp[] | null>(null);
  const [input, setInput] = useState("");
  const [store, setStore] = useState<Store>("apple");
  const [country, setCountry] = useState("us");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [rivals, setRivals] = useState("");
  const countries = useMemo(() => STORE_COUNTRIES.map((c) => ({ c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)), []);
  const load = useCallback(() => api<{ apps: TrackedApp[] }>("/api/me/apps").then((r) => setApps(r.apps)).catch((e: Error) => setErr(e.message)), []);
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

  return (
    <section className="dash-section" aria-label="Apps">
      {canEdit && (
        <div className="app-check">
          <form className="search" onSubmit={(e) => { e.preventDefault(); void act("add", () => api("/api/me/apps", { method: "POST", body: JSON.stringify({ app: input, store, country }) }).then(() => setInput(""))); }}>
            <label htmlFor="track-app" className="sr-only">App Store or Google Play link, or app name</label>
            <input id="track-app" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Track an app: store link or name" />
            <button type="submit" disabled={busy === "add" || !input.trim()}><Plus size={16} aria-hidden="true" /> {busy === "add" ? "Adding…" : "Track app"}</button>
          </form>
          <div className="app-controls">
            <div className="segmented app-store-toggle" role="radiogroup" aria-label="Store to search when you enter a name">
              {(["apple", "google"] as Store[]).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={store === s} className={store === s ? "on" : ""} onClick={() => setStore(s)}>{s === "apple" ? "App Store" : "Google Play"}</button>
              ))}
            </div>
            <label className="app-country">
              <span className="sr-only">Country</span>
              <select className="field" value={country} onChange={(e) => setCountry(e.target.value)}>{countries.map(({ c, name }) => <option key={c} value={c}>{name}</option>)}</select>
            </label>
          </div>
        </div>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {!apps ? (
        <div className="loading"><div className="spinner" /> Loading apps…</div>
      ) : !apps.length ? (
        <div className="card dash-empty"><h3>No tracked apps yet</h3><p className="muted">Track an app to get a weekly snapshot of its rating and listing score, and an email when the rating drops or a competitor updates.</p></div>
      ) : (
        <div className="site-grid">
          {apps.map((a) => {
            const last = a.history.at(-1);
            return (
              <article key={a.id} className="card site-card">
                <div className="site-card-head">
                  <div className="app-id">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.icon && <img className="app-icon" src={a.icon} alt="" width={44} height={44} referrerPolicy="no-referrer" />}
                    <div>
                      <h3>{a.title}</h3>
                      <p className="muted small">{a.store === "apple" ? "App Store" : "Google Play"} · {countryName(a.country)} · checked {ago(a.lastRunAt)}</p>
                    </div>
                  </div>
                  {last && <Ring value={last.score} size={72} />}
                </div>
                {last && (
                  <dl className="site-cats">
                    <div><dt>Rating</dt><dd>{last.rating !== null ? last.rating.toFixed(2) : "–"}</dd></div>
                    <div><dt>Ratings</dt><dd>{last.ratingCount !== null ? last.ratingCount.toLocaleString("en-US") : "–"}</dd></div>
                    <div><dt>Updated</dt><dd>{last.lastUpdated ? ago(last.lastUpdated).replace(" ago", "") : "–"}</dd></div>
                  </dl>
                )}
                <Sparkline values={a.history.filter((h) => h.rating !== null).map((h) => ((h.rating as number) - 1) * 25)} label={`Rating trend for ${a.title}`} />
                {last && last.competitors.length > 0 && (
                  <ul className="rival-list">
                    {last.competitors.map((c) => <li key={c.id}><span>{c.title}</span><strong>{c.rating !== null ? c.rating.toFixed(2) : "–"}</strong></li>)}
                  </ul>
                )}
                {editing === a.id && (
                  <div className="rival-edit">
                    <label className="small" htmlFor={`rivals-${a.id}`}>Up to 3 competitors, one per line (links or names)</label>
                    <textarea id={`rivals-${a.id}`} className="field" rows={3} value={rivals} onChange={(e) => setRivals(e.target.value)} />
                    <div className="site-actions">
                      <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => act(`r-${a.id}`, () => api("/api/me/apps", { method: "PATCH", body: JSON.stringify({ id: a.id, competitors: rivals.split("\n") }) }).then(() => setEditing(null)))}>{busy === `r-${a.id}` ? "Saving…" : "Save competitors"}</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                )}
                <div className="site-actions">
                  {canEdit && <button className="btn btn-sm btn-primary" disabled={busy === a.id} onClick={() => act(a.id, () => api(`/api/me/apps/${a.id}/check`, { method: "POST" }))}><RefreshCw size={15} aria-hidden="true" /> {busy === a.id ? "Checking…" : "Check now"}</button>}
                  {canEdit && editing !== a.id && <button className="btn btn-sm" onClick={() => { setEditing(a.id); setRivals(a.competitors.map((c) => c.title).join("\n")); }}>Competitors</button>}
                  {a.url && <a className="btn btn-sm btn-ghost" href={a.url} target="_blank" rel="noopener">Store <ExternalLink size={13} aria-hidden="true" /></a>}
                  {canEdit && <button className="btn btn-sm btn-ghost icon-btn" aria-label={`Stop tracking ${a.title}`} onClick={() => window.confirm(`Stop tracking ${a.title}? Its history is deleted.`) && act(`d-${a.id}`, () => api(`/api/me/apps?id=${a.id}`, { method: "DELETE" }))}><Trash2 size={15} aria-hidden="true" /></button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
