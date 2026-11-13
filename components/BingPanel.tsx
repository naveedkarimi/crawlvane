"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import type { BingData } from "@/lib/bing";
import type { IndexNowStatus } from "@/lib/indexNow";

interface Status { configured: boolean; connected: boolean; sites?: { url: string; verified: boolean }[]; links?: { id: string; bing_site: string | null }[]; error?: string }
type Site = { id: string; domain: string; url: string };

const fmtNum = (n: number) => n.toLocaleString("en-US");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/** Bing Webmaster Tools data for each saved site, and IndexNow to tell search engines when pages change. */
export default function BingPanel({ sites, isOwner, canEdit }: { sites: Site[]; isOwner: boolean; canEdit: boolean }) {
  const [s, setS] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = () => api<Status>("/api/me/bing").then(setS).catch(() => setS({ configured: false, connected: false }));
  useEffect(() => { void load(); }, []);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/me/bing", { method: "POST", body: JSON.stringify({ apiKey: key }) });
      setKey("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't connect Bing.");
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect Bing? The stored API key and site links are removed.")) return;
    await api("/api/me/bing", { method: "DELETE" }).catch(() => {});
    void load();
  };

  return (
    <section className="card dash-card google-panel" aria-labelledby="bing-title">
      <div className="card-head">
        <div>
          <h2 id="bing-title">Bing and IndexNow</h2>
          <p className="muted small">Real Bing clicks and searches, and a way to tell Bing, Yandex and other engines the moment pages change. Bing data is read-only and isn&apos;t stored.</p>
        </div>
        {s?.connected && isOwner && <button type="button" className="btn btn-sm" onClick={disconnect}>Disconnect Bing</button>}
      </div>
      {s?.configured && !s.connected && (
        isOwner ? (
          <form className="bing-connect" onSubmit={connect}>
            <label htmlFor="bing-key" className="lbl">Bing Webmaster Tools API key</label>
            <div className="bing-connect-row">
              <input id="bing-key" className="field" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Paste your API key" required />
              <button type="submit" className="btn btn-primary" disabled={busy || !key.trim()}>{busy ? "Checking…" : "Connect Bing"}</button>
            </div>
            <p className="muted tiny">In Bing Webmaster Tools: Settings → API access → API key. It&apos;s stored encrypted and only used to read your Bing data.</p>
            {err && <p className="c-fail small" role="alert">{err}</p>}
          </form>
        ) : <p className="muted small">Ask the team owner to connect Bing.</p>
      )}
      {s?.error && <p className="c-fail small" role="alert">{s.error}</p>}
      <ul className="google-sites">
        {sites.map((site) => (
          <BingSite key={site.id} site={site} status={s} link={s?.links?.find((l) => l.id === site.id)?.bing_site ?? null} canEdit={canEdit} />
        ))}
      </ul>
    </section>
  );
}

function BingSite({ site, status, link, canEdit }: { site: Site; status: Status | null; link: string | null; canEdit: boolean }) {
  const [pick, setPick] = useState(link ?? "");
  const [saved, setSaved] = useState(link ?? "");
  const [data, setData] = useState<BingData | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setPick(link ?? ""); setSaved(link ?? ""); }, [link]);
  const host = site.domain.replace(/^www\./, "");
  const bingSites = [...(status?.sites ?? [])].sort((a, b) => Number(b.url.includes(host)) - Number(a.url.includes(host)));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  };
  const save = () => run(async () => {
    await api("/api/me/bing/site", { method: "POST", body: JSON.stringify({ siteId: site.id, bingSite: pick || null }) });
    setSaved(pick);
    setData(null);
  });
  const show = () => run(async () => setData((await api<{ data: BingData | null }>(`/api/me/bing/site?id=${site.id}`)).data));

  return (
    <li className="google-site">
      <strong className="mono">{site.domain}</strong>
      {status?.connected && (
        <div className="google-pickers">
          <label><span className="sr-only">Bing site for {site.domain}</span>
            <select className="field" value={pick} disabled={!canEdit} onChange={(e) => setPick(e.target.value)}>
              <option value="">No Bing site</option>
              {bingSites.map((b) => <option key={b.url} value={b.url}>{b.url}{b.verified ? "" : " (not verified)"}</option>)}
            </select>
          </label>
          {pick !== saved ? <button type="button" className="btn btn-sm" disabled={busy || !canEdit} onClick={save}>Save</button>
            : saved && <button type="button" className="btn btn-sm" disabled={busy} onClick={show}>{busy ? "Loading…" : "Show last 28 days"}</button>}
        </div>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {data && (
        <div className="google-data">
          <div className="google-stats">
            <div><span>Bing clicks</span><strong>{fmtNum(data.clicks)}</strong></div>
            <div><span>Impressions</span><strong>{fmtNum(data.impressions)}</strong></div>
            <div><span>Click rate</span><strong>{(data.ctr * 100).toFixed(1)}%</strong></div>
            <div><span>Searches shown</span><strong>{fmtNum(data.queries.length)}</strong></div>
          </div>
          {data.queries.length > 0 ? (
            <table className="google-table"><thead><tr><th>Top Bing searches</th><th>Clicks</th><th>Impressions</th><th>Position</th></tr></thead>
              <tbody>{data.queries.slice(0, 5).map((q) => <tr key={q.query}><td>{q.query}</td><td>{fmtNum(q.clicks)}</td><td>{fmtNum(q.impressions)}</td><td>{q.position ? q.position.toFixed(1) : "–"}</td></tr>)}</tbody>
            </table>
          ) : <p className="muted small">Bing has no search data for this site in the last {data.days} days yet.</p>}
          {data.pages.length > 0 && (
            <table className="google-table"><thead><tr><th>Top pages on Bing</th><th>Clicks</th><th>Impressions</th></tr></thead>
              <tbody>{data.pages.slice(0, 5).map((p) => <tr key={p.page}><td className="mono small">{p.page.replace(/^https?:\/\/[^/]+/, "") || "/"}</td><td>{fmtNum(p.clicks)}</td><td>{fmtNum(p.impressions)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
      <IndexNowRow site={site} canEdit={canEdit} />
    </li>
  );
}

function IndexNowRow({ site, canEdit }: { site: Site; canEdit: boolean }) {
  const [st, setSt] = useState<IndexNowStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paste, setPaste] = useState("");
  useEffect(() => { api<IndexNowStatus>(`/api/me/indexnow?id=${site.id}`).then(setSt).catch(() => {}); }, [site.id]);

  const post = async (action: string, extra: object = {}) => {
    setBusy(action);
    setMsg(null);
    try {
      return await api<Record<string, unknown>>("/api/me/indexnow", { method: "POST", body: JSON.stringify({ siteId: site.id, action, ...extra }) });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
      return null;
    } finally {
      setBusy(null);
    }
  };
  const setup = async () => { const r = await post("setup"); if (r) setSt(r as unknown as IndexNowStatus); };
  const verify = async () => {
    const r = await post("verify");
    if (!r) return;
    setMsg(r.verified ? { ok: true, text: "Found your key file. You can send pages now." } : { ok: false, text: "The key file isn't online yet, or it holds something else." });
    setSt(await api<IndexNowStatus>(`/api/me/indexnow?id=${site.id}`));
  };
  const submit = async () => {
    const urls = paste.split(/\s+/).filter(Boolean);
    const r = await post("submit", urls.length ? { urls } : {});
    if (!r) return;
    setMsg({ ok: !!r.ok, text: `${r.message}${r.sent ? ` (${r.sent} page${r.sent === 1 ? "" : "s"})` : ""}${r.rejected ? ` ${r.rejected} URL${r.rejected === 1 ? " was" : "s were"} skipped (other sites or over 1,000).` : ""}` });
    if (r.ok) setSt(await api<IndexNowStatus>(`/api/me/indexnow?id=${site.id}`));
  };

  if (!st) return null;
  const fileName = st.key ? `${st.key}.txt` : "";
  return (
    <div className="indexnow">
      <h4>IndexNow</h4>
      {!st.key ? (
        <>
          <p className="muted small">Tell Bing, Yandex and other engines about new or changed pages straight away, instead of waiting for a crawl. Google doesn&apos;t use IndexNow.</p>
          {canEdit && <button type="button" className="btn btn-sm" disabled={!!busy} onClick={setup}>{busy === "setup" ? "Setting up…" : "Set up IndexNow"}</button>}
        </>
      ) : !st.verifiedAt ? (
        <>
          <p className="small">Upload a plain text file named <code>{fileName}</code> to your site&apos;s root, containing only this key:</p>
          <pre className="indexnow-key"><code>{st.key}</code></pre>
          <p className="muted tiny">It should open at <span className="mono">{st.keyUrl}</span>. Then check it here.</p>
          {canEdit && <button type="button" className="btn btn-sm" disabled={!!busy} onClick={verify}>{busy === "verify" ? "Checking…" : "Check the file"}</button>}
        </>
      ) : (
        <>
          <p className="small">Key file found{st.sentAt ? <>; pages last sent {when(st.sentAt)}</> : null}.</p>
          {canEdit && (
            <>
              <details className="indexnow-paste">
                <summary className="small">Send specific URLs instead</summary>
                <label htmlFor={`inow-${site.id}`} className="sr-only">URLs to send, one per line</label>
                <textarea id={`inow-${site.id}`} className="field" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={`${site.url.replace(/\/$/, "")}/new-page`} />
              </details>
              <button type="button" className="btn btn-sm" disabled={!!busy || (!paste.trim() && !st.reportPages)} onClick={submit}>
                {busy === "submit" ? "Sending…" : paste.trim() ? "Send these URLs" : st.reportPages ? `Send ${fmtNum(st.reportPages)} pages from the latest report` : "Run a full report first"}
              </button>
            </>
          )}
        </>
      )}
      {msg && <p className={`small ${msg.ok ? "c-pass" : "c-fail"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </div>
  );
}
