"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fullReportHref } from "@/lib/appLinks";
import AuditLoader, { MIN_LOADER_MS } from "@/components/AuditLoader";
import type { AuditResult, Category, Check, Status } from "@/lib/types";
import type { SocialPresence } from "@/lib/social";
import { Pill, Ring, SoonBadge } from "@/components/ui";
import { api, askToUpgrade, download, useConfig } from "@/lib/client";
import AiHelpers from "./AiHelpers";
import { anyFixPrice, pricedFixes } from "@/lib/fixPrices";
import { appUrl } from "@/lib/hosts";
import { CheckCircle2, Lock } from "lucide-react";
import SocialCard from "@/components/SocialCard";
import { BRAND } from "@/lib/brand";
import MonitorForm from "@/components/MonitorForm";
import AiView from "@/components/AiView";
import SpeedTest, { useSpeedTest } from "@/components/SpeedTest";
import BotTest from "@/components/BotTest";
import type { PsiResult } from "@/lib/pagespeed";
import LeadForm from "@/components/LeadForm";
import { checksCsv, diffRuns, getFixed, isIssue, recordRun, setFixed as saveFixed, type Diff } from "@/lib/history";
import { track } from "@/lib/track";
import ResultCounts, { type CountKey } from "@/components/ResultCounts";

type View = "issues" | Status | "all";
const VIEWS: { key: View; label: string; matches: (s: Status) => boolean }[] = [
  { key: "issues", label: "Issues", matches: (s) => s === "fail" || s === "warn" },
  { key: "fail", label: "Failed", matches: (s) => s === "fail" },
  { key: "warn", label: "Warnings", matches: (s) => s === "warn" },
  { key: "pass", label: "Passed", matches: (s) => s === "pass" },
  { key: "info", label: "Notes", matches: (s) => s === "info" },
  { key: "all", label: "All", matches: () => true },
];
const CAT_LABEL: Record<Category, { name: string; blurb: string }> = {
  seo: { name: "SEO", blurb: "Crawl, index, on-page & speed" },
  aeo: { name: "AEO", blurb: "Answer-engine readiness" },
  geo: { name: "GEO / LLM", blurb: "AI search & citation readiness" },
};
const STATUS_ORDER: Record<Status, number> = { fail: 0, warn: 1, info: 2, pass: 3 };

type Advice = {
  summary: string;
  actions: { priority: string; category: string; title: string; why: string; how: string; effort: string }[];
};

function toMarkdown(r: AuditResult, advice: Advice | null, psi: PsiResult | null = null) {
  const lines = [
    `# SEO / AEO / GEO audit — ${r.facts.finalUrl}`,
    `_Audited ${new Date(r.auditedAt).toLocaleString()} with ${BRAND.name} (${BRAND.host})_`,
    "",
    `**Overall ${r.scores.overall}** · SEO ${r.scores.seo} · AEO ${r.scores.aeo} · GEO ${r.scores.geo}`,
    "",
  ];
  if (advice) {
    lines.push("## AI fix plan", "", advice.summary, "");
    advice.actions.forEach((a, i) =>
      lines.push(`${i + 1}. **[${a.priority}] ${a.title}** (${a.category}, ${a.effort})`, `   - Why: ${a.why}`, `   - How: ${a.how}`),
    );
    lines.push("");
  }
  (["seo", "aeo", "geo"] as Category[]).forEach((cat) => {
    lines.push(`## ${CAT_LABEL[cat].name} (${r.scores[cat]})`, "");
    r.checks
      .filter((c) => c.category === cat)
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
      .forEach((c) => {
        lines.push(`- **${c.status.toUpperCase()}** ${c.title} — ${c.detail}`);
        if (c.fix) lines.push(`  - Fix: ${c.fix}`);
      });
    lines.push("");
  });
  if (psi) {
    const s = psi.scores;
    lines.push(`## Speed test (${psi.strategy})`, "", `Performance ${s.performance} · Accessibility ${s.accessibility} · Best practices ${s.bestPractices} · SEO ${s.seo}`, "");
    psi.field.metrics.forEach((m) => lines.push(`- ${m.label} (real visitors${psi.field.source === "origin" ? ", whole site" : ""}): ${m.value}`));
    psi.lab.forEach((m) => lines.push(`- ${m.label} (lab): ${m.value}`));
    if (psi.opportunities.length) {
      lines.push("", "### Top speed fixes", "");
      psi.opportunities.forEach((o, i) => lines.push(`${i + 1}. **${o.title}**${o.savings ? ` (saves ${o.savings})` : ""}, ${o.who}: ${o.fix}`));
    }
    lines.push("");
  }
  lines.push("## AI crawler access", "", "| Bot | Owner | Purpose | Allowed |", "|---|---|---|---|");
  r.facts.bots.forEach((b) => lines.push(`| ${b.bot} | ${b.owner} | ${b.purpose} | ${b.allowed ? "yes" : "**no**"} |`));
  return lines.join("\n");
}

/** An issue as a ticket for Jira, Linear, Trello or GitHub (Markdown). */
function ticket(c: Check, url: string) {
  return [
    `## [${CAT_LABEL[c.category].name}] ${c.title}`,
    "",
    `**Page:** ${url}`,
    `**Impact:** ${c.weight === 3 ? "high" : c.weight === 2 ? "medium" : "low"} · **Status:** ${c.status}`,
    "",
    `**What we found:** ${c.detail}`,
    "",
    c.fix ? `**How to fix:** ${c.fix}` : "",
    "",
    `**Done when:** re-running the ${BRAND.name} check on this page shows "${c.title}" as passed.`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}

function CheckRow({ c, url, marked, onToggle, onRecheck, rechecking, note }: {
  c: Check;
  url?: string;
  marked?: boolean;
  onToggle?: () => void;
  onRecheck?: () => void;
  rechecking?: boolean;
  note?: string;
}) {
  const issue = isIssue(c);
  return (
    <li className={`check ${c.status} ${marked ? "marked" : ""}`}>
      <Pill status={c.status} />
      <div>
        <div className="check-title">
          {c.title}
          {c.weight === 3 && c.status !== "pass" && c.status !== "info" && <span className="tag">high impact</span>}
        </div>
        <div className="check-detail">{c.detail}</div>
        {c.fix && <div className="check-fix">→ {c.fix}</div>}
        {c.fixLocked && (
          <div className="check-fix-locked"><Lock size={14} aria-hidden="true" /> <a href={appUrl(`/login?next=${encodeURIComponent(`/dashboard?tab=check&mode=page&url=${encodeURIComponent(url ?? "")}`)}`)}>Create a free account</a> to see how to fix this.</div>
        )}
        {issue && onToggle && (
          <div className="check-actions no-print">
            <label className="check-mark">
              <input type="checkbox" checked={!!marked} onChange={onToggle} /> {marked ? "Marked as fixed" : "Mark as fixed"}
            </label>
            {marked && onRecheck && (
              <button type="button" className="link-btn" onClick={onRecheck} disabled={rechecking}>
                {rechecking ? "Checking…" : "Re-check now"}
              </button>
            )}
            {url && <CopyTicket text={ticket(c, url)} />}
            {note && <span className="check-note" role="status">{note}</span>}
          </div>
        )}
      </div>
    </li>
  );
}

function CopyTicket({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="link-btn" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); }}>
      {done ? "Copied" : "Copy as ticket"}
    </button>
  );
}

/** Embeddable score badge, offered once a site scores well enough to show off. */
function BadgeCard({ url, score }: { url: string; score: number }) {
  const [copied, setCopied] = useState(false);
  if (score < 70) return null;
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const origin = typeof window === "undefined" ? BRAND.url : window.location.origin;
  const code = `<a href="${origin}/check?url=${host}"><img src="${origin}/api/badge?url=${host}" alt="${BRAND.name} score for ${host}" height="22"></a>`;
  return (
    <div className="card badge-card no-print">
      <div>
        <h3>Show your score</h3>
        <p className="muted small">Add this badge to your footer or README. It updates once a day.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/badge?url=${host}`} alt={`${BRAND.name} score for ${host}`} height={22} />
      </div>
      <div className="badge-code">
        <code>{code}</code>
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); track("Badge copied"); setTimeout(() => setCopied(false), 1800); }}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
    </div>
  );
}

/**
 * The page check. On the home page (`redirect`) submitting goes to /check?url=…, which keeps
 * the home page light; on /check it runs the audit behind a step-by-step loader.
 */
export default function Auditor({ redirect = false }: { redirect?: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [url, setUrl] = useState(params.get("url") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<(AuditResult & { social?: SocialPresence }) | null>(null);
  const { cfg, on } = useConfig();
  // Visitors (not signed in) when the sign-up gate is on: some extras need a free account.
  const visitor = !!cfg?.signupGate && !cfg.account;
  const needAccount = (what: string) => {
    askToUpgrade("signup", `Create a free account to ${what}. It takes a minute and there's no card.`);
    return true;
  };
  const [tab, setTab] = useState<Category | "all">("all");
  const [view, setView] = useState<View>("issues");

  const [advice, setAdvice] = useState<Advice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState("");

  const speed = useSpeedTest(result?.facts.finalUrl);

  // Before/after and the "mark as fixed" checklist, kept in this browser.
  const [diff, setDiff] = useState<Diff | null>(null);
  const [fixed, setFixedIds] = useState<string[]>([]);
  const [rechecking, setRechecking] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const accept = useCallback((data: AuditResult & { social?: SocialPresence }) => {
    setResult(data);
    const prev = recordRun(data);
    setDiff(prev ? diffRuns(prev, data) : null);
    // Drop "fixed" marks for checks that now pass; keep the rest so people can see what's still open.
    const marks = getFixed(data.facts.finalUrl);
    const stillOpen = marks.filter((id) => data.checks.some((c) => c.id === id && isIssue(c)));
    saveFixed(data.facts.finalUrl, stillOpen);
    setFixedIds(stillOpen);
    return { marks, stillOpen };
  }, []);

  const run = useCallback(async (target: string) => {
    if (!target.trim()) return;
    if (redirect) {
      router.push(`/check?url=${encodeURIComponent(target.trim())}`);
      return;
    }
    track("Audit started");
    setLoading(true);
    setError("");
    setNotes({});
    setView("issues");
    setTab("all");
    setResult(null);
    setAdvice(null);
    setAdviceError("");
    try {
      // Keep the loader up long enough to read what the audit does.
      const [data] = await Promise.all([
        api<AuditResult & { social?: SocialPresence }>("/api/audit", { method: "POST", body: JSON.stringify({ url: target }) }),
        new Promise((r) => setTimeout(r, MIN_LOADER_MS)),
      ]);
      accept(data);
      track("Report finished", { score: data.scores.overall });
      const u = new URL(window.location.href);
      u.searchParams.set("url", target.trim());
      window.history.replaceState(null, "", u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }, [redirect, router, accept]);

  useEffect(() => {
    const initial = params.get("url");
    if (initial) run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFixed = (id: string) => {
    if (!result) return;
    const next = fixed.includes(id) ? fixed.filter((x) => x !== id) : [...fixed, id];
    saveFixed(result.facts.finalUrl, next);
    setFixedIds(next);
    setNotes((n) => ({ ...n, [id]: "" }));
  };

  /** Re-run the page check quietly (no loader) and say whether this issue is gone. */
  const recheck = async (id: string) => {
    if (!result) return;
    setRechecking(true);
    try {
      const data = await api<AuditResult & { social?: SocialPresence }>("/api/audit", { method: "POST", body: JSON.stringify({ url: result.facts.finalUrl }) });
      const now = data.checks.find((c) => c.id === id);
      accept(data);
      setNotes((n) => ({ ...n, [id]: now && isIssue(now) ? "Still showing as an issue. If you changed it, clear your cache or CDN and try again." : "Fixed. It passes now." }));
    } catch (e) {
      setNotes((n) => ({ ...n, [id]: e instanceof Error ? e.message : "Re-check failed" }));
    } finally {
      setRechecking(false);
    }
  };

  const getAdvice = async () => {
    if (!result) return;
    setAdviceLoading(true);
    setAdviceError("");
    try {
      const data = await api<Advice>("/api/advice", {
        method: "POST",
        body: JSON.stringify({ url: result.url, scores: result.scores, facts: { ...result.facts, bots: [] }, checks: result.checks }),
      });
      setAdvice(data);
    } catch (e) {
      setAdviceError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdviceLoading(false);
    }
  };

  const visible = useMemo(() => {
    if (!result) return [];
    return result.checks
      .filter((c) => tab === "all" || c.category === tab)
      .filter((c) => VIEWS.find((v) => v.key === view)!.matches(c.status))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.weight - a.weight);
  }, [result, tab, view]);

  /** Open a list of checks and move the reader, and keyboard focus, to it. */
  const openList = (next: View) => {
    setTab("all");
    setView(next);
    requestAnimationFrame(() => {
      const el = document.getElementById("check-results");
      el?.scrollIntoView({ block: "start" });
      el?.focus({ preventScroll: true });
    });
  };

  const grouped = useMemo(() => {
    const m = new Map<string, Check[]>();
    for (const c of visible) {
      const k = `${CAT_LABEL[c.category].name} · ${c.group}`;
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return [...m.entries()];
  }, [visible]);

  const counts = useMemo(() => {
    const n = { pass: 0, warn: 0, fail: 0, info: 0 };
    result?.checks.forEach((c) => n[c.status]++);
    return n;
  }, [result]);

  return (
    <div className="auditor">
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          run(url);
        }}
      >
        <label htmlFor="url" className="sr-only">
          Website URL
        </label>
        <input
          id="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={loading || !url.trim()}>
          {loading ? "Auditing…" : "Run audit"}
        </button>
      </form>

      {loading && <AuditLoader url={url} />}
      {error && <div className="error">{error}</div>}

      {result && (
        <div className="results">
          <div className="summary card">
            <Ring value={result.scores.overall} size={140} label="overall" />
            <div className="summary-text">
              <h2>{result.facts.title || result.facts.finalUrl}</h2>
              <a href={result.facts.finalUrl} target="_blank" rel="noopener noreferrer" className="muted small">
                {result.facts.finalUrl}
              </a>
              <ResultCounts
                counts={{ fail: counts.fail, warn: counts.warn, pass: counts.pass }}
                active={tab === "all" && (view === "fail" || view === "warn" || view === "pass") ? (view as CountKey) : null}
                onPick={openList}
              />
              <div className="actions">
                {on("aiPlan") && (
                  <button onClick={getAdvice} disabled={adviceLoading} className="primary">
                    {adviceLoading ? "Writing fix plan…" : advice ? "Regenerate AI fix plan" : visitor ? "Get AI fix plan (free account)" : "Get AI fix plan"}
                  </button>
                )}
                {on("pagespeed") && (
                  <button
                    onClick={() => {
                      speed.run(speed.strategy);
                      document.getElementById("speed-test")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    disabled={speed.loading}
                  >
                    {speed.loading ? "Testing speed (~30s)…" : "Run speed test"}
                  </button>
                )}
                {on("siteCrawl") && (
                  <a className="btn" href={fullReportHref(pathname, result.facts.finalUrl)}>
                    Full site report →
                  </a>
                )}
              </div>
              <div className="download-row no-print">
                <span className="muted">Download</span>
                <button type="button" className="link-btn" onClick={() => { if (visitor && needAccount("download your report")) return; track("Report downloaded", { format: "md" }); download("seo-audit.md", toMarkdown(result, advice, speed.psi), "text/markdown"); }}>Report</button>
                <button type="button" className="link-btn" onClick={() => { if (visitor && needAccount("download your report")) return; track("Report downloaded", { format: "csv" }); download("seo-audit-issues.csv", checksCsv(result, fixed), "text/csv"); }}>CSV</button>
                <button type="button" className="link-btn" onClick={() => visitor ? needAccount("download your report") : download("seo-audit.json", JSON.stringify({ ...result, advice, pagespeed: speed.results }, null, 2), "application/json")}>JSON</button>
              </div>
            </div>
          </div>

          {diff && (
            <div className={`card compare ${diff.delta > 0 ? "up" : diff.delta < 0 ? "down" : ""}`}>
              <div className="compare-score">
                <span className="muted small">Last check, {new Date(diff.prev.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                <strong>
                  {diff.prev.scores.overall} <span aria-hidden="true">→</span> {result.scores.overall}
                </strong>
                <span className="compare-delta">{diff.delta > 0 ? `+${diff.delta}` : diff.delta === 0 ? "no change" : diff.delta}</span>
              </div>
              <ul className="compare-list">
                <li><span className="c-pass">{diff.fixed.length} fixed</span> since then</li>
                <li><span className={diff.added.length ? "c-fail" : "muted"}>{diff.added.length} new</span> issue{diff.added.length === 1 ? "" : "s"}</li>
                <li className="muted small">SEO {diff.prev.scores.seo}→{result.scores.seo} · AEO {diff.prev.scores.aeo}→{result.scores.aeo} · GEO {diff.prev.scores.geo}→{result.scores.geo}</li>
              </ul>
            </div>
          )}

          <div className="cats">
            {(["seo", "aeo", "geo"] as Category[]).map((c) => (
              <button key={c} className={`card cat ${tab === c ? "active" : ""}`} onClick={() => setTab(tab === c ? "all" : c)}>
                <Ring value={result.scores[c]} size={72} />
                <div>
                  <strong>{CAT_LABEL[c].name}</strong>
                  <span className="muted small">{CAT_LABEL[c].blurb}</span>
                </div>
              </button>
            ))}
          </div>

          {on("aiView") && <AiView
            facts={result.facts}
            canScreenshot={on("pagespeed")}
            screenshot={speed.screenshot}
            onLoadScreenshot={() => speed.run("mobile")}
            loadingScreenshot={speed.loading}
            screenshotError={speed.error}
          />}

          {on("botTest") && <BotTest url={result.facts.finalUrl} />}

          {on("pagespeed") && (
            <div id="speed-test">
              <SpeedTest url={result.facts.finalUrl} speed={speed} />
            </div>
          )}

          {adviceError && <div className="error">{adviceError}</div>}
          {advice && (
            <div className="card advice">
              <h3>AI fix plan</h3>
              <p>{advice.summary}</p>
              <ol>
                {advice.actions.map((a, i) => (
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

          <div className="toolbar" id="check-results" tabIndex={-1}>
            <div className="tabs" role="tablist">
              {(["all", "seo", "aeo", "geo"] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                  {t === "all" ? "All" : CAT_LABEL[t].name}
                </button>
              ))}
            </div>
            <div className="tabs status-tabs" role="group" aria-label="Filter checks by result">
              {VIEWS.map((v) => (
                <button key={v.key} type="button" className={view === v.key ? "on" : ""} aria-pressed={view === v.key} onClick={() => setView(v.key)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {grouped.length === 0 && <p className="muted center">{view === "issues" ? "Nothing to fix here." : "No checks to show here."}</p>}
          {grouped.map(([g, cs]) => (
            <div key={g} className="card group">
              <h3>{g}</h3>
              <ul>
                {cs.map((c) => (
                  <CheckRow key={c.id} c={c} url={result.facts.finalUrl} marked={fixed.includes(c.id)} onToggle={() => toggleFixed(c.id)} onRecheck={() => recheck(c.id)} rechecking={rechecking} note={notes[c.id]} />
                ))}
              </ul>
            </div>
          ))}

          {(tab === "all" || tab === "geo") && (
            <div className="card">
              <h3>AI crawler access (robots.txt)</h3>
              <p className="muted small">
                {result.facts.robotsTxtFound ? "Evaluated against your robots.txt for this URL." : "No robots.txt — all bots are allowed by default."}
              </p>
              <div className="table-wrap">
                <table className="bots">
                  <thead>
                    <tr>
                      <th>Crawler</th>
                      <th>Used for</th>
                      <th>Type</th>
                      <th>Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.facts.bots.map((b) => (
                      <tr key={b.bot}>
                        <td>
                          <code>{b.bot}</code>
                        </td>
                        <td className="small">{b.owner}</td>
                        <td>
                          <span className={`tag p-${b.purpose}`}>{b.purpose}</span>
                        </td>
                        <td className={b.allowed ? "c-pass" : "c-fail"}>{b.allowed ? "Allowed" : "Blocked"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.social && (tab === "all" || tab === "geo") && <SocialCard social={result.social} />}

          {/* With accounts on, weekly checks come with a free account (the card below) instead. */}
          {cfg && !cfg.accounts && (
            on("monitoring") ? (
              <MonitorForm url={result.facts.finalUrl} />
            ) : (
              <div className="card soon-card">
                <h3>
                  Weekly monitoring & email alerts <SoonBadge plan="pro" />
                </h3>
                <p className="muted small">Re-audit automatically and get an email when your scores drop or new issues appear.</p>
              </div>
            )
          )}

          {cfg?.accounts && !cfg.account && (
            <div className="card signup-card no-print">
              <div>
                <span className="kicker">Free account</span>
                <h3>Keep track of {result.facts.finalUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</h3>
                <p className="muted">Sign up free and we&apos;ll save this site, check it every week and email you if the score drops.</p>
                <ul>
                  {(cfg.signupGate ? [`How to fix every issue, not just the first ${cfg.fixPreview}`, "An AI fix plan written for this page", "Full site reports and downloads"] : ["A full site report of every page", "Score history and a weekly check", "An AI fix plan written for this page"]).map((x) => (
                    <li key={x}><CheckCircle2 size={16} aria-hidden="true" /> {x}</li>
                  ))}
                </ul>
              </div>
              <a className="btn btn-primary" href={appUrl(`/login?next=${encodeURIComponent(`/dashboard?tab=check&mode=page&url=${encodeURIComponent(result.facts.finalUrl)}`)}`)}>Create a free account</a>
            </div>
          )}

          {cfg?.guestReport && !cfg.account && <GuestReportCard url={result.facts.finalUrl} price={cfg.guestReport} />}

          {counts.fail + counts.warn > 0 && (
            <div className="card fix-cta no-print" id="fix-for-me">
              <div>
                <span className="kicker">Done for you</span>
                <h3>Want us to fix these for you?</h3>
                <p className="muted">
                  Send this report and we&apos;ll reply with what we&apos;d change, in what order, and a fixed price. Most sites need a few hours of work,
                  not a rebuild.
                </p>
                {anyFixPrice() && (
                  <ul className="fix-prices">
                    {pricedFixes(result.checks).map((f) => (
                      <li key={f.type}><span>{f.label} <small className="muted">· {f.issues} issue{f.issues === 1 ? "" : "s"}</small></span><strong>{f.from ? `From $${f.from}` : "Quote"}</strong></li>
                    ))}
                  </ul>
                )}
              </div>
              <LeadForm kind="fix" url={result.facts.finalUrl} />
            </div>
          )}

          {on("aiHelpers") && cfg?.aiConfigured && <AiHelpers facts={result.facts} url={result.url} />}

          <BadgeCard url={result.facts.finalUrl} score={result.scores.overall} />

          <div className="card">
            <h3>Key facts</h3>
            <dl className="facts">
              <dt>Status</dt>
              <dd>
                {result.facts.status} in {result.facts.responseMs} ms · {Math.round(result.facts.htmlBytes / 1024)} KB
              </dd>
              <dt>Title</dt>
              <dd>{result.facts.title || "—"}</dd>
              <dt>Description</dt>
              <dd>{result.facts.metaDescription || "—"}</dd>
              <dt>H1</dt>
              <dd>{result.facts.h1.join(" | ") || "—"}</dd>
              <dt>Canonical</dt>
              <dd>{result.facts.canonical || "—"}</dd>
              <dt>Words</dt>
              <dd>{result.facts.wordCount}</dd>
              <dt>Schema</dt>
              <dd>{result.facts.schemaTypes.join(", ") || "—"}</dd>
              <dt>Links</dt>
              <dd>
                {result.facts.internalLinks} internal · {result.facts.externalLinks} external
              </dd>
              <dt>Images</dt>
              <dd>
                {result.facts.images} ({result.facts.imagesMissingAlt} missing alt)
              </dd>
              <dt>Sitemap</dt>
              <dd>{result.facts.sitemapUrls === null ? "not found" : `${result.facts.sitemapUrls} entries`}</dd>
              <dt>llms.txt</dt>
              <dd>{result.facts.llmsTxtFound ? "found" : "not found"}</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

/** Buy one full report for this site without an account. After paying, you sign in and it runs. */
function GuestReportCard({ url, price }: { url: string; price: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const host = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const buy = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ url: string }>("/api/billing/guest-checkout", { method: "POST", body: JSON.stringify({ url }) });
      window.location.href = r.url;
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Checkout didn't open. Try again.");
    }
  };
  return (
    <div className="card guest-report no-print">
      <div>
        <span className="kicker">One-off report</span>
        <h3>Get the full report for {host}</h3>
        <p className="muted">Every page crawled (up to 300), problems that repeat across the site, competitor comparison and ready-to-paste fixes. Pay once, no subscription. You sign in after paying so the report is saved to your account.</p>
      </div>
      <div className="guest-report-buy">
        <strong className="guest-report-price">{price}</strong>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={buy}>{busy ? "Opening checkout…" : "Buy the full report"}</button>
        {err && <p className="c-fail small" role="alert">{err}</p>}
      </div>
    </div>
  );
}
