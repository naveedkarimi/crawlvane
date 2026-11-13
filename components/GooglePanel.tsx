"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Properties, SearchData } from "@/lib/google";

interface Status { configured: boolean; connected: boolean; email?: string | null; properties?: Properties; links?: { id: string; gsc_property: string | null; ga4_property: string | null }[]; error?: string }
type Site = { id: string; domain: string; url: string };

const fmtNum = (n: number) => n.toLocaleString("en-US");

/** Connect Google Search Console and GA4, link each saved site to its properties, and see real clicks and AI referrals. */
export default function GooglePanel({ sites, isOwner, canEdit }: { sites: Site[]; isOwner: boolean; canEdit: boolean }) {
  const [s, setS] = useState<Status | null>(null);
  const [notice] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("google") : null));
  const load = () => api<Status>("/api/me/google?properties=1").then(setS).catch(() => setS({ configured: false, connected: false }));
  useEffect(() => { void load(); }, []);
  if (!s?.configured) return null;
  const disconnect = async () => {
    if (!window.confirm("Disconnect Google? Linked properties are removed, and access is revoked at Google.")) return;
    await api("/api/me/google", { method: "DELETE" }).catch(() => {});
    void load();
  };
  return (
    <section className="card dash-card google-panel" aria-labelledby="google-title">
      <div className="card-head">
        <div>
          <h2 id="google-title">Search Console and GA4</h2>
          <p className="muted small">Real clicks, impressions and visits from AI assistants next to your scores. Read-only; data is fetched when you look and isn&apos;t stored.</p>
        </div>
        {s.connected && isOwner && <button type="button" className="btn btn-sm" onClick={disconnect}>Disconnect</button>}
      </div>
      {notice === "connected" && <p className="lead-done" role="status">Google is connected. Link each site to its properties below.</p>}
      {(notice === "error" || notice === "cancelled") && <p className="c-fail small" role="alert">Google wasn&apos;t connected{notice === "cancelled" ? " (you cancelled)" : ""}. Try again.</p>}
      {!s.connected ? (
        isOwner ? <a className="btn btn-primary" href="/api/me/google/connect">Connect Google</a> : <p className="muted small">Ask the team owner to connect Google.</p>
      ) : (
        <>
          <p className="muted small">Connected as {s.email || "your Google account"}.</p>
          {s.error && <p className="c-fail small" role="alert">{s.error}</p>}
          <ul className="google-sites">
            {sites.map((site) => <GoogleSite key={site.id} site={site} props={s.properties} link={s.links?.find((l) => l.id === site.id)} canEdit={canEdit} />)}
          </ul>
        </>
      )}
    </section>
  );
}

function GoogleSite({ site, props, link, canEdit }: { site: Site; props?: Properties; link?: { gsc_property: string | null; ga4_property: string | null }; canEdit: boolean }) {
  const [gsc, setGsc] = useState(link?.gsc_property ?? "");
  const [ga4, setGa4] = useState(link?.ga4_property ?? "");
  const [saved, setSaved] = useState({ gsc: link?.gsc_property ?? "", ga4: link?.ga4_property ?? "" });
  const [data, setData] = useState<SearchData | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const host = site.domain.replace(/^www\./, "");
  // Suggest the matching properties first.
  const gscList = [...(props?.gsc ?? [])].sort((a, b) => Number(b.url.includes(host)) - Number(a.url.includes(host)));
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await api("/api/me/google/site", { method: "POST", body: JSON.stringify({ siteId: site.id, gsc: gsc || null, ga4: ga4 || null }) });
      setSaved({ gsc, ga4 });
      setData(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };
  const show = async () => {
    setBusy(true);
    setErr("");
    try {
      setData(await api<SearchData>(`/api/me/google/site?id=${site.id}`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load data.");
    } finally {
      setBusy(false);
    }
  };
  const changed = gsc !== saved.gsc || ga4 !== saved.ga4;
  return (
    <li className="google-site">
      <strong className="mono">{site.domain}</strong>
      <div className="google-pickers">
        <label><span className="sr-only">Search Console property for {site.domain}</span>
          <select className="field" value={gsc} disabled={!canEdit} onChange={(e) => setGsc(e.target.value)}>
            <option value="">No Search Console property</option>
            {gscList.map((p) => <option key={p.url} value={p.url}>{p.url}</option>)}
          </select>
        </label>
        <label><span className="sr-only">GA4 property for {site.domain}</span>
          <select className="field" value={ga4} disabled={!canEdit} onChange={(e) => setGa4(e.target.value)}>
            <option value="">No GA4 property</option>
            {(props?.ga4 ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.account})</option>)}
          </select>
        </label>
        {changed ? <button type="button" className="btn btn-sm" disabled={busy || !canEdit} onClick={save}>Save</button>
          : (saved.gsc || saved.ga4) && <button type="button" className="btn btn-sm" disabled={busy} onClick={show}>{busy ? "Loading…" : "Show last 28 days"}</button>}
      </div>
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {data && (
        <div className="google-data">
          {data.gsc && (
            <div>
              <div className="google-stats">
                <div><span>Clicks</span><strong>{fmtNum(data.gsc.clicks)}</strong></div>
                <div><span>Impressions</span><strong>{fmtNum(data.gsc.impressions)}</strong></div>
                <div><span>Click rate</span><strong>{(data.gsc.ctr * 100).toFixed(1)}%</strong></div>
                <div><span>Average position</span><strong>{data.gsc.position ? data.gsc.position.toFixed(1) : "–"}</strong></div>
              </div>
              {data.gsc.queries.length > 0 && (
                <table className="google-table"><thead><tr><th>Top searches</th><th>Clicks</th><th>Impressions</th><th>Position</th></tr></thead>
                  <tbody>{data.gsc.queries.slice(0, 5).map((q) => <tr key={q.query}><td>{q.query}</td><td>{fmtNum(q.clicks)}</td><td>{fmtNum(q.impressions)}</td><td>{q.position.toFixed(1)}</td></tr>)}</tbody>
                </table>
              )}
              {data.gsc.lowCtrPages.length > 0 && (
                <div className="google-opps">
                  <h4>Seen often, clicked rarely</h4>
                  <p className="muted tiny">On page 1 with 100+ impressions but under 2% clicked. A clearer title and description usually helps.</p>
                  <ul>{data.gsc.lowCtrPages.map((p) => <li key={p.page}><span className="mono small">{p.page.replace(/^https?:\/\/[^/]+/, "") || "/"}</span> <span className="muted small">· {fmtNum(p.impressions)} impressions, {(p.ctr * 100).toFixed(1)}% clicked, position {p.position.toFixed(1)}</span></li>)}</ul>
                </div>
              )}
              {data.gsc.nearlyThere.length > 0 && (
                <div className="google-opps">
                  <h4>Nearly there</h4>
                  <p className="muted tiny">Searches where you rank 8 to 20. Improving the matching page is the quickest way onto page 1.</p>
                  <ul>{data.gsc.nearlyThere.map((q) => <li key={q.query}>{q.query} <span className="muted small">· position {q.position.toFixed(1)}, {fmtNum(q.impressions)} impressions</span></li>)}</ul>
                </div>
              )}
              {(data.gsc.countries.length > 0 || data.gsc.devices.length > 0) && (
                <p className="muted small">
                  {data.gsc.countries.length > 0 && <>Top countries: {data.gsc.countries.map((c) => `${c.country} (${fmtNum(c.clicks)})`).join(", ")}. </>}
                  {data.gsc.devices.length > 0 && <>Devices: {data.gsc.devices.map((d) => `${d.device} ${fmtNum(d.clicks)}`).join(", ")} clicks.</>}
                </p>
              )}
            </div>
          )}
          {data.ga4 && (
            <div>
              <p className="small"><strong>{fmtNum(data.ga4.aiSessions)}</strong> visits from AI assistants out of {fmtNum(data.ga4.sessions)} in total.</p>
              {data.ga4.sources.length > 0 && <p className="muted small">{data.ga4.sources.map((x) => `${x.source} (${fmtNum(x.sessions)})`).join(" · ")}</p>}
              {data.ga4.landingPages.length > 0 && (
                <table className="google-table"><thead><tr><th>Top landing pages</th><th>Sessions</th><th>Engaged</th><th>Failed checks</th></tr></thead>
                  <tbody>{data.ga4.landingPages.map((l) => <tr key={l.page}><td className="mono small">{l.page}</td><td>{fmtNum(l.sessions)}</td><td>{fmtNum(l.engaged)}</td><td className={l.failedChecks ? "c-fail" : ""}>{l.failedChecks ?? "–"}</td></tr>)}</tbody>
                </table>
              )}
              {data.ga4.landingPages.some((l) => l.failedChecks === null) && <p className="muted tiny">Failed checks come from this site&apos;s latest full report; &ldquo;–&rdquo; means the page wasn&apos;t in it.</p>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
