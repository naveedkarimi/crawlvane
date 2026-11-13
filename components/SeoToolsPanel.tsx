"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Copy, Download, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { renderMarkdown } from "@/lib/blog/markdown";
import type { TrackedKeyword } from "@/lib/rankTracking";
import type { Article, ArticleRow } from "@/lib/ai/writer";
import type { InboundLink, LinkedPage } from "@/lib/bing";

type Site = { id: string; domain: string };
const fmt = (n: number) => n.toLocaleString("en-US");
const path = (u: string) => { try { const x = new URL(u); return x.pathname + x.search || "/"; } catch { return u; } };
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Keyword rankings, backlinks and the AI writer, in one dashboard section. */
export default function SeoToolsPanel({ sites, canEdit }: { sites: Site[]; canEdit: boolean }) {
  return (
    <section className="dash-section seo-tools" aria-label="Keywords and content">
      {sites.length ? <><Rankings sites={sites} canEdit={canEdit} /><Backlinks sites={sites} /></> : <p className="card muted small">Add a website first (Websites) to track keywords and see backlinks.</p>}
      <Writer sites={sites} canEdit={canEdit} />
    </section>
  );
}

function SitePicker({ sites, value, onChange, id }: { sites: Site[]; value: string; onChange: (v: string) => void; id: string }) {
  if (sites.length < 2) return null;
  return (
    <label className="seo-site-pick"><span className="sr-only">Website</span>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {sites.map((s) => <option key={s.id} value={s.id}>{s.domain}</option>)}
      </select>
    </label>
  );
}

// ---------- Rankings ----------
function Spark({ points }: { points: (number | null)[] }) {
  const vals = points.filter((p): p is number => p !== null);
  if (vals.length < 2) return null;
  const max = Math.max(...vals), min = Math.min(...vals), w = 72, h = 22;
  const xy = points.map((p, i) => (p === null ? null : [((i / (points.length - 1)) * w).toFixed(1), (((p - min) / Math.max(1, max - min)) * (h - 4) + 2).toFixed(1)]));
  // Lower position is better, so better positions sit higher on the chart.
  return <svg className="kw-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={xy.filter(Boolean).map((p) => p!.join(",")).join(" ")} /></svg>;
}

function Rankings({ sites, canEdit }: { sites: Site[]; canEdit: boolean }) {
  const [site, setSite] = useState(sites[0]?.id ?? "");
  const [data, setData] = useState<{ gscLinked: boolean; keywords: TrackedKeyword[] } | null>(null);
  const [add, setAdd] = useState("");
  const [ideas, setIdeas] = useState<{ keyword: string; impressions: number; position: number }[] | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(() => api<{ gscLinked: boolean; keywords: TrackedKeyword[] }>(`/api/me/keywords?site=${site}`).then(setData).catch((e) => setErr(errText(e, "Couldn't load keywords."))), [site]);
  useEffect(() => { setData(null); setIdeas(null); setErr(""); if (site) void load(); }, [site, load]);

  const run = async (what: string, fn: () => Promise<unknown>) => {
    setBusy(what);
    setErr("");
    try { await fn(); await load(); } catch (e) { setErr(errText(e, "Something went wrong.")); } finally { setBusy(""); }
  };
  const addWords = (words: string[]) => run("add", async () => {
    await api("/api/me/keywords", { method: "POST", body: JSON.stringify({ siteId: site, keywords: words }) });
    setAdd("");
    setIdeas((x) => x?.filter((i) => !words.includes(i.keyword)) ?? null);
  });
  const submit = (e: FormEvent) => { e.preventDefault(); const words = add.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean); if (words.length) void addWords(words); };

  return (
    <div className="card dash-card">
      <div className="card-head">
        <div>
          <h2>Keyword rankings</h2>
          <p className="muted small">Your average position in Google for each keyword, from your own Search Console, checked weekly. Not estimates.</p>
        </div>
        <SitePicker sites={sites} value={site} onChange={setSite} id="kw-site" />
      </div>
      {data && !data.gscLinked && <p className="kw-note small">Link this site to its Search Console property (Websites → Search Console and GA4) to see positions. You can add keywords now.</p>}
      {canEdit && (
        <form className="kw-add" onSubmit={submit}>
          <label htmlFor="kw-new" className="sr-only">Keywords to track, separated by commas</label>
          <input id="kw-new" className="field" value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add keywords, separated by commas" />
          <button type="submit" className="btn btn-primary" disabled={!!busy || !add.trim()}>{busy === "add" ? "Adding…" : "Track"}</button>
          {data?.gscLinked && <button type="button" className="btn" disabled={!!busy} onClick={() => run("ideas", async () => setIdeas((await api<{ suggestions: typeof ideas }>(`/api/me/keywords?site=${site}&suggest=1`)).suggestions))}>{busy === "ideas" ? "Loading…" : "Ideas from Search Console"}</button>}
        </form>
      )}
      {ideas && (ideas.length ? (
        <div className="kw-ideas">
          <p className="muted small">Searches you already appear for. Click to track:</p>
          {ideas.map((i) => <button key={i.keyword} type="button" className="kw-chip" disabled={!!busy} onClick={() => addWords([i.keyword])}>{i.keyword} <span>#{i.position} · {fmt(i.impressions)}</span></button>)}
        </div>
      ) : <p className="muted small">No new ideas: you&apos;re tracking all your top searches.</p>)}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {data && data.keywords.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="kw-table">
              <thead><tr><th>Keyword</th><th>Position</th><th>Change</th><th>Trend</th><th>Clicks</th><th>Impressions</th>{canEdit && <th><span className="sr-only">Remove</span></th>}</tr></thead>
              <tbody>
                {data.keywords.map((k) => (
                  <tr key={k.id}>
                    <td>{k.keyword}</td>
                    <td>{k.latest ? (k.latest.position !== null ? <strong>{k.latest.position}</strong> : <span className="muted small">Not ranking</span>) : <span className="muted small">Not checked</span>}</td>
                    <td>{k.change === null || k.change === 0 ? <span className="muted">–</span> : k.change > 0
                      ? <span className="c-pass kw-move"><ArrowUp size={13} aria-hidden="true" />{k.change}<span className="sr-only"> places better</span></span>
                      : <span className="c-fail kw-move"><ArrowDown size={13} aria-hidden="true" />{-k.change}<span className="sr-only"> places worse</span></span>}</td>
                    <td><Spark points={k.points.map((p) => p.position)} /></td>
                    <td>{k.latest ? fmt(k.latest.clicks) : "–"}</td>
                    <td>{k.latest ? fmt(k.latest.impressions) : "–"}</td>
                    {canEdit && <td><button type="button" className="link kw-remove" aria-label={`Stop tracking ${k.keyword}`} onClick={() => run("remove", () => api(`/api/me/keywords?id=${k.id}`, { method: "DELETE" }))}><Trash2 size={14} aria-hidden="true" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="kw-foot">
            <p className="muted tiny">Average position over the last 7 days, as Search Console reports it. Checked every week.</p>
            {canEdit && data.gscLinked && <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => run("refresh", () => api("/api/me/keywords", { method: "POST", body: JSON.stringify({ siteId: site, refresh: true }) }))}><RefreshCw size={14} aria-hidden="true" /> {busy === "refresh" ? "Checking…" : "Check now"}</button>}
          </div>
        </>
      )}
      {data && !data.keywords.length && <p className="muted small">No keywords yet. Add the searches you want to rank for.</p>}
    </div>
  );
}

// ---------- Backlinks ----------
function Backlinks({ sites }: { sites: Site[] }) {
  const [site, setSite] = useState(sites[0]?.id ?? "");
  const [counts, setCounts] = useState<{ pages: LinkedPage[]; totalPages: number } | null | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ links: InboundLink[]; domains: { domain: string; links: number }[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setCounts(undefined); setOpen(null); setErr("");
    if (site) api<{ counts: typeof counts }>(`/api/me/backlinks?site=${site}`).then((r) => setCounts(r.counts)).catch((e) => { setErr(errText(e, "Couldn't load backlinks.")); setCounts(null); });
  }, [site]);
  const show = async (url: string) => {
    if (open === url) return setOpen(null);
    setOpen(url); setDetail(null); setErr("");
    try { setDetail((await api<{ detail: typeof detail }>(`/api/me/backlinks?site=${site}&url=${encodeURIComponent(url)}`)).detail); } catch (e) { setErr(errText(e, "Couldn't load links.")); }
  };
  return (
    <div className="card dash-card">
      <div className="card-head">
        <div>
          <h2>Backlinks</h2>
          <p className="muted small">Pages on other sites that link to you, from Bing&apos;s index (Bing Webmaster Tools). Read when you look, not stored.</p>
        </div>
        <SitePicker sites={sites} value={site} onChange={setSite} id="bl-site" />
      </div>
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {counts === undefined && !err && <p className="muted small">Loading…</p>}
      {counts === null && !err && <p className="kw-note small">Connect Bing and link this site under Websites → Bing and IndexNow to see backlinks.</p>}
      {counts && (counts.pages.length ? (
        <div className="table-wrap">
          <table className="kw-table">
            <thead><tr><th>Your page</th><th>Links to it</th><th><span className="sr-only">Details</span></th></tr></thead>
            <tbody>
              {counts.pages.slice(0, 25).map((p) => (
                <tr key={p.url}>
                  <td className="mono small">{path(p.url)}
                    {open === p.url && (
                      <div className="bl-detail">
                        {!detail ? <p className="muted small">Loading…</p> : (
                          <>
                            {detail.domains.length > 0 && <p className="small"><strong>From:</strong> {detail.domains.slice(0, 8).map((d) => `${d.domain} (${d.links})`).join(", ")}</p>}
                            <ul>{detail.links.slice(0, 20).map((l, i) => <li key={i}><a href={l.from} target="_blank" rel="noopener noreferrer nofollow">{l.from.replace(/^https?:\/\//, "").slice(0, 70)}</a>{l.anchor && <span className="muted"> · “{l.anchor}”</span>}</li>)}</ul>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{fmt(p.links)}</td>
                  <td><button type="button" className="link small" aria-expanded={open === p.url} onClick={() => show(p.url)}>{open === p.url ? "Hide" : "Who links"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted small">Bing hasn&apos;t found links to this site yet.</p>)}
    </div>
  );
}

// ---------- AI writer ----------
function Writer({ sites, canEdit }: { sites: Site[]; canEdit: boolean }) {
  const [list, setList] = useState<ArticleRow[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [form, setForm] = useState({ topic: "", siteId: sites[0]?.id ?? "", audience: "", length: "medium", notes: "" });
  const [article, setArticle] = useState<Article | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");
  const load = () => api<{ articles: ArticleRow[]; configured: boolean }>("/api/me/writer").then((r) => { setList(r.articles); setConfigured(r.configured); }).catch(() => setList([]));
  useEffect(() => { void load(); }, []);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const write = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(""); setArticle(null);
    try {
      setArticle((await api<{ article: Article }>("/api/me/writer", { method: "POST", body: JSON.stringify(form) })).article);
      void load();
    } catch (e) { setErr(errText(e, "Couldn't write the article.")); } finally { setBusy(false); }
  };
  const copy = async (what: string, text: string) => { await navigator.clipboard.writeText(text).catch(() => {}); setCopied(what); setTimeout(() => setCopied(""), 1500); };
  const full = (a: Article) => `# ${a.title}\n\n${a.markdown}${a.faq.length ? `\n\n## Frequently asked questions\n\n${a.faq.map((f) => `### ${f.question}\n\n${f.answer}`).join("\n\n")}` : ""}\n`;
  const download = (a: Article) => {
    const url = URL.createObjectURL(new Blob([full(a)], { type: "text/markdown" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `${a.slug || "article"}.md` });
    link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="card dash-card">
      <div className="card-head">
        <div>
          <h2>AI writer</h2>
          <p className="muted small">Article drafts built to be quoted by search engines and AI: a direct answer first, question headings and an FAQ with schema. It only uses the facts you give it; anything missing becomes a [placeholder].</p>
        </div>
      </div>
      {!configured ? <p className="kw-note small">The AI writer needs the Anthropic API key to be set up.</p> : canEdit && (
        <form className="writer-form" onSubmit={write}>
          <label className="lbl" htmlFor="w-topic">Topic or keyword</label>
          <input id="w-topic" className="field" required minLength={3} maxLength={160} value={form.topic} onChange={set("topic")} placeholder="e.g. how much does a boiler service cost" />
          <div className="writer-row">
            {sites.length > 0 && (
              <label><span className="lbl">For site</span>
                <select className="field" value={form.siteId} onChange={set("siteId")}>{sites.map((s) => <option key={s.id} value={s.id}>{s.domain}</option>)}</select>
              </label>
            )}
            <label><span className="lbl">Length</span>
              <select className="field" value={form.length} onChange={set("length")}><option value="short">Short (about 600 words)</option><option value="medium">Medium (about 1,000)</option><option value="long">Long (about 1,500)</option></select>
            </label>
          </div>
          <label className="lbl" htmlFor="w-aud">Who it&apos;s for (optional)</label>
          <input id="w-aud" className="field" maxLength={200} value={form.audience} onChange={set("audience")} placeholder="e.g. homeowners in Leeds" />
          <label className="lbl" htmlFor="w-notes">Facts to use (optional, but the more the better)</label>
          <textarea id="w-notes" className="field" rows={4} maxLength={4000} value={form.notes} onChange={set("notes")} placeholder="Your prices, services, areas, experience, what makes you different…" />
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Writing… (up to a minute)" : "Write the article"}</button>
        </form>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {article && (
        <div className="writer-out">
          <div className="writer-meta">
            <p className="small"><strong>Title:</strong> {article.title}</p>
            <p className="small"><strong>Meta description:</strong> {article.metaDescription}</p>
            <p className="muted small">{fmt(article.words)} words · URL slug <span className="mono">/{article.slug}</span></p>
            {article.placeholders.length > 0 && <p className="kw-note small">Fill in before publishing: {article.placeholders.slice(0, 10).join(", ")}</p>}
          </div>
          <div className="writer-actions">
            <button type="button" className="btn btn-sm" onClick={() => copy("md", full(article))}><Copy size={14} aria-hidden="true" /> {copied === "md" ? "Copied" : "Copy Markdown"}</button>
            <button type="button" className="btn btn-sm" onClick={() => download(article)}><Download size={14} aria-hidden="true" /> Download .md</button>
            {article.faqJsonLd && <button type="button" className="btn btn-sm" onClick={() => copy("faq", article.faqJsonLd)}><Copy size={14} aria-hidden="true" /> {copied === "faq" ? "Copied" : "Copy FAQ schema"}</button>}
          </div>
          <article className="writer-preview prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(full(article)).html }} />
        </div>
      )}
      {list && list.length > 0 && (
        <div className="writer-list">
          <h3>Your drafts</h3>
          <ul>
            {list.map((a) => (
              <li key={a.id}>
                <button type="button" className="link" onClick={async () => { setErr(""); try { setArticle((await api<{ article: Article }>(`/api/me/writer?id=${a.id}`)).article); } catch (e) { setErr(errText(e, "Couldn't open the draft.")); } }}>{a.title}</button>
                <span className="muted small"> · {fmt(a.words)} words · {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                {canEdit && <button type="button" className="link kw-remove" aria-label={`Delete ${a.title}`} onClick={async () => { if (window.confirm("Delete this draft?")) { await api(`/api/me/writer?id=${a.id}`, { method: "DELETE" }).catch(() => {}); void load(); } }}><Trash2 size={14} aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
