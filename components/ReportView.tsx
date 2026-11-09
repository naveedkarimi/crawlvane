"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { api, download, useConfig } from "@/lib/client";
import { reportToMarkdown } from "@/lib/reportMarkdown";
import type { FixPlan, Report, ResearchResult, VisibilityResult } from "@/lib/reportTypes";
import type { SocialPosts } from "@/lib/social";
import { CopyBlock, Pill, Ring, SoonBadge } from "./ui";
import SocialCard from "./SocialCard";
import AiView from "./AiView";
import SpeedTest, { useSpeedTest } from "./SpeedTest";
import ReportProgress from "./ReportProgress";
import ResultCounts from "./ResultCounts";

type IssueFilter = "all" | "fail" | "warn";
type Tab = "overview" | "issues" | "pages" | "competitors" | "fixes" | "plan" | "social" | "visibility" | "research";
const isErr = (x: unknown): x is { error: string } => !!x && typeof x === "object" && "error" in x;
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export default function ReportView({ id }: { id: string }) {
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
        <a className="btn" href={`/?mode=full&url=${encodeURIComponent(r.input.url)}`}>Try again</a>
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
          {r.home && on("aiView") && (
            <AiView
              facts={r.home.facts}
              canScreenshot={on("pagespeed")}
              screenshot={speed.screenshot}
              onLoadScreenshot={() => speed.run("mobile")}
              loadingScreenshot={speed.loading}
              screenshotError={speed.error}
            />
          )}
          {r.home && on("pagespeed") && !printAll && <SpeedTest url={r.home.facts.finalUrl} speed={speed} />}
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
      {show("competitors") && r.competitors?.length ? <CompetitorsTab r={r} printAll={printAll} /> : null}
      {show("fixes") && r.fixes?.length ? (
        <section>
          {printAll && <h2 className="print-h">Ready-to-paste fixes</h2>}
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
        <div className="tabs small-tabs" role="group" aria-label="Filter issues by result">
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
  return (
    <section>
      {printAll && <h2 className="print-h">Pages</h2>}
      <div className="card">
        <div className="row no-print" style={{ marginBottom: 10 }}>
          <span className="muted small">Sort:</span>
          {(["score", "words", "depth"] as const).map((k) => (
            <button key={k} className={`chip ${sort === k ? "on" : ""}`} onClick={() => setSort(k)}>
              {k}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Status</th>
                <th>Score</th>
                <th>Words</th>
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
