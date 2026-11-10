"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Lock, Star } from "lucide-react";
import { api, useConfig } from "@/lib/client";
import { track } from "@/lib/track";
import { countryName, STORE_COUNTRIES } from "@/lib/countries";
import type { AppCheck as Check, AppListing, Store } from "@/lib/appStore";
import type { ListingAdvice, ReviewInsights } from "@/lib/appPremium";
import { Pill, Ring, SoonBadge } from "./ui";

interface Result { listing: AppListing; score: number; checks: Check[] }
type CompareRow =
  | { ok: true; title: string; store: Store; url: string; score: number; rating: number | null; ratingCount: number | null; screenshots: number; lastUpdated: string | null }
  | { ok: false; input: string; error: string };

const TOOL_URL = "/tools/app-store-checker";
const daysAgo = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000)) : null);

/** App Store and Google Play listing check. With `redirect`, the form sends people to the full tool page. */
export default function AppCheck({ redirect = false }: { redirect?: boolean }) {
  const { on } = useConfig();
  const [app, setApp] = useState("");
  const [store, setStore] = useState<Store>("apple");
  const [country, setCountry] = useState("us");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const countries = useMemo(() => STORE_COUNTRIES.map((c) => ({ c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)), []);

  const run = async (a = app, s = store, cc = country) => {
    if (!a.trim()) return setErr("Enter an App Store or Google Play link, or the app's name.");
    if (redirect) {
      window.location.href = `${TOOL_URL}?${new URLSearchParams({ app: a, store: s, country: cc })}#app-check`;
      return;
    }
    setBusy(true);
    setErr("");
    setRes(null);
    track("Tool used", { tool: "app-store" });
    try {
      setRes(await api<Result>(`/api/app-check?${new URLSearchParams({ app: a, store: s, country: cc })}`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The check failed.");
    } finally {
      setBusy(false);
    }
  };

  // Links from the home page carry the app in the address, so start the check straight away.
  useEffect(() => {
    if (redirect) return;
    const p = new URLSearchParams(window.location.search);
    const a = p.get("app");
    if (!a) return;
    const s: Store = p.get("store") === "google" ? "google" : "apple";
    const cc = STORE_COUNTRIES.includes(p.get("country") ?? "") ? (p.get("country") as string) : "us";
    setApp(a);
    setStore(s);
    setCountry(cc);
    void run(a, s, cc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-check" id="app-check">
      <form className="search" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <label htmlFor="app-input" className="sr-only">App Store or Google Play link, or app name</label>
        <input id="app-input" value={app} onChange={(e) => setApp(e.target.value)} placeholder="App Store or Google Play link, or app name" autoComplete="off" />
        <button type="submit" disabled={busy}>{busy ? "Checking…" : "Check app"}</button>
      </form>
      <div className="app-controls">
        <div className="segmented app-store-toggle" role="radiogroup" aria-label="Store to search when you enter a name">
          {(["apple", "google"] as Store[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={store === s} className={store === s ? "on" : ""} onClick={() => setStore(s)}>
              {s === "apple" ? "App Store" : "Google Play"}
            </button>
          ))}
        </div>
        <label className="app-country">
          <span className="sr-only">Country</span>
          <select className="field" value={country} onChange={(e) => setCountry(e.target.value)}>
            {countries.map(({ c, name }) => <option key={c} value={c}>{name}</option>)}
          </select>
        </label>
      </div>
      <p className="app-hint muted small">Paste a store link, or type a name and pick the store. Links choose the store for you.</p>
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {busy && <p className="muted small" role="status">Reading the store listing…</p>}
      {res && <AppResult res={res} premium={on("appPremium")} />}
    </div>
  );
}

function AppResult({ res, premium }: { res: Result; premium: boolean }) {
  const { listing: l, score, checks } = res;
  const groups = [...new Set(checks.map((c) => c.group))];
  const days = daysAgo(l.lastUpdated);
  return (
    <div className="app-result">
      <div className="card app-head">
        <div className="app-id">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.icon && <img className="app-icon" src={l.icon} alt="" width={64} height={64} referrerPolicy="no-referrer" />}
          <div>
            <h2>{l.title}</h2>
            <p className="muted small">{l.developer} · {l.store === "apple" ? "App Store" : "Google Play"} · {countryName(l.country)}</p>
            <ul className="app-stats">
              <li><Star size={15} aria-hidden="true" /> {l.rating !== null ? l.rating.toFixed(1) : "No rating"}{l.ratingCount !== null && <span className="muted"> ({l.ratingCount.toLocaleString("en-US")})</span>}</li>
              {l.installs && <li>{l.installs} installs</li>}
              {l.category && <li>{l.category}</li>}
              {days !== null && <li>Updated {days === 0 ? "today" : `${days} days ago`}</li>}
              {l.price && <li>{l.price}</li>}
            </ul>
            <a className="small" href={l.url} target="_blank" rel="noopener">Open the store page <ArrowRight size={13} aria-hidden="true" /></a>
          </div>
        </div>
        <Ring value={score} size={120} label="listing score" />
      </div>
      {groups.map((g) => (
        <section key={g} className="app-group" aria-label={g}>
          <h3>{g}</h3>
          <ul className="app-checks">
            {checks.filter((c) => c.group === g).map((c) => (
              <li key={c.id}>
                <Pill status={c.status} />
                <div>
                  <strong>{c.title}</strong>
                  <p>{c.detail}</p>
                  {c.fix && <p className="app-fix">{c.fix}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Premium listing={l} premium={premium} />
    </div>
  );
}

function Premium({ listing: l, premium }: { listing: AppListing; premium: boolean }) {
  const body = { app: l.store === "apple" ? l.id : l.id, store: l.store, country: l.country };
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [advice, setAdvice] = useState<ListingAdvice | null>(null);
  const [insights, setInsights] = useState<ReviewInsights | null>(null);
  const [rivals, setRivals] = useState("");
  const [rows, setRows] = useState<CompareRow[] | null>(null);
  const call = async <T,>(action: string, extra: Record<string, unknown> = {}): Promise<T | null> => {
    setBusy(action);
    setErr("");
    try {
      return await api<T>("/api/app-check/premium", { method: "POST", body: JSON.stringify({ ...body, ...extra, action }) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
      return null;
    } finally {
      setBusy("");
    }
  };

  if (!premium)
    return (
      <div className="card app-premium locked">
        <div className="app-premium-head"><Lock size={18} aria-hidden="true" /><h3>Premium for apps</h3><SoonBadge plan="Pro" /></div>
        <ul>
          <li><strong>AI listing rewrite:</strong> new name, subtitle and opening lines, keyword ideas and screenshot captions.</li>
          <li><strong>Review analysis:</strong> the top complaints, praise and feature requests from recent reviews.</li>
          <li><strong>Competitor comparison:</strong> your listing next to up to 3 rivals, in either store.</li>
          <li><strong>Weekly monitoring:</strong> an email when your rating drops or a competitor updates.</li>
        </ul>
        <a className="btn btn-primary" href="/pricing#waitlist">Get told when it opens <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    );

  return (
    <div className="app-premium-grid">
      <div className="card app-premium">
        <h3>AI listing rewrite</h3>
        <p className="muted small">Name, {l.store === "apple" ? "subtitle" : "short description"} and opening options, based only on what your listing says.</p>
        <button className="btn btn-primary" disabled={!!busy} onClick={async () => setAdvice(await call<ListingAdvice>("advice"))}>{busy === "advice" ? "Writing…" : "Rewrite my listing"}</button>
        {advice && (
          <div className="app-advice">
            <h4>Name options</h4><ul>{advice.names.map((x) => <li key={x.text}><strong>{x.text}</strong> <span className="muted">({x.text.length}/30)</span><br /><span className="small muted">{x.why}</span></li>)}</ul>
            <h4>{l.store === "apple" ? "Subtitle" : "Short description"} options</h4><ul>{advice.subtitles.map((x) => <li key={x.text}><strong>{x.text}</strong> <span className="muted">({x.text.length}/{l.store === "apple" ? 30 : 80})</span><br /><span className="small muted">{x.why}</span></li>)}</ul>
            <h4>New opening</h4><p>{advice.opening}</p>
            <h4>Keyword ideas</h4><p className="mono small">{advice.keywords.join(", ")}</p>
            <h4>Screenshot captions</h4><ol>{advice.screenshotIdeas.map((x) => <li key={x}>{x}</li>)}</ol>
          </div>
        )}
      </div>
      <div className="card app-premium">
        <h3>Review analysis</h3>
        <p className="muted small">Groups recent reviews into complaints, praise and requests.</p>
        <button className="btn btn-primary" disabled={!!busy} onClick={async () => setInsights(await call<ReviewInsights>("reviews"))}>{busy === "reviews" ? "Reading reviews…" : "Analyse reviews"}</button>
        {insights && (
          <div className="app-advice">
            <p>{insights.summary} <span className="muted small">({insights.reviewsRead} reviews{insights.averageRecent !== null ? `, averaging ${insights.averageRecent}★` : ""})</span></p>
            {insights.complaints.length > 0 && <><h4>Top complaints</h4><ul>{insights.complaints.map((x) => <li key={x.theme}><strong>{x.theme}</strong> <span className="muted small">{x.share}</span><br /><q className="small">{x.example}</q></li>)}</ul></>}
            {insights.praise.length > 0 && <><h4>What people like</h4><ul>{insights.praise.map((x) => <li key={x.theme}><strong>{x.theme}</strong> <span className="muted small">{x.share}</span></li>)}</ul></>}
            {insights.requests.length > 0 && <><h4>Feature requests</h4><ul>{insights.requests.map((x) => <li key={x}>{x}</li>)}</ul></>}
          </div>
        )}
      </div>
      <div className="card app-premium">
        <h3>Compare with competitors</h3>
        <label className="small" htmlFor="app-rivals">Up to 3 competitors, one per line (links or names, either store)</label>
        <textarea id="app-rivals" className="field" rows={3} value={rivals} onChange={(e) => setRivals(e.target.value)} placeholder={"Another app's store link\nor its name"} />
        <button className="btn btn-primary" disabled={!!busy} onClick={async () => { const r = await call<{ rows: CompareRow[] }>("compare", { competitors: rivals.split("\n") }); if (r) setRows(r.rows); }}>{busy === "compare" ? "Comparing…" : "Compare"}</button>
        {rows && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>App</th><th>Score</th><th>Rating</th><th>Screenshots</th><th>Updated</th></tr></thead>
              <tbody>
                {rows.map((r, i) => r.ok ? (
                  <tr key={i}><td><a href={r.url} target="_blank" rel="noopener">{r.title}</a>{i === 0 && <span className="muted small"> (you)</span>}</td><td>{r.score}</td><td>{r.rating !== null ? `${r.rating.toFixed(1)} (${(r.ratingCount ?? 0).toLocaleString("en-US")})` : "None"}</td><td>{r.screenshots}</td><td>{daysAgo(r.lastUpdated) ?? "?"} days ago</td></tr>
                ) : (
                  <tr key={i}><td>{r.input}</td><td colSpan={4} className="c-fail small">{r.error}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </div>
  );
}
