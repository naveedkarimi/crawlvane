"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { api, download, useConfig } from "@/lib/client";
import { fullReportHref } from "@/lib/appLinks";
import { reportToMarkdown } from "@/lib/reportMarkdown";
import type { FixPlan, Report, ResearchResult, VisibilityResult } from "@/lib/reportTypes";
import type { SocialPosts } from "@/lib/social";
import { CopyBlock, Pill, Ring, SoonBadge } from "./ui";
import SocialCard from "./SocialCard";
import AiView from "./AiView";
import SpeedTest, { useSpeedTest } from "./SpeedTest";
import ReportProgress from "./ReportProgress";
import ResultCounts from "./ResultCounts";
import { workerScript } from "@/lib/workerTemplate";
import { coverageCsv } from "@/lib/siteDiagnostics";
import { topIssues, type ReportDiff } from "@/lib/reportCompare";
import { cell as csvCell } from "@/lib/issueExport";

type IssueFilter = "all" | "fail" | "warn";
type Tab = "overview" | "issues" | "pages" | "diagnostics" | "competitors" | "fixes" | "plan" | "social" | "visibility" | "research";
const isErr = (x: unknown): x is { error: string } => !!x && typeof x === "object" && "error" in x;
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export default function ReportView({ id }: { id: string }) {
  const pathname = usePathname();
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [printAll, setPrintAll] = useState(false);
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  // Finished reports open straight away; a run you watched plays out to its last line first.
  const [watching, setWatching] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { cfg, on } = useConfig();
  const speed = useSpeedTest(r?.home?.facts.finalUrl ?? r?.site?.origin);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const data = await api<Report>(`/api/reports/${id}`);
        if (stop) return;
        setR(data);
        if (data.status === "queued" || data.status === "running") {
          setWatching(true);
          timer = setTimeout(poll, 1000);
        }
      } catch (e) {
        if (!stop) setErr(e instanceof Error ? e.message : "Couldn't load report");
      }
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  useEffect(() => {
    const after = () => setPrintAll(false);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  const tabs = useMemo(() => {
    if (!r) return [] as { key: Tab; label: string }[];
    const t: { key: Tab; label: string }[] = [
      { key: "overview", label: "Overview" },
      { key: "issues", label: `Issues${r.site ? ` (${r.site.issues.length})` : ""}` },
      { key: "pages", label: `Pages${r.site ? ` (${r.site.pagesCrawled})` : ""}` },
    ];
    if (r.site?.diagnostics) t.push({ key: "diagnostics", label: "Diagnostics" });
    if (r.competitors?.length) t.push({ key: "competitors", label: "Competitors" });
    if (r.fixes?.length) t.push({ key: "fixes", label: "Fixes" });
    if (r.plan) t.push({ key: "plan", label: "AI plan" });
    if (r.social || r.socialPosts) t.push({ key: "social", label: "Social" });
    if (r.visibility) t.push({ key: "visibility", label: "AI visibility" });
    if (r.research) t.push({ key: "research", label: "Research" });
    return t;
  }, [r]);

  if (err) return <div className="error" style={{ marginTop: 40 }}>{err}</div>;
  if (!r) return <div className="loading"><div className="spinner" /> Loading report…</div>;

  const wl = r.input.options.whiteLabel;
  const show = (t: Tab) => printAll || tab === t;

  if (r.status === "queued" || r.status === "running" || (r.status === "done" && watching && !revealed)) {
    return <ReportProgress report={r} onDone={() => setRevealed(true)} />;
  }
  if (r.status === "error") {
    return (
      <div className="card progress-card">
        <h2>Report failed</h2>
        <div className="error">{r.error}</div>
        <a className="btn" href={fullReportHref(pathname, r.input.url)}>Try again</a>
      </div>
    );
  }

  const s = r.site!;
  const counts = { fail: s.issues.filter((i) => i.status === "fail").length, warn: s.issues.filter((i) => i.status === "warn").length };

  return (
    <div className="report">
      <div className="card summary report-head" style={wl?.color ? { borderTopColor: wl.color } : undefined}>
        <Ring value={s.scores.overall} size={140} label="site score" />
        <div className="summary-text">
          {wl && (
            <div className="wl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {wl.logoUrl && <img src={wl.logoUrl} alt={wl.name} />}
              <span>Prepared by {wl.name}</span>
            </div>
          )}
          <h2>{host(s.origin)}</h2>
          <p className="muted small">
            {s.pagesCrawled} pages audited · {new Date(r.createdAt).toLocaleString()}
          </p>
          <ResultCounts
            counts={counts}
            active={tab === "issues" && issueFilter !== "all" ? issueFilter : null}
            onPick={(k) => {
              setIssueFilter(k === "fail" ? "fail" : "warn");
              setTab("issues");
              requestAnimationFrame(() => {
                const el = document.getElementById("report-issues");
                el?.scrollIntoView({ block: "start" });
                el?.focus({ preventScroll: true });
              });
            }}
          />
          <div className="actions no-print">
            <button
              className="primary"
              onClick={() => {
                setPrintAll(true);
                setTimeout(() => window.print(), 200);
              }}
            >
              Save as PDF
            </button>
            <button onClick={() => download(`report-${host(s.origin)}.md`, reportToMarkdown(r), "text/markdown")}>Markdown</button>
            <button onClick={() => download(`report-${host(s.origin)}.json`, JSON.stringify(r, null, 2), "application/json")}>JSON</button>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy link</button>
          </div>
        </div>
      </div>

      <div className="cats">
        {(["seo", "aeo", "geo"] as const).map((c) => (
          <div key={c} className="card cat">
            <Ring value={s.scores[c]} size={72} />
            <div>
              <strong>{c === "geo" ? "GEO / LLM" : c.toUpperCase()}</strong>
              <span className="muted small">{c === "seo" ? "Search engines" : c === "aeo" ? "Answer engines" : "AI search & citations"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs scroll no-print" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {show("overview") && (
        <section>
          {printAll && <h2 className="print-h">Overview</h2>}
          {r.site && r.status === "done" && <ExecutiveSummary r={r} />}
          {r.home && on("aiView") && (
            <AiView
              facts={r.home.facts}
              canScreenshot={on("pagespeed")}
              screenshot={speed.screenshot}
              onLoadScreenshot={() => speed.run("mobile")}
              loadingScreenshot={speed.loading}
              screenshotError={speed.error}
              shareImageUrl={r.status === "done" ? `/api/reports/${id}/ai-image` : undefined}
            />
          )}
          {r.home && on("pagespeed") && !printAll && <SpeedTest url={r.home.facts.finalUrl} speed={speed} />}
          {r.speed ? <SiteSpeedCard speed={r.speed} /> : null}
          <div className="card">
            <h3>Top priorities</h3>
            <ul className="plain">
              {s.issues.slice(0, 6).map((i) => (
                <li key={i.id} className={`check ${i.status}`}>
                  <Pill status={i.status} />
                  <div>
                    <div className="check-title">
                      {i.title} <span className="tag">{i.count} page{i.count === 1 ? "" : "s"}</span>
                    </div>
                    {i.fix && <div className="check-fix">→ {i.fix}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {r.competitors?.length ? <CompetitorScores r={r} /> : null}
          {cfg && !printAll && (
            <div className="feature-grid">
              {!r.visibility && (
                <div className="card soon-card">
                  <strong>AI visibility test</strong> {on("aiVisibility") ? <span className="live">Available</span> : <SoonBadge plan="pro" />}
                  <p className="muted small">See if ChatGPT, Claude, Perplexity and Gemini mention or cite you for real buyer questions.</p>
                </div>
              )}
              {!r.research && (
                <div className="card soon-card">
                  <strong>Deep niche research</strong> {on("deepResearch") ? <span className="live">Available</span> : <SoonBadge plan="pro" />}
                  <p className="muted small">Questions your audience asks, sources AI trusts and a content plan.</p>
                </div>
              )}
              {!r.socialPosts && (
                <div className="card soon-card">
                  <strong>AI social media posts</strong> {on("socialPosts") ? <span className="live">Available</span> : <SoonBadge plan="pro" />}
                  <p className="muted small">Ready-to-post content for LinkedIn, X, Facebook, Instagram and Reddit.</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {show("issues") && <IssuesTab r={r} printAll={printAll} filter={issueFilter} onFilter={setIssueFilter} />}
      {show("pages") && <PagesTab r={r} printAll={printAll} />}
      {show("diagnostics") && r.site?.diagnostics ? <DiagnosticsTab r={r} printAll={printAll} /> : null}
      {show("competitors") && r.competitors?.length ? <CompetitorsTab r={r} printAll={printAll} /> : null}
      {show("fixes") && r.fixes?.length ? (
        <section>
          {printAll && <h2 className="print-h">Ready-to-paste fixes</h2>}
          <FixActions r={r} />
          {r.fixes.map((f) => (
            <div key={f.id} className="card">
              <h3>{f.title}</h3>
              <p className="muted small">{f.description}</p>
              <CopyBlock content={f.content} filename={f.filename} />
            </div>
          ))}
        </section>
      ) : null}
      {show("plan") && r.plan ? <PlanTab plan={r.plan} printAll={printAll} /> : null}
      {show("social") && (r.social || r.socialPosts) ? (
        <section>
          {printAll && <h2 className="print-h">Social & brand presence</h2>}
          {r.social && <SocialCard social={r.social} />}
          {r.entity?.checked && <EntityCard e={r.entity} />}
          {r.socialPosts && <PostsCard posts={r.socialPosts} />}
        </section>
      ) : null}
      {show("visibility") && r.visibility ? <VisibilityTab v={r.visibility} printAll={printAll} /> : null}
      {show("research") && r.research ? <ResearchTab rs={r.research} printAll={printAll} /> : null}
    </div>
  );
}

function IssuesTab({ r, printAll, filter, onFilter }: { r: Report; printAll: boolean; filter: IssueFilter; onFilter: (f: IssueFilter) => void }) {
  const [cat, setCat] = useState<"all" | "seo" | "aeo" | "geo" | "site">("all");
  const [open, setOpen] = useState<string | null>(null);
  const status = printAll ? "all" : filter;
  const list = r.site!.issues.filter((i) => (cat === "all" || i.category === cat) && (status === "all" || i.status === status));
  return (
    <section>
      {printAll && <h2 className="print-h">All issues</h2>}
      <div className="issue-filters no-print" id="report-issues" tabIndex={-1}>
        <div className="tabs small-tabs">
          {(["all", "site", "seo", "aeo", "geo"] as const).map((c) => (
            <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
              {c === "all" ? "All" : c.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="tabs small-tabs status-tabs" role="group" aria-label="Filter issues by result">
          {([["all", "All results"], ["fail", "Failed"], ["warn", "Warnings"]] as const).map(([k, label]) => (
            <button key={k} type="button" className={status === k ? "on" : ""} aria-pressed={status === k} onClick={() => onFilter(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <ul className="plain">
          {list.map((i) => (
            <li key={i.id} className={`check ${i.status}`}>
              <Pill status={i.status} />
              <div style={{ flex: 1 }}>
                <div className="check-title">
                  {i.title} <span className="tag">{i.category.toUpperCase()}</span>
                  <span className="tag">{i.count} page{i.count === 1 ? "" : "s"}</span>
                </div>
                {i.sample && <div className="check-detail">{i.sample}</div>}
                {i.fix && <div className="check-fix">→ {i.fix}</div>}
                {(printAll || open === i.id) ? (
                  <ul className="examples">
                    {i.examples.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : (
                  <button className="link no-print" onClick={() => setOpen(i.id)}>
                    Show affected pages
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="muted">No issues in this category.</p>}
      </div>
    </section>
  );
}

function PagesTab({ r, printAll }: { r: Report; printAll: boolean }) {
  const [sort, setSort] = useState<"depth" | "score" | "words">("score");
  const pages = [...r.site!.pages].sort((a, b) =>
    sort === "score" ? a.scores.overall - b.scores.overall : sort === "words" ? a.wordCount - b.wordCount : a.depth - b.depth,
  );
  const links = r.site!.linkSuggestions ?? [];
  const path = (u: string) => { try { const x = new URL(u); return x.pathname + x.search || "/"; } catch { return u; } };
  return (
    <section>
      {printAll && <h2 className="print-h">Pages</h2>}
      {links.length > 0 && (
        <div className="card link-suggest">
          <h3>Internal links to add</h3>
          <p className="muted small">These pages have few links pointing to them, so search engines and AI crawlers find them less often. Each is matched with related pages that don&apos;t link to it yet.</p>
          <ol className="link-suggest-list">
            {links.map((l) => (
              <li key={l.target}>
                <div><strong>{l.targetTitle || path(l.target)}</strong> <span className="mono muted small">{path(l.target)}</span> <span className="muted small">· {l.inlinks} link{l.inlinks === 1 ? "" : "s"} in</span></div>
                <p className="small">Link to it from {l.from.map((f, i) => <span key={f.url}>{i > 0 && (i === l.from.length - 1 ? " and " : ", ")}<a href={f.url} target="_blank" rel="noopener noreferrer">{f.title || path(f.url)}</a></span>)}, with text like &ldquo;{l.anchor}&rdquo;.</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="card">
        <div className="row no-print" style={{ marginBottom: 10 }}>
          <span className="muted small">Sort:</span>
          {(["score", "words", "depth"] as const).map((k) => (
            <button key={k} className={`chip ${sort === k ? "on" : ""}`} onClick={() => setSort(k)}>
              {k}
            </button>
          ))}
          <span className="pages-export">
            <button type="button" className="chip" onClick={() => download("pages.csv", pagesCsv(pages), "text/csv")}>Pages CSV</button>
            {links.length > 0 && <button type="button" className="chip" onClick={() => download("internal-links-to-add.csv", linksCsv(links), "text/csv")}>Link ideas CSV</button>}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Status</th>
                <th>Score</th>
                <th>Words</th>
                <th title="Internal links pointing to this page, and links on it">Links in / out</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.url}>
                  <td className="url-cell">
                    <a href={p.url} target="_blank" rel="noopener noreferrer nofollow">{new URL(p.url).pathname || "/"}</a>
                    <div className="muted tiny">{p.title || p.error}</div>
                  </td>
                  <td className={p.status >= 400 || !p.status ? "c-fail" : ""}>{p.status || "err"}{p.noindex ? " · noindex" : ""}</td>
                  <td><span className={`score-chip ${p.scores.overall >= 85 ? "good" : p.scores.overall >= 60 ? "ok" : "bad"}`}>{p.scores.overall}</span></td>
                  <td>{p.wordCount}</td>
                  <td className="small">{p.inlinks} / {p.outlinks ?? "–"}</td>
                  <td className="small"><span className="c-fail">{p.fails.length}</span> / <span className="c-warn">{p.warns.length}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CompetitorScores({ r }: { r: Report }) {
  const rows = [
    { name: `You · ${host(r.home!.facts.finalUrl)}`, s: r.home!.scores, you: true },
    ...r.competitors!.filter((c) => c.ok && c.scores).map((c) => ({ name: host(c.url), s: c.scores!, you: false })),
  ];
  return (
    <div className="card">
      <h3>Homepage vs competitors</h3>
      {rows.map((x) => (
        <div key={x.name} className={`bar-row ${x.you ? "you" : ""}`}>
          <span className="bar-label">{x.name}</span>
          <div className="bar-outer"><div className={`bar-inner ${x.s.overall >= 85 ? "good" : x.s.overall >= 60 ? "ok" : "bad"}`} style={{ width: `${x.s.overall}%` }} /></div>
          <strong>{x.s.overall}</strong>
        </div>
      ))}
      {r.competitors!.filter((c) => !c.ok).map((c) => (
        <div key={c.url} className="bar-row">
          <span className="bar-label muted">{host(c.url)}</span>
          <span className="muted small">couldn&apos;t audit (site blocked our crawler or failed to load)</span>
        </div>
      ))}
    </div>
  );
}

function CompetitorsTab({ r, printAll }: { r: Report; printAll: boolean }) {
  const comps = r.competitors!;
  const you = r.home!;
  const cell = (v: unknown) => (typeof v === "boolean" ? (v ? "✓" : "✗") : String(v ?? "—"));
  return (
    <section>
      {printAll && <h2 className="print-h">Competitors</h2>}
      <CompetitorScores r={r} />
      <div className="card">
        <h3>Side by side</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>You</th>
                {comps.map((c) => <th key={c.url}>{host(c.url)}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ["SEO", you.scores.seo, (c: (typeof comps)[0]) => c.scores?.seo],
                ["AEO", you.scores.aeo, (c: (typeof comps)[0]) => c.scores?.aeo],
                ["GEO", you.scores.geo, (c: (typeof comps)[0]) => c.scores?.geo],
                ["Words on homepage", you.facts.wordCount, (c: (typeof comps)[0]) => c.wordCount],
                ["Question headings", you.facts.questionHeadings, (c: (typeof comps)[0]) => c.questionHeadings],
                ["llms.txt", you.facts.llmsTxtFound, (c: (typeof comps)[0]) => c.llmsTxt],
                ["Schema types", you.facts.schemaTypes.join(", ") || "—", (c: (typeof comps)[0]) => c.schemaTypes?.join(", ") || "—"],
                ["AI bots blocked", you.facts.bots.filter((b) => !b.allowed).map((b) => b.bot).join(", ") || "none", (c: (typeof comps)[0]) => c.aiBotsBlocked?.join(", ") || "none"],
              ].map(([label, yv, f]) => (
                <tr key={label as string}>
                  <td className="muted">{label as string}</td>
                  <td><strong>{cell(yv)}</strong></td>
                  {comps.map((c) => <td key={c.url}>{c.ok ? cell((f as (c: (typeof comps)[0]) => unknown)(c)) : <span className="muted">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {comps.filter((c) => !c.ok).map((c) => (
          <p key={c.url} className="c-warn small">Couldn&apos;t audit {host(c.url)}: {c.error}</p>
        ))}
      </div>
      {r.gaps && r.gaps.length > 0 && (
        <div className="card">
          <h3>What competitors do that you don&apos;t</h3>
          <ul className="plain">
            {r.gaps.map((g) => (
              <li key={g.id} className={`check ${g.you}`}>
                <Pill status={g.you} />
                <div>
                  <div className="check-title">{g.title} <span className="tag">{g.category.toUpperCase()}</span></div>
                  <div className="check-detail">Passing at: {g.competitorsPassing.join(", ")}</div>
                  {g.fix && <div className="check-fix">→ {g.fix}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PlanTab({ plan, printAll }: { plan: FixPlan | { error: string }; printAll: boolean }) {
  return (
    <section>
      {printAll && <h2 className="print-h">Fix plan</h2>}
      {isErr(plan) ? (
        <div className="error">AI plan failed: {plan.error}</div>
      ) : (
        <div className="card advice">
          <h3>AI fix plan</h3>
          <p>{plan.summary}</p>
          <ol>
            {plan.actions.map((a, i) => (
              <li key={i}>
                <div className="advice-head">
                  <span className={`prio ${a.priority}`}>{a.priority}</span>
                  <span className="tag">{a.category}</span>
                  <span className="tag">{a.effort}</span>
                  <strong>{a.title}</strong>
                </div>
                <p className="muted">{a.why}</p>
                <pre className="how">{a.how}</pre>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function PostsCard({ posts }: { posts: SocialPosts | { error: string } }) {
  if (isErr(posts)) return <div className="error">Social posts failed: {posts.error}</div>;
  return (
    <div className="card">
      <h3>Ready-to-post social content</h3>
      {posts.posts.map((p) => (
        <div key={p.network} style={{ marginBottom: 14 }}>
          <strong>{p.network}</strong>
          <CopyBlock content={p.text + (p.hashtags?.length ? "\n\n" + p.hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ") : "")} />
          {p.tip && <p className="muted small">Tip: {p.tip}</p>}
        </div>
      ))}
    </div>
  );
}

function VisibilityTab({ v, printAll }: { v: VisibilityResult | { error: string }; printAll: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  if (isErr(v)) return <div className="error">AI visibility test failed: {v.error}</div>;
  const max = Math.max(1, ...v.shareOfVoice.map((x) => x.mentions));
  return (
    <section>
      {printAll && <h2 className="print-h">AI visibility</h2>}
      <div className="cats">
        {v.summary.map((e) => (
          <div key={e.engine} className="card cat">
            <Ring value={e.mentionRate} size={72} />
            <div>
              <strong>{e.engine}</strong>
              <span className="muted small">Mentioned in {e.mentionRate}% · cited in {e.citationRate}% of {e.answered} answers</span>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Share of voice in AI answers</h3>
        {v.shareOfVoice.map((x, i) => (
          <div key={x.name} className={`bar-row ${i === 0 && x.name === v.brand ? "you" : ""}`}>
            <span className="bar-label">{x.name}</span>
            <div className="bar-outer"><div className="bar-inner" style={{ width: `${(x.mentions / max) * 100}%` }} /></div>
            <strong>{x.mentions}</strong>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Every question & answer</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Question</th><th>Engine</th><th>Mentioned</th><th>Cited</th><th></th></tr></thead>
            <tbody>
              {v.rows.map((row, i) => (
                <Fragment key={i}>
                  <tr>
                    <td className="small">{row.prompt}</td>
                    <td>{row.engine}</td>
                    <td className={row.mentioned ? "c-pass" : "c-fail"}>{row.error ? "error" : row.mentioned ? "Yes" : "No"}</td>
                    <td className={row.cited ? "c-pass" : "muted"}>{row.cited ? "Yes" : "No"}</td>
                    <td className="no-print"><button className="link" onClick={() => setOpen(open === i ? null : i)}>{open === i ? "Hide" : "Answer"}</button></td>
                  </tr>
                  {open === i && (
                    <tr>
                      <td colSpan={5} className="small">
                        {row.error ?? row.answerExcerpt}
                        {row.competitorsMentioned.length > 0 && <div className="muted">Competitors mentioned: {row.competitorsMentioned.join(", ")}</div>}
                        {row.citedUrls.length > 0 && <div className="muted tiny">Sources: {row.citedUrls.slice(0, 6).map(host).join(", ")}</div>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted tiny">Answers come from each provider&apos;s API with web search and can differ from what users see in the apps. Results vary run to run.</p>
      </div>
    </section>
  );
}

function ResearchTab({ rs, printAll }: { rs: ResearchResult | { error: string }; printAll: boolean }) {
  if (isErr(rs)) return <div className="error">Research failed: {rs.error}</div>;
  return (
    <section>
      {printAll && <h2 className="print-h">Niche research</h2>}
      <div className="card">
        <h3>Questions your audience asks</h3>
        <p className="muted small">Niche: {rs.niche}</p>
        <ul className="plain">
          {rs.audienceQuestions.map((q) => (
            <li key={q.question} className={`check ${q.coveredOnSite ? "pass" : "warn"}`}>
              <Pill status={q.coveredOnSite ? "pass" : "warn"} />
              <div>
                <div className="check-title">{q.question} <span className="tag">{q.intent}</span></div>
                <div className="check-detail">{q.coveredOnSite ? "Looks covered on your site" : "Not covered yet — content opportunity"}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Content plan</h3>
        <ol>
          {rs.contentPlan.map((c) => (
            <li key={c.title} style={{ marginBottom: 8 }}>
              <strong>{c.title}</strong> <span className="tag">{c.format}</span>
              <div className="muted small">Targets: {c.targetQuestion} — {c.why}</div>
            </li>
          ))}
        </ol>
      </div>
      <div className="card">
        <h3>Sources AI assistants trust in your niche</h3>
        <ul>
          {rs.trustedSources.map((t) => (
            <li key={t.url + t.name}>
              <a href={t.url} target="_blank" rel="noopener noreferrer nofollow">{t.name}</a> <span className="muted small">— {t.why}</span>
            </li>
          ))}
        </ul>
        {rs.contentGaps.length > 0 && (
          <>
            <h3>Content gaps</h3>
            <ul>{rs.contentGaps.map((g) => <li key={g}>{g}</li>)}</ul>
          </>
        )}
        {rs.sources.length > 0 && <p className="muted tiny">Researched from: {rs.sources.slice(0, 12).map(host).join(", ")}</p>}
      </div>
    </section>
  );
}

/** Ways to apply the fixes without copying each one: a Cloudflare Worker, or a GitHub pull request. */
function FixActions({ r }: { r: Report }) {
  const [repo, setRepo] = useState("");
  const [base, setBase] = useState("");
  const [dir, setDir] = useState("public");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(null);
  const llms = r.fixes?.find((f) => f.id === "llms")?.content;
  const robots = r.fixes?.find((f) => f.id === "robots")?.content;
  const openPr = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const pr = await api<{ url: string; number: number }>("/api/me/github-pr", { method: "POST", body: JSON.stringify({ reportId: r.id, repo, base, dir, token }) });
      setMsg({ ok: true, text: `Pull request #${pr.number} is open.`, url: pr.url });
      setToken("");
    } catch (x) {
      setMsg({ ok: false, text: x instanceof Error ? x.message : "That didn't work." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card fix-actions no-print">
      <h3>Apply the fixes faster</h3>
      <div className="fix-action-row">
        <div>
          <strong>Cloudflare Worker</strong>
          <p className="muted small">If your site runs through Cloudflare, this Worker serves your llms.txt and robots.txt without touching the site itself.</p>
        </div>
        <button type="button" className="btn btn-sm" disabled={!llms && !robots} onClick={() => download("fixes-worker.js", workerScript({ llmsTxt: llms, robotsTxt: robots }), "text/javascript")}>Download the Worker</button>
      </div>
      <details className="fix-action-gh">
        <summary><strong>Open a GitHub pull request</strong> <span className="muted small">with these files added to your repository</span></summary>
        <form onSubmit={openPr} className="gh-form">
          <label><span>Repository</span><input className="field" placeholder="owner/name" value={repo} onChange={(e) => setRepo(e.target.value)} required /></label>
          <label><span>Branch <span className="muted">(default if empty)</span></span><input className="field" placeholder="main" value={base} onChange={(e) => setBase(e.target.value)} /></label>
          <label><span>Folder for robots.txt and llms.txt</span><input className="field" placeholder="public" value={dir} onChange={(e) => setDir(e.target.value)} /></label>
          <label><span>GitHub token</span><input className="field" type="password" autoComplete="off" placeholder="github_pat_…" value={token} onChange={(e) => setToken(e.target.value)} required /></label>
          <p className="muted tiny">Use a fine-grained token for this one repository with Contents and Pull requests set to read and write. It&apos;s used for this request only and never stored.</p>
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Opening…" : "Open pull request"}</button>
        </form>
      </details>
      {msg && <p className={`small ${msg.ok ? "c-pass" : "c-fail"}`} role={msg.ok ? "status" : "alert"}>{msg.text} {msg.url && <a href={msg.url} target="_blank" rel="noopener noreferrer">View it on GitHub</a>}</p>}
    </div>
  );
}

const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
const pagesCsv = (pages: NonNullable<Report["site"]>["pages"]) =>
  toCsv([["URL", "Status", "Title", "Words", "Score", "Click depth", "Links in", "Links out", "Failed checks", "Warnings"], ...pages.map((p) => [p.url, p.status, p.title, p.wordCount, p.scores.overall, p.depth === 9 ? "sitemap only" : p.depth, p.inlinks, p.outlinks ?? "", p.fails.length, p.warns.length])]);
const linksCsv = (links: NonNullable<NonNullable<Report["site"]>["linkSuggestions"]>) =>
  toCsv([["Link to (page)", "Page title", "Links in now", "Add a link from", "Suggested anchor text"], ...links.flatMap((l) => l.from.map((f) => [l.target, l.targetTitle, l.inlinks, f.url, l.anchor]))]);

const OUTCOME_LABEL = { ok: "Crawled", redirected: "Redirected", failed: "Failed", blocked: "Blocked", skipped: "Skipped (not a page)", "not-reached": "Not reached" } as const;
const GROUP_LABEL = { content: "Same main text", title: "Same title", h1: "Same H1", description: "Same description" } as const;

/** Crawl coverage, page groups, likely soft 404s, URL variants and links to the wrong pages. Not part of the score. */
function DiagnosticsTab({ r, printAll }: { r: Report; printAll: boolean }) {
  const d = r.site!.diagnostics!;
  const path = (u: string) => { try { const x = new URL(u); return x.pathname + x.search || "/"; } catch { return u; } };
  const c = d.coverage;
  const tiles: [string, number][] = [["Found", c.discovered], ["Crawled", c.ok], ["Redirected", c.redirected], ["Failed", c.failed], ["Blocked", c.blocked], ["Skipped", c.skipped], ["Not reached", c.notReached]];
  const [showAll, setShowAll] = useState(false);
  const notOk = c.rows.filter((x) => x.outcome !== "ok");
  const list = showAll ? c.rows : notOk.slice(0, 50);
  return (
    <section>
      {printAll && <h2 className="print-h">Diagnostics</h2>}
      <p className="muted small">Extra findings from the crawl. They explain the issues above and don&apos;t change any score.</p>

      <div className="card">
        <div className="card-head"><h3>Crawl coverage</h3><button type="button" className="chip no-print" onClick={() => download("crawl-coverage.csv", coverageCsv(d), "text/csv")}>Coverage CSV</button></div>
        <div className="diag-tiles">{tiles.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
        {list.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>URL</th><th>What happened</th><th>Why</th></tr></thead>
              <tbody>{list.map((x) => <tr key={x.url}><td className="mono small">{path(x.url)}</td><td>{OUTCOME_LABEL[x.outcome]}</td><td className="small">{x.reason}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        <button type="button" className="link no-print" onClick={() => setShowAll(!showAll)}>{showAll ? "Show only URLs with a problem" : `Show all ${c.rows.length} URLs`}</button>
      </div>

      <KeyPagesBotTest r={r} />

      {d.groups.length > 0 && (
        <div className="card">
          <h3>Page groups ({d.groups.length})</h3>
          <p className="muted small">Pages that share a title, H1 or description, or have exactly the same main text. Each should usually be unique; same text may mean duplicate pages.</p>
          <ul className="diag-list">{d.groups.map((g, i) => <li key={i}><strong>{GROUP_LABEL[g.kind]}:</strong> {g.kind === "content" ? g.value : `"${g.value.slice(0, 90)}"`} <span className="muted small">· {g.urls.length} pages: {g.urls.slice(0, 4).map(path).join(", ")}{g.urls.length > 4 ? "…" : ""}</span></li>)}</ul>
        </div>
      )}

      {d.soft404.length > 0 && (
        <div className="card">
          <h3>Likely soft 404s ({d.soft404.length})</h3>
          <p className="muted small">These pages say &ldquo;OK&rdquo; to search engines but look like error or empty pages. Check each one: return a real 404, redirect it, or add content.</p>
          <ul className="diag-list">{d.soft404.map((x) => <li key={x.url}><span className="mono small">{path(x.url)}</span> <span className="muted small">· {x.reason}</span></li>)}</ul>
        </div>
      )}

      {d.urlVariants.length > 0 && (
        <div className="card">
          <h3>Same page, different addresses ({d.urlVariants.length})</h3>
          <p className="muted small">Links use more than one version of these addresses. Pick one, link to it everywhere, and redirect the others.</p>
          <ul className="diag-list">{d.urlVariants.map((x, i) => <li key={i}><span className="mono small">{x.urls.map(path).join("  ·  ")}</span> <span className="muted small">· {x.reason}</span></li>)}</ul>
        </div>
      )}

      {d.badLinkTargets.length > 0 && (
        <div className="card">
          <h3>Links to the wrong pages ({d.badLinkTargets.length})</h3>
          <p className="muted small">Internal links pointing at pages hidden from search or at a URL whose canonical is elsewhere. Point them at the final, indexable URL.</p>
          <ul className="diag-list">{d.badLinkTargets.map((x) => <li key={x.url}><span className="mono small">{path(x.url)}</span> <span className="muted small">· {x.reason}. Linked from {x.from.map(path).join(", ")}</span></li>)}</ul>
        </div>
      )}
    </section>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** At the top of a report: the 3 biggest issues and, for your team's reports, what changed since the last one. */
function ExecutiveSummary({ r }: { r: Report }) {
  const [cmp, setCmp] = useState<{ previous: { id: string; createdAt: string } | null; diff?: ReportDiff | null } | null>(null);
  useEffect(() => {
    // Only works for reports your team ran; a shared link to someone else's report just shows the top issues.
    fetch(`/api/me/reports/compare?id=${encodeURIComponent(r.id)}`).then((x) => (x.ok ? x.json() : null)).then((j) => setCmp(j)).catch(() => {});
  }, [r.id]);
  const s = r.site!;
  const top = topIssues(s.issues, 3);
  const d = cmp?.diff;
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="card exec-summary">
      <h3>Summary</h3>
      <p>
        {s.pagesCrawled} page{s.pagesCrawled === 1 ? "" : "s"} checked, overall score <strong>{s.scores.overall}</strong>.
        {top.length ? " Start with these:" : " No site-wide problems were found."}
      </p>
      {top.length > 0 && (
        <ol className="exec-top">
          {top.map((i) => <li key={i.id}><strong>{i.title}</strong> <span className="muted small">· {i.count} page{i.count === 1 ? "" : "s"}{i.status === "fail" ? ", failing" : ""}</span></li>)}
        </ol>
      )}
      {d && cmp?.previous && (
        <div className="exec-change">
          <h4>Since your report on {when(cmp.previous.createdAt)}</h4>
          <p>
            Overall <strong className={d.scores.overall > 0 ? "c-pass" : d.scores.overall < 0 ? "c-fail" : ""}>{signed(d.scores.overall)}</strong>
            <span className="muted small"> (SEO {signed(d.scores.seo)}, answers {signed(d.scores.aeo)}, AI search {signed(d.scores.geo)})</span>
            {d.pagesAdded || d.pagesGone ? <span className="muted small"> · {d.pagesAdded} page{d.pagesAdded === 1 ? "" : "s"} new, {d.pagesGone} gone</span> : null}
          </p>
          <ul className="exec-list">
            {d.resolved.map((i) => <li key={`r-${i.id}`} className="c-pass">Fixed: {i.title}</li>)}
            {d.better.map((i) => <li key={`b-${i.id}`}>Fewer pages: {i.title} ({i.before} → {i.after})</li>)}
            {d.newIssues.map((i) => <li key={`n-${i.id}`} className="c-fail">New: {i.title} ({i.count} page{i.count === 1 ? "" : "s"})</li>)}
            {d.worse.map((i) => <li key={`w-${i.id}`} className="c-warn">More pages: {i.title} ({i.before} → {i.after})</li>)}
          </ul>
          {!d.resolved.length && !d.newIssues.length && !d.worse.length && !d.better.length && <p className="muted small">The same site-wide issues as last time.</p>}
          <a className="small" href={`/dashboard?tab=report&id=${encodeURIComponent(cmp.previous.id)}`}>Open the previous report</a>
        </div>
      )}
    </div>
  );
}

type BotResult = { url: string; rows: { bot: string; purpose: string; live: string; robotsAllowed: boolean | null }[]; summary: { verdict: "good" | "warn" | "bad"; text: string } };

/** Run the AI crawler test on up to 5 important pages, not only the home page. */
function KeyPagesBotTest({ r }: { r: Report }) {
  const home = r.home?.facts.finalUrl;
  const candidates = r.site!.pages.filter((p) => p.status === 200 && !p.noindex && p.url !== home).sort((a, b) => b.inlinks - a.inlinks).slice(0, 5).map((p) => p.url);
  const [chosen, setChosen] = useState<string[]>(candidates);
  const [results, setResults] = useState<Record<string, BotResult | { error: string }>>({});
  const [busy, setBusy] = useState(false);
  if (!candidates.length) return null;
  const run = async () => {
    setBusy(true);
    for (const url of chosen) {
      try {
        const res = await fetch(`/api/bot-test?url=${encodeURIComponent(url)}`);
        const j = await res.json();
        setResults((x) => ({ ...x, [url]: res.ok ? (j as BotResult) : { error: j.error ?? "Test failed" } }));
        if (res.status === 429) break;
      } catch {
        setResults((x) => ({ ...x, [url]: { error: "Test failed" } }));
      }
    }
    setBusy(false);
  };
  const path = (u: string) => { try { return new URL(u).pathname || "/"; } catch { return u; } };
  return (
    <div className="card no-print">
      <h3>AI crawler access on key pages</h3>
      <p className="muted small">The home page is tested in every check. This tests your most-linked pages too, requesting each as AI crawlers do. Uses 1 test per page from your hourly allowance.</p>
      <ul className="keypages">
        {candidates.map((u) => {
          const res = results[u];
          const blocked = res && "rows" in res ? res.rows.filter((x) => x.purpose !== "browser" && (x.live === "blocked" || x.live === "challenge" || x.robotsAllowed === false)).map((x) => x.bot) : [];
          return (
            <li key={u}>
              <label><input type="checkbox" checked={chosen.includes(u)} disabled={busy} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, u] : c.filter((x) => x !== u)))} /> <span className="mono small">{path(u)}</span></label>
              {res && ("error" in res ? <span className="c-fail small"> · {res.error}</span> : <span className={`small ${res.summary.verdict === "good" ? "c-pass" : res.summary.verdict === "bad" ? "c-fail" : "c-warn"}`}> · {blocked.length ? `Blocked for ${blocked.join(", ")}` : "All tested crawlers got the page"}</span>)}
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn-sm" disabled={busy || !chosen.length} onClick={run}>{busy ? "Testing…" : `Test ${chosen.length} page${chosen.length === 1 ? "" : "s"}`}</button>
    </div>
  );
}

const RATING_CLASS = { good: "c-pass", ok: "c-warn", bad: "c-fail", none: "muted" } as const;
const RATING_WORD = { good: "Good", ok: "Needs work", bad: "Poor", none: "Not enough data" } as const;

/** Google PageSpeed (mobile) on the site's top pages, with the fixes that help several pages at once. */
function SiteSpeedCard({ speed }: { speed: NonNullable<Report["speed"]> }) {
  if ("error" in speed) return <div className="card"><h3>Speed across your top pages</h3><p className="c-fail small">{speed.error}</p></div>;
  const path = (u: string) => { try { return new URL(u).pathname || "/"; } catch { return u; } };
  return (
    <div className="card site-speed">
      <div className="site-speed-head">
        <div>
          <h3>Speed across your top pages</h3>
          <p className="muted small">Google PageSpeed on mobile, for the homepage and the pages your site links to most. Lab tests vary a few points between runs.</p>
        </div>
        {speed.average !== null && <div className="site-speed-avg"><span className={RATING_CLASS[speed.average >= 90 ? "good" : speed.average >= 50 ? "ok" : "bad"]}>{speed.average}</span><small>average score</small></div>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Page</th><th>Score</th><th>LCP</th><th>CLS</th><th>Blocking time</th><th>Real visitors</th></tr></thead>
          <tbody>
            {speed.pages.map((p) => (
              <tr key={p.url}>
                <td className="mono small"><a href={p.reportUrl} target="_blank" rel="noopener noreferrer">{path(p.url)}</a></td>
                {p.error ? <td colSpan={5} className="muted small">{p.error}</td> : (
                  <>
                    <td><strong className={RATING_CLASS[p.rating]}>{p.performance}</strong></td>
                    <td>{p.lcp ?? "–"}</td><td>{p.cls ?? "–"}</td><td>{p.tbt ?? "–"}</td>
                    <td className={`small ${RATING_CLASS[p.field]}`}>{RATING_WORD[p.field]}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {speed.shared.length > 0 && (
        <div className="site-speed-shared">
          <h4>Fix once, speed up several pages</h4>
          <ul>{speed.shared.map((x) => <li key={x.title}>{x.title} <span className="muted small">· {x.pages} pages · {x.who}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

/** Is the business a known entity on Wikidata, and does the site's schema point to it? */
function EntityCard({ e }: { e: NonNullable<Report["entity"]> }) {
  return (
    <div className="card entity-card">
      <h3>Entity check</h3>
      {e.item ? (
        <>
          <p className="small"><span className="c-pass">✓</span> On Wikidata as <a href={e.item.url} target="_blank" rel="noopener noreferrer"><strong>{e.item.label}</strong> ({e.item.id})</a>{e.item.description ? ` — ${e.item.description}` : ""}.</p>
          {e.linkedInSchema
            ? <p className="small"><span className="c-pass">✓</span> Your schema&apos;s <code>sameAs</code> links to it, so AI and search engines can tie your site to this entity.</p>
            : <p className="small"><span className="c-warn">!</span> Add <code>{e.item.url}</code> to the <code>sameAs</code> list in your Organization schema, so AI and search engines connect your site to this entity.</p>}
          {e.others > 0 && <p className="muted small">{e.others} other Wikidata item{e.others === 1 ? " also lists" : "s also list"} this site as the official website. If they&apos;re duplicates, they can be merged on Wikidata.</p>}
        </>
      ) : (
        <p className="small"><span className="c-warn">!</span> No Wikidata item lists this site as its official website. AI assistants use Wikidata to tell businesses apart. If your organisation meets Wikidata&apos;s notability rules (for example, it&apos;s covered by independent sources), an item with your official website helps; otherwise, keep your profiles consistent and listed in <code>sameAs</code>.</p>
      )}
    </div>
  );
}
