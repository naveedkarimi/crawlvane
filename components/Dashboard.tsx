"use client";

import { createContext, Fragment, Suspense, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Bell, Building2, CheckCircle2, CircleMinus, ExternalLink, FileText, Globe, Info, LayoutGrid, MessageSquareText, Plus, RefreshCw, ScanSearch, Settings, Smartphone, Trash2, TrendingDown, TrendingUp, Users, Wrench, XCircle, type LucideIcon, PenLine } from "lucide-react";
import { takeReferral } from "@/lib/referralClient";
import GooglePanel from "./GooglePanel";
import BingPanel from "./BingPanel";
import BotVisitsPanel from "./BotVisitsPanel";
import SeoToolsPanel from "./SeoToolsPanel";
import { issuesCsv, type ExportFormat, type ExportIssue } from "@/lib/issueExport";
import { api, download, useConfig } from "@/lib/client";
import { BRAND } from "@/lib/brand";
import { siteLink } from "@/lib/hosts";
import { browserAuth } from "@/lib/supabaseBrowser";
import type { Org, ReportSummary, SiteSummary, IssueRef } from "@/lib/accounts";
import type { AlertRow } from "@/lib/alerts";
import type { SiteMonitorRow } from "@/lib/orgMonitoring";
import type { UsageSummary } from "@/lib/entitlements";
import type { Member, Invite } from "@/lib/teams";
import type { Schedule } from "@/lib/schedules";
import { DEMO_ALERTS, DEMO_MONITORS, DEMO_SITES } from "@/lib/dashboardDemo";
import { LogoMark } from "./Logo";
import { Ring } from "./ui";
import LineChart from "./LineChart";
import PlanPanel from "./PlanPanel";
import AppsPanel from "./AppsPanel";
import VisibilityPanel from "./VisibilityPanel";
import DashboardSkeleton from "./DashboardSkeleton";
import Upsell from "./Upsell";
import { ApiKeysCard, BrandingCard, ChangeEmailCard, ExportCard, Onboarding, WidgetsCard } from "./AccountPanels";
import Auditor from "./Auditor";
import ReportForm from "./ReportForm";
import ReportView from "./ReportView";
import AppCheck from "./AppCheck";

interface Me { email: string; org: Org; role: string }
type Section = "overview" | "check" | "report" | "websites" | "apps" | "visibility" | "content" | "reports" | "fixes" | "alerts" | "team" | "agency" | "plan" | "settings";

const NAV: { key: Section; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "check", label: "New check", icon: ScanSearch },
  { key: "websites", label: "Websites", icon: Globe },
  { key: "apps", label: "Apps", icon: Smartphone },
  { key: "visibility", label: "AI visibility", icon: MessageSquareText },
  { key: "content", label: "Keywords & content", icon: PenLine },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "fixes", label: "Fixes", icon: Wrench },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "team", label: "Team", icon: Users },
  { key: "agency", label: "Agency", icon: Building2 },
  { key: "settings", label: "Settings", icon: Settings },
];
const SECTIONS: Section[] = [...NAV.map((n) => n.key), "plan", "report"];
type CheckMode = "page" | "full" | "app";

/** Where a link inside the dashboard goes. Everything stays in the app, with real URLs so Back works. */
interface To { tab: Section; id?: string; mode?: CheckMode; url?: string }
const NavCtx = createContext<{ go: (to: To) => void; href: (to: To) => string }>({ go: () => {}, href: () => "/dashboard" });

/** A normal link (so new-tab and copy-link work) that switches section without reloading. */
function AppLink({ to, className, children }: { to: To; className?: string; children: ReactNode }) {
  const nav = useContext(NavCtx);
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    nav.go(to);
  };
  return <a className={className} href={nav.href(to)} onClick={click}>{children}</a>;
}

function readTo(): To {
  const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tab = SECTIONS.includes(p.get("tab") as Section) ? (p.get("tab") as Section) : "overview";
  const mode = (["page", "full", "app"] as const).find((m) => m === p.get("mode"));
  return { tab, id: p.get("id") ?? undefined, mode, url: p.get("url") ?? undefined };
}
const PLAN_NAME: Record<string, string> = { free: "Free", pro: "Pro", agency: "Agency" };

const statusOf = (n: number) => (n >= 85 ? "good" : n >= 60 ? "ok" : "bad");
const STATUS_LABEL = { good: "Good", ok: "Needs work", bad: "Poor" } as const;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : fmt(iso);
};
const impact = (w: number) => (w >= 3 ? "High impact" : w === 2 ? "Medium impact" : "Low impact");
const nextCheck = (monitors: SiteMonitorRow[]) =>
  Math.max(Date.now(), Math.min(...monitors.map((m) => (m.last_run_at ? Date.parse(m.last_run_at) + m.every_days * 86400000 : Date.now()))));
const ALERT_ICON = { fail: XCircle, warn: AlertTriangle, pass: CheckCircle2, info: Info } as const;

function StatusPill({ score }: { score: number }) {
  const s = statusOf(score);
  const Icon = s === "good" ? CheckCircle2 : AlertTriangle;
  return <span className={`dash-pill ${s}`}><Icon size={13} aria-hidden="true" /> {STATUS_LABEL[s]}</span>;
}

export default function Dashboard() {
  // Scrollable tables and code must be reachable by keyboard (WCAG 2.1.1), as on the public pages (Motion.tsx).
  useEffect(() => {
    const focusable = () => document.querySelectorAll<HTMLElement>(".app-main pre, .app-main .table-wrap").forEach((el) => { if (!el.hasAttribute("tabindex")) el.tabIndex = 0; });
    focusable();
    const mo = new MutationObserver(focusable);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  const [demo] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1");
  // ?claim= comes back from Stripe after buying one report before signing in.
  const [claimId] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("claim") : null));
  const [notice, setNotice] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  const [state, setState] = useState<"loading" | "signed-out" | "ready" | "error">("loading");
  const [err, setErr] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [monitors, setMonitors] = useState<SiteMonitorRow[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [to, setTo] = useState<To>(readTo);
  const section = to.tab;
  // Changes on every navigation, so a check started from a link (with ?url=) runs again.
  const [navKey, setNavKey] = useState(0);
  useEffect(() => {
    const back = () => { setTo(readTo()); setNavKey((k) => k + 1); };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  const billing = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("billing") : null;

  const loadData = useCallback(async () => {
    const [s, a, u, m, r, o] = await Promise.all([
      api<{ sites: SiteSummary[] }>("/api/me/sites"),
      api<{ alerts: AlertRow[] }>("/api/me/alerts").catch(() => ({ alerts: [] })),
      api<UsageSummary>("/api/me/usage").catch(() => null),
      api<{ monitors: SiteMonitorRow[] }>("/api/me/monitors").catch(() => ({ monitors: [] })),
      api<{ reports: ReportSummary[] }>("/api/me/reports").catch(() => ({ reports: [] })),
      api<{ orgs: { id: string; name: string }[] }>("/api/me/orgs").catch(() => ({ orgs: [] })),
    ]);
    setSites(s.sites);
    setAlerts(a.alerts);
    setUsage(u);
    setMonitors(m.monitors);
    setReports(r.reports);
    setOrgs(o.orgs);
    setSelected((cur) => (cur && s.sites.some((x) => x.id === cur) ? cur : s.sites[0]?.id ?? null));
  }, []);

  useEffect(() => {
    if (demo) {
      setMe({ email: "you@yourbusiness.com", org: { id: "demo", name: "Your Business", plan: "pro" }, role: "owner" });
      setSites(DEMO_SITES);
      setAlerts(DEMO_ALERTS);
      setMonitors(DEMO_MONITORS);
      setSelected(DEMO_SITES[0].id);
      setState("ready");
      return;
    }
    api<Me>("/api/me")
      .then(async (m) => {
        setMe(m);
        // A referral link opened before signing up: credit the referrer once.
        const ref = takeReferral();
        if (ref) void api("/api/me/referrals", { method: "POST", body: JSON.stringify({ code: ref }) }).catch(() => {});
        if (claimId) {
          try {
            const r = await api<{ url: string }>("/api/billing/claim", { method: "POST", body: JSON.stringify({ session: claimId }) });
            // Start the report the visitor paid for.
            window.location.replace(`/dashboard?tab=check&mode=full${r.url ? `&url=${encodeURIComponent(r.url)}` : ""}`);
            return;
          } catch (e) {
            setNotice({ kind: "bad", text: e instanceof Error ? e.message : "We couldn't add your report." });
          }
        }
        await loadData();
        setState("ready");
      })
      .catch((e: Error) => {
        if (/sign in/i.test(e.message)) setState("signed-out");
        else {
          setErr(e.message);
          setState("error");
        }
      });
  }, [demo, loadData, claimId]);

  if (state === "loading") return <DashboardSkeleton />;
  if (state === "signed-out")
    return (
      <Gate>
        <div className="app-gate card">
          {claimId ? (
            <>
              <h1>Your payment went through</h1>
              <p className="muted">Sign in or create a free account, and your full report is added to it and starts straight away.</p>
            </>
          ) : (
            <>
              <h1>Sign in to see your dashboard</h1>
              <p className="muted">Your saved sites, score history, alerts and reports live here.</p>
            </>
          )}
          <div className="site-actions">
            <a className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/dashboard${claimId ? `?claim=${claimId}` : ""}`)}`}>{claimId ? "Sign in to get your report" : "Sign in"} <ArrowRight size={16} aria-hidden="true" /></a>
            <a className="btn" href="/dashboard?demo=1">See a preview</a>
          </div>
        </div>
      </Gate>
    );
  if (state === "error" || !me)
    return (
      <Gate>
        <div className="app-gate card" role="alert">
          <h1>We couldn&apos;t load your dashboard</h1>
          <p className="muted">Try again in a minute. If it keeps happening, <a href={siteLink("/contact")}>contact us</a>.</p>
          {err && <p className="muted small">Details: {err}</p>}
          <div className="site-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden="true" /> Try again</button>
            <a className="btn" href={siteLink("/")}>Back to the home page</a>
          </div>
        </div>
      </Gate>
    );

  const unread = alerts.filter((a) => !a.read).length;
  const canEdit = !demo && me.role !== "viewer";
  const site = sites.find((s) => s.id === selected) ?? sites[0] ?? null;
  const sitesLimit = demo ? 3 : usage && usage.limits.sites > 0 ? usage.limits.sites : null;
  const href = (n: To) => {
    const q = new URLSearchParams({ tab: n.tab });
    if (n.id) q.set("id", n.id);
    if (n.mode) q.set("mode", n.mode);
    if (n.url) q.set("url", n.url);
    if (demo) q.set("demo", "1");
    return `/dashboard?${q}`;
  };
  const goTo = (n: To) => {
    // Leaving a check or report: refresh scores, since a signed-in check is saved to the site's history.
    if ((section === "check" || section === "report") && n.tab !== section && !demo) void loadData().catch(() => {});
    if (n.tab === "alerts" && unread && !demo) api("/api/me/alerts", { method: "POST" }).then(() => setAlerts((x) => x.map((a) => ({ ...a, read: true })))).catch(() => {});
    window.history.pushState(null, "", href(n));
    setTo(n);
    setNavKey((k) => k + 1);
    window.scrollTo(0, 0);
  };
  const go = (s: Section) => goTo({ tab: s });
  const recheckAll = async () => {
    for (const s of sites) await api(`/api/me/sites/${s.id}/check`, { method: "POST" }).catch(() => {});
    await loadData();
  };
  const switchOrg = async (orgId: string) => {
    await api("/api/me/orgs", { method: "POST", body: JSON.stringify({ orgId }) });
    window.location.href = "/dashboard";
  };

  const heads: Record<Section, [string, string]> = {
    overview: ["Overview", `${sites.length} website${sites.length === 1 ? "" : "s"}${monitors.length ? ` · Weekly checks run on ${new Date(nextCheck(monitors)).toLocaleDateString("en-GB", { weekday: "long" })}s` : ""}`],
    websites: ["Websites", "Add sites, turn on weekly checks and schedule client reports."],
    apps: ["Apps", "Track App Store and Google Play listings and competitors."],
    visibility: ["AI visibility", "How often AI assistants mention your sites, week by week."],
    content: ["Keywords & content", "Where you rank in Google, who links to you, and AI-written article drafts."],
    check: ["New check", "Check one page, run a full site report or check an app listing. Checks of your saved sites are added to their history."],
    report: ["Report", "Full site report. Anyone with the share link can view it."],
    reports: ["Reports", "Every full report your team has run."],
    fixes: ["Fixes", "The most important problems across your sites, by impact."],
    alerts: ["Alerts", "Score changes, rating drops and competitor updates."],
    team: ["Team", "Invite people and choose what they can do."],
    agency: ["Agency", "Your branding on client reports, your own report domain, and an audit widget for your website."],
    plan: ["Plan", "Your plan, this month's usage and billing."],
    settings: ["Settings", "Your account, API keys and data."],
  };
  // First-run checklist. Each step is done when the data says so, not when it's clicked.
  const setup = demo ? null : (
    <Onboarding
      steps={[
        { key: "site", label: "Add your first website", done: sites.length > 0, action: "Add a website", go: () => go("websites") },
        { key: "check", label: "Run a check to see your scores", done: sites.some((s) => !!s.latest), action: "Run a check", go: () => goTo({ tab: "check", mode: "page", url: sites[0]?.url }) },
        { key: "weekly", label: "Turn on weekly checks and alerts", done: monitors.length > 0, action: "Turn on", go: () => go("websites") },
        { key: "report", label: "Run a full site report", done: reports.length > 0, action: "Run a report", go: () => goTo({ tab: "check", mode: "full", url: sites[0]?.url }) },
      ]}
    />
  );
  // Close to a limit: say so before it blocks anything, with a way to get more.
  const nudge = (() => {
    if (!usage?.paywall || usage.plan === "agency") return null;
    const items: [string, number, number][] = [
      ["websites", usage.used.sites, usage.limits.sites],
      ["full reports this month", usage.used.fullReports, usage.limits.fullReportsPerMonth],
      ["AI credits this month", usage.used.aiCredits, usage.limits.aiCreditsPerMonth],
    ];
    const near = items.find(([, used, limit]) => limit > 0 && used / limit >= 0.8);
    if (!near) return null;
    const [what, used, limit] = near;
    return (
      <div className="usage-nudge" role="status">
        <p>You&apos;ve used <strong>{used} of {limit}</strong> {what} on the {PLAN_NAME[usage.plan] ?? usage.plan} plan.</p>
        <button type="button" className="btn btn-sm" onClick={() => go("plan")}>See plans</button>
      </div>
    );
  })();
  const signInOnly = (what: string) => <div className="card dash-empty"><h3>{what}</h3><p className="muted">This part of the dashboard works once you sign in. The preview only shows example data.</p><a className="btn btn-primary" href="/login">Sign in <ArrowRight size={16} aria-hidden="true" /></a></div>;

  return (
    <NavCtx.Provider value={{ go: goTo, href }}>
    <div className="app-shell">
      <aside className="app-side" aria-label="Dashboard">
        <a className="app-logo" href={siteLink("/")} aria-label={`${BRAND.name} home`}><LogoMark size={28} /><span aria-hidden="true">{BRAND.name}</span></a>
        {orgs.length > 1 && (
          <label className="org-switch">
            <span className="sr-only">Team</span>
            <select value={me.org.id} onChange={(e) => switchOrg(e.target.value)}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
          </label>
        )}
        <nav className="app-nav">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={section === key || (key === "reports" && section === "report") ? "on" : ""} aria-current={section === key ? "page" : undefined} onClick={() => go(key)}>
              <Icon size={18} aria-hidden="true" /> <span>{label}</span>
              {key === "alerts" && unread > 0 && <span className="nav-count" aria-label={`${unread} unread`}>{unread}</span>}
            </button>
          ))}
        </nav>
        <a className="side-link" href={siteLink("/tools")}>Free tools <ExternalLink size={14} aria-hidden="true" /></a>
        <div className="side-plan">
          <strong>{PLAN_NAME[me.org.plan] ?? me.org.plan} plan</strong>
          <span>{sitesLimit ? `${sites.length} of ${sitesLimit} websites used` : `${sites.length} website${sites.length === 1 ? "" : "s"}`}</span>
          {sitesLimit && <div className="side-bar"><i style={{ width: `${Math.min(100, (sites.length / sitesLimit) * 100)}%` }} /></div>}
          <button type="button" onClick={() => go("plan")}>Manage plan</button>
        </div>
      </aside>

      <main id="main" className="app-main">
        {demo && <p className="demo-banner">Preview with example data. <a href="/login">Sign in</a> to see your own sites.</p>}
        {notice && <p className={`lead-done ${notice.kind === "bad" ? "notice-bad" : ""}`} role={notice.kind === "bad" ? "alert" : "status"}>{notice.text}</p>}
        {billing === "success" && <p className="lead-done" role="status">Thank you! Your payment went through. Your plan and credits update within a minute.</p>}
        <header className="app-head">
          <div>
            <h1>{heads[section][0]}</h1>
            <p className="muted small">{heads[section][1]}</p>
          </div>
          {section === "overview" && (
            <div className="site-actions">
              {demo && <button type="button" className="btn" disabled title="Sign in to check your own sites"><RefreshCw size={16} aria-hidden="true" /> Re-check all</button>}
              {canEdit && sites.length > 0 && <AsyncButton className="btn" icon={<RefreshCw size={16} aria-hidden="true" />} label="Re-check all" busyLabel="Checking…" onClick={recheckAll} />}
              <AppLink className="btn btn-primary" to={{ tab: "check" }}><Plus size={16} aria-hidden="true" /> New check</AppLink>
            </div>
          )}
        </header>

        {section === "overview" && (
          !sites.length ? (
            <>
              {setup}
              <div className="card dash-empty"><h3>Add your first website</h3><p className="muted">Save a site to see its scores, trend, fixes and AI crawler access here.</p><button className="btn btn-primary" onClick={() => go("websites")}>Add a website <ArrowRight size={16} aria-hidden="true" /></button></div>
            </>
          ) : (
            <>
              {setup}
              {nudge}
              <div className="site-cards">
                {sites.map((s) => <SiteCard key={s.id} s={s} active={site?.id === s.id} onSelect={() => setSelected(s.id)} />)}
              </div>
              <div className="dash-row">
                {site && <ScoreChart s={site} />}
                <AlertsCard alerts={alerts.slice(0, 4)} monitors={monitors} onAll={() => go("alerts")} />
              </div>
              <div className="dash-row">
                {site && <FixesCard s={site} reports={reports} />}
                <CrawlerTable sites={sites} />
              </div>
            </>
          )
        )}
        {section === "websites" && (demo ? signInOnly("Managing websites") : <><Websites sites={sites} monitors={monitors} canEdit={canEdit} email={me.email} reload={loadData} />{sites.length > 0 && <><GooglePanel sites={sites} isOwner={me.role === "owner"} canEdit={canEdit} /><BingPanel sites={sites} isOwner={me.role === "owner"} canEdit={canEdit} /><BotVisitsPanel sites={sites} canEdit={canEdit} /></>}</>)}
        {section === "apps" && (demo ? signInOnly("App tracking") : <AppsPanel canEdit={canEdit} />)}
        {section === "visibility" && (demo ? signInOnly("AI visibility tracking") : <VisibilityPanel canEdit={canEdit} />)}
        {section === "content" && (demo ? signInOnly("Keywords and content") : <SeoToolsPanel sites={sites} canEdit={canEdit} />)}
        {section === "check" && <Suspense fallback={null}><CheckPanel key={navKey} mode={to.mode ?? "page"} url={to.url ?? ""} onReport={(id) => goTo({ tab: "report", id })} /></Suspense>}
        {section === "report" && (to.id ? (
          <div className="dash-report">
            <AppLink className="link-btn back-link" to={{ tab: "reports" }}><ArrowLeft size={15} aria-hidden="true" /> All reports</AppLink>
            <ReportView key={to.id} id={to.id} />
          </div>
        ) : <Reports reports={reports} />)}
        {section === "reports" && <Reports reports={reports} />}
        {section === "fixes" && <AllFixes sites={sites} demo={demo} />}
        {section === "alerts" && <AlertList alerts={alerts} />}
        {section === "team" && (demo ? signInOnly("Your team") : <Team />)}
        {section === "agency" && (demo ? signInOnly("Agency tools") : <section className="dash-section" aria-label="Agency"><BrandingCard /><WidgetsCard /></section>)}
        {section === "plan" && (demo ? signInOnly("Billing") : <PlanPanel isOwner={me.role === "owner"} />)}
        {section === "settings" && (demo ? signInOnly("Settings") : <SettingsPanel me={me} reload={() => window.location.reload()} />)}
      </main>
      <Upsell onPlans={() => go("plan")} />
    </div>
    </NavCtx.Provider>
  );
}

/** Page check, full site report and App Check, run inside the dashboard. */
function CheckPanel({ mode: start, url, onReport }: { mode: CheckMode; url: string; onReport: (id: string) => void }) {
  const [mode, setMode] = useState<CheckMode>(start);
  const { cfg, on } = useConfig();
  const tabs: [CheckMode, string, boolean][] = [["page", "Page check", true], ["full", "Full site report", !cfg || on("siteCrawl")], ["app", "App Check", true]];
  return (
    <section className="dash-check" aria-label="New check">
      <div className="segmented" role="tablist" aria-label="Check type">
        {tabs.map(([k, label, ok]) => (
          <button key={k} role="tab" type="button" aria-selected={mode === k} className={mode === k ? "on" : ""} disabled={!ok} onClick={() => setMode(k)}>{label}</button>
        ))}
      </div>
      {mode === "page" && <Auditor />}
      {mode === "full" && <ReportForm initialUrl={url} cfg={cfg} on={on} onStarted={onReport} />}
      {mode === "app" && <AppCheck />}
    </section>
  );
}

/** Full-page wrapper for the loading, sign-in and error screens, with the logo linking home. */
function Gate({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="app-gate-page">
      <a className="app-gate-logo" href={siteLink("/")}><LogoMark size={30} /><span>{BRAND.name}</span></a>
      {children}
    </main>
  );
}

function AsyncButton({ label, busyLabel, onClick, className = "btn", icon }: { label: string; busyLabel: string; onClick: () => Promise<unknown>; className?: string; icon?: ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={className} disabled={busy} onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}>
      {icon} {busy ? busyLabel : label}
    </button>
  );
}

function CatBars({ s }: { s: { seo: number; aeo: number; geo: number } }) {
  return (
    <dl className="cat-bars">
      {([["SEO", s.seo], ["AEO", s.aeo], ["GEO", s.geo]] as const).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd><div className="bar-outer"><div className={`bar-inner ${statusOf(v)}`} style={{ width: `${Math.max(2, v)}%` }} /></div></dd>
          <dd className="cat-val">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SiteCard({ s, active, onSelect }: { s: SiteSummary; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`card site-tile ${active ? "on" : ""}`} aria-pressed={active} onClick={onSelect}>
      <div className="site-tile-top">
        <span className="mono site-domain">{s.domain}</span>
        {s.latest && <StatusPill score={s.latest.overall} />}
      </div>
      {s.latest ? (
        <>
          <div className="site-tile-score">
            <Ring value={s.latest.overall} size={64} />
            <div>
              {s.delta === null ? <span className="muted small">First check this week</span> : (
                <span className={`delta ${s.delta > 0 ? "up" : s.delta < 0 ? "down" : ""}`}>
                  {s.delta > 0 ? <TrendingUp size={15} aria-hidden="true" /> : s.delta < 0 ? <TrendingDown size={15} aria-hidden="true" /> : null}
                  {s.delta > 0 ? `+${s.delta}` : s.delta} since last week
                </span>
              )}
              <span className="muted small">Checked {fmt(s.latest.at)}</span>
            </div>
          </div>
          <CatBars s={s.latest} />
        </>
      ) : (
        <p className="muted small">Not checked yet. Open Websites and choose Check now.</p>
      )}
    </button>
  );
}

function ScoreChart({ s }: { s: SiteSummary }) {
  const pts = s.history.slice(-8);
  return (
    <section className="card dash-card chart-card" aria-label="Score over time">
      <div className="card-head">
        <div><h2>Score over {pts.length > 1 ? `${pts.length} checks` : "time"}</h2><p className="mono muted small">{s.domain}</p></div>
        <ul className="chart-legend">
          <li className="lg-overall">Overall</li><li className="lg-seo">SEO</li><li className="lg-aeo">AEO</li><li className="lg-geo">GEO</li>
        </ul>
      </div>
      {pts.length < 2 ? <p className="muted small">The chart appears after two checks.</p> : (
        <LineChart
          title={`Scores over time for ${s.domain}`}
          labels={pts.map((p) => fmt(p.at))}
          series={[
            { key: "overall", label: "Overall", values: pts.map((p) => p.overall), className: "s-overall" },
            { key: "seo", label: "SEO", values: pts.map((p) => p.seo), className: "s-seo" },
            { key: "aeo", label: "AEO", values: pts.map((p) => p.aeo), className: "s-aeo" },
            { key: "geo", label: "GEO", values: pts.map((p) => p.geo), className: "s-geo" },
          ]}
        />
      )}
      <SpeedTrend s={s} />
    </section>
  );
}

/** Speed of the top pages from full reports, once there are two to compare. */
function SpeedTrend({ s }: { s: SiteSummary }) {
  const pts = s.history.filter((p): p is typeof p & { speed: number } => typeof p.speed === "number").slice(-8);
  if (!pts.length) return null;
  const last = pts[pts.length - 1].speed;
  const change = pts.length > 1 ? last - pts[pts.length - 2].speed : null;
  return (
    <div className="speed-trend">
      <h3>Speed of your top pages <span className="muted small">(Google PageSpeed, mobile, from full reports)</span></h3>
      <p className="small">Latest average <strong>{last}</strong>{change !== null && <span className={change >= 0 ? "c-pass" : "c-fail"}> ({change >= 0 ? "+" : ""}{change} since the report before)</span>}.</p>
      {pts.length > 1 && (
        <LineChart title={`Top-page speed over time for ${s.domain}`} labels={pts.map((p) => fmt(p.at))} series={[{ key: "speed", label: "Speed", values: pts.map((p) => p.speed), className: "s-overall" }]} />
      )}
    </div>
  );
}

function AlertItem({ a }: { a: AlertRow }) {
  const Icon = ALERT_ICON[a.kind];
  return (
    <li className={`alert-item ${a.kind}`}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <div className="alert-top"><strong>{a.title}</strong><span className="muted small">{ago(a.created_at)}</span></div>
        {a.detail && <p>{a.detail}</p>}
        <span className="alert-kind">{{ fail: "Fail", warn: "Warning", pass: "Pass", info: "Info" }[a.kind]}</span>
      </div>
    </li>
  );
}

function AlertsCard({ alerts, monitors, onAll }: { alerts: AlertRow[]; monitors: SiteMonitorRow[]; onAll: () => void }) {
  const next = monitors.length ? nextCheck(monitors) : null;
  return (
    <section className="card dash-card alerts-card" aria-label="Alerts">
      <div className="card-head"><h2>Alerts</h2><button type="button" className="link-btn" onClick={onAll}>See all</button></div>
      {!alerts.length && !next ? <p className="muted small">No alerts yet. Turn on weekly checks in Websites to get them.</p> : (
        <ul className="alert-list">
          {alerts.map((a) => <AlertItem key={a.id} a={a} />)}
          {next && (
            <li className="alert-item info">
              <Info size={18} aria-hidden="true" />
              <div><div className="alert-top"><strong>Next weekly check</strong></div><p>{new Date(next).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC, for {monitors.length === 1 ? "1 website" : `all ${monitors.length} websites`}.</p><span className="alert-kind">Info</span></div>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function FixRow({ i, url, assign }: { i: IssueRef; url: string; assign?: React.ReactNode }) {
  const Icon = i.status === "fail" ? XCircle : AlertTriangle;
  return (
    <li className={`fix-row ${i.status}`}>
      <Icon size={20} aria-hidden="true" />
      <div className="fix-main">
        <strong>{i.title}</strong>
        <div className="fix-tags"><span className="mono">{i.category.toUpperCase()}</span><span className="mono">{impact(i.weight)}</span></div>
      </div>
      {assign}
      <span className={`dash-pill ${i.status === "fail" ? "bad" : "ok"}`}>{i.status === "fail" ? <XCircle size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />} {i.status === "fail" ? "Fail" : "Warning"}</span>
      <AppLink className="btn btn-sm" to={{ tab: "check", mode: "page", url }}>View fix <ArrowRight size={14} aria-hidden="true" /></AppLink>
    </li>
  );
}

function FixesCard({ s, reports }: { s: SiteSummary; reports: ReportSummary[] }) {
  const fails = s.issues.filter((i) => i.status === "fail").length;
  const report = reports.find((r) => r.status === "done" && r.url.includes(s.domain));
  return (
    <section className="card dash-card fixes-card" aria-label="Fixes to do">
      <div className="card-head">
        <div><h2>Fixes to do</h2><p className="muted small">{s.domain} · {fails} fail · {s.issues.length - fails} warning{s.issues.length - fails === 1 ? "" : "s"} · Sorted by impact</p></div>
        <AppLink className="link-btn" to={report ? { tab: "report", id: report.id } : { tab: "check", mode: "full", url: s.url }}>{report ? "Open full report" : "Run a full report"}</AppLink>
      </div>
      {!s.issues.length ? <p className="muted small">No problems recorded yet. Run a check to see what to fix.</p> : (
        <ul className="fix-list">{s.issues.slice(0, 6).map((i) => <FixRow key={i.id} i={i} url={s.url} />)}</ul>
      )}
    </section>
  );
}

/** Short column labels like the design: the first site in full, then only what differs ("shop.", ".co.uk"). */
function shortDomain(d: string, base: string) {
  if (d === base) return d;
  if (d.endsWith(`.${base}`)) return d.slice(0, -base.length);
  const [head, ...rest] = d.split(".");
  return head === base.split(".")[0] ? `.${rest.join(".")}` : d;
}

function CrawlerTable({ sites }: { sites: SiteSummary[] }) {
  const withBots = sites.filter((s) => s.bots.length);
  const bots = [...new Set(withBots.flatMap((s) => s.bots.map((b) => b.bot)))].slice(0, 8);
  return (
    <section className="card dash-card crawler-card" aria-label="AI crawler access">
      <div className="card-head"><h2>AI crawler access</h2></div>
      {!bots.length ? <p className="muted small">Shown after your first check.</p> : (
        <>
          <div className="table-wrap">
            <table className="crawler-table">
              <thead><tr><th>Crawler</th>{withBots.map((s) => <th key={s.id} className="mono" title={s.domain}>{shortDomain(s.domain, withBots[0].domain)}</th>)}</tr></thead>
              <tbody>
                {bots.map((b) => (
                  <tr key={b}>
                    <td className="mono">{b}</td>
                    {withBots.map((s) => {
                      const r = s.bots.find((x) => x.bot === b);
                      return <td key={s.id}>{!r ? <CircleMinus size={18} className="cr-none" aria-label="Not set" /> : r.allowed ? <CheckCircle2 size={18} className="cr-ok" aria-label="Allowed" /> : <XCircle size={18} className="cr-no" aria-label="Blocked" />}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="crawler-legend"><li><CheckCircle2 size={15} className="cr-ok" aria-hidden="true" /> Allowed</li><li><XCircle size={15} className="cr-no" aria-hidden="true" /> Blocked</li><li><CircleMinus size={15} className="cr-none" aria-hidden="true" /> Not set</li></ul>
        </>
      )}
    </section>
  );
}

type TeamPerson = { userId: string; email: string };
type FixState = { assignee: string; status: "open" | "doing" | "done"; note: string };
const NO_STATE: FixState = { assignee: "", status: "open", note: "" };
const FIX_STATUS_LABEL = { open: "Open", doing: "In progress", done: "Done" } as const;

/** Every issue across saved sites, with who's fixing it, its status and a note, and an export for Jira, Linear or a spreadsheet. */
function AllFixes({ sites, demo }: { sites: SiteSummary[]; demo: boolean }) {
  const rows = sites.flatMap((s) => s.issues.map((i) => ({ s, i }))).sort((a, b) => (a.i.status === b.i.status ? b.i.weight - a.i.weight : a.i.status === "fail" ? -1 : 1));
  const [people, setPeople] = useState<TeamPerson[]>([]);
  const [state, setState] = useState<Record<string, FixState>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [noteOpen, setNoteOpen] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (demo) return;
    api<{ assignments: { siteId: string; checkId: string; assignee: string | null; status?: FixState["status"]; note?: string | null }[]; members: TeamPerson[]; canEdit: boolean }>("/api/me/assignments")
      .then((r) => {
        setPeople(r.members);
        setCanEdit(r.canEdit);
        setState(Object.fromEntries(r.assignments.map((x) => [`${x.siteId}:${x.checkId}`, { assignee: x.assignee ?? "", status: x.status ?? "open", note: x.note ?? "" }])));
      })
      .catch(() => {});
  }, [demo]);
  const change = async (siteId: string, checkId: string, patch: Partial<FixState>) => {
    const key = `${siteId}:${checkId}`;
    const before = state[key] ?? NO_STATE;
    setState((o) => ({ ...o, [key]: { ...before, ...patch } }));
    setErr("");
    try {
      await api("/api/me/assignments", { method: "POST", body: JSON.stringify({ siteId, checkId, ...patch, ...("assignee" in patch ? { assignee: patch.assignee || null } : {}) }) });
    } catch (e) {
      setState((o) => ({ ...o, [key]: before }));
      setErr(e instanceof Error ? e.message : "Couldn't save that.");
    }
  };
  const emailOf = (id?: string) => people.find((p) => p.userId === id)?.email;
  const exportAs = (format: ExportFormat) => {
    const list: ExportIssue[] = rows.map(({ s, i }) => {
      const st = state[`${s.id}:${i.id}`] ?? NO_STATE;
      return { site: s.domain, url: s.url, title: i.title, status: i.status, category: i.category, weight: i.weight, detail: st.note ? `${i.detail} Note: ${st.note}` : i.detail, assignee: emailOf(st.assignee) };
    });
    download(`fixes-${format}-${new Date().toISOString().slice(0, 10)}.csv`, issuesCsv(list, format), "text/csv");
  };
  if (!rows.length) return <div className="card dash-empty"><h3>Nothing to fix yet</h3><p className="muted">Problems found by your checks appear here, most important first.</p></div>;
  const done = rows.filter(({ s, i }) => state[`${s.id}:${i.id}`]?.status === "done").length;
  return (
    <section className="card dash-card" aria-label="All fixes">
      <div className="card-head fixes-head">
        <p className="muted small">{rows.length} issue{rows.length === 1 ? "" : "s"} across {sites.length} site{sites.length === 1 ? "" : "s"}, most important first{done ? ` · ${done} marked done` : ""}.{people.length < 2 && !demo ? " Invite your team to assign fixes to people." : ""}</p>
        <div className="fixes-export" role="group" aria-label="Export fixes">
          <span className="muted small">Export for</span>
          <button type="button" className="btn btn-sm" onClick={() => exportAs("jira")}>Jira</button>
          <button type="button" className="btn btn-sm" onClick={() => exportAs("linear")}>Linear</button>
          <button type="button" className="btn btn-sm" onClick={() => exportAs("csv")}>CSV</button>
        </div>
      </div>
      {err && <p className="c-fail small" role="alert">{err}</p>}
      <ul className="fix-list">
        {rows.map(({ s, i }) => {
          const key = `${s.id}:${i.id}`;
          const st = state[key] ?? NO_STATE;
          return (
            <Fragment key={key}>
              <li className="mono muted small fix-site">{s.domain}</li>
              <FixRow i={i} url={s.url} assign={demo ? undefined : (
                <div className="fix-controls">
                  <label className="fix-assign">
                    <span className="sr-only">Status of {i.title}</span>
                    <select className={`field fix-status s-${st.status}`} disabled={!canEdit} value={st.status} onChange={(e) => change(s.id, i.id, { status: e.target.value as FixState["status"] })}>
                      {(["open", "doing", "done"] as const).map((k) => <option key={k} value={k}>{FIX_STATUS_LABEL[k]}</option>)}
                    </select>
                  </label>
                  {people.length > 1 && (
                    <label className="fix-assign">
                      <span className="sr-only">Who&apos;s fixing {i.title}</span>
                      <select className="field" disabled={!canEdit} value={st.assignee} onChange={(e) => change(s.id, i.id, { assignee: e.target.value })}>
                        <option value="">Unassigned</option>
                        {people.map((p) => <option key={p.userId} value={p.userId}>{p.email}</option>)}
                      </select>
                    </label>
                  )}
                  {canEdit && <button type="button" className="link small" onClick={() => setNoteOpen(noteOpen === key ? "" : key)}>{st.note ? "Edit note" : "Add note"}</button>}
                </div>
              )} />
              {st.note && noteOpen !== key && <li className="fix-note small muted">Note: {st.note}</li>}
              {noteOpen === key && (
                <li className="fix-note">
                  <form className="team-invite-row" onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("note") as string) ?? ""; void change(s.id, i.id, { note: v }); setNoteOpen(""); }}>
                    <label className="sr-only" htmlFor={`note-${key}`}>Note for {i.title}</label>
                    <input id={`note-${key}`} name="note" className="field" maxLength={500} defaultValue={st.note} placeholder="What's happening with this fix?" autoFocus />
                    <button className="btn btn-sm">Save</button>
                  </form>
                </li>
              )}
            </Fragment>
          );
        })}
      </ul>
    </section>
  );
}

function AlertList({ alerts }: { alerts: AlertRow[] }) {
  if (!alerts.length) return <div className="card dash-empty"><h3>No alerts yet</h3><p className="muted">Turn on weekly checks for your websites, track an app or AI visibility, and changes appear here.</p></div>;
  return <section className="card dash-card"><ul className="alert-list">{alerts.map((a) => <AlertItem key={a.id} a={a} />)}</ul></section>;
}

function Reports({ reports }: { reports: ReportSummary[] }) {
  if (!reports.length)
    return <div className="card dash-empty"><h3>No reports yet</h3><p className="muted">Full site reports you run while signed in appear here.</p><AppLink className="btn btn-primary" to={{ tab: "check", mode: "full" }}>Run a full report <ArrowRight size={16} aria-hidden="true" /></AppLink></div>;
  return (
    <section className="card dash-card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Site</th><th>Date</th><th>Score</th><th>Status</th><th><span className="sr-only">Open</span></th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.url.replace(/^https?:\/\//, "")}</td>
                <td>{fmt(r.createdAt)}</td>
                <td>{r.score ?? "–"}</td>
                <td>{r.status === "done" ? "Ready" : r.status === "deleted" ? "Expired" : r.status === "error" ? "Failed" : "Running"}</td>
                <td>{r.status !== "deleted" && <AppLink to={{ tab: "report", id: r.id }}>Open</AppLink>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Websites({ sites, monitors, canEdit, email, reload }: { sites: SiteSummary[]; monitors: SiteMonitorRow[]; canEdit: boolean; email: string; reload: () => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const loadSchedules = useCallback(() => api<{ schedules: Schedule[] }>("/api/me/schedules").then((r) => setSchedules(r.schedules)).catch(() => {}), []);
  useEffect(() => { void loadSchedules(); }, [loadSchedules]);
  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr("");
    try {
      await fn();
      await Promise.all([reload(), loadSchedules()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy("");
    }
  };
  const groups = useMemo(() => {
    const m = new Map<string, SiteSummary[]>();
    for (const s of sites) m.set(s.clientName ?? "", [...(m.get(s.clientName ?? "") ?? []), s]);
    return [...m.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
  }, [sites]);

  return (
    <section className="dash-section" aria-label="Websites">
      {canEdit && (
        <form className="search dash-add" onSubmit={(e) => { e.preventDefault(); void act("add", () => api("/api/me/sites", { method: "POST", body: JSON.stringify({ url }) }).then(() => setUrl(""))); }}>
          <label htmlFor="add-site" className="sr-only">Website address</label>
          <input id="add-site" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Add a website, like example.com" />
          <button type="submit" disabled={busy === "add" || !url.trim()}><Plus size={16} aria-hidden="true" /> {busy === "add" ? "Adding…" : "Add website"}</button>
        </form>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {!sites.length && <div className="card dash-empty"><h3>No websites yet</h3><p className="muted">Add your first site above. Each check adds a point to its history.</p></div>}
      {groups.map(([client, list]) => (
        <div key={client || "own"} className="site-group">
          {groups.length > 1 && <h2 className="group-title">{client || "Your sites"}</h2>}
          <div className="site-rows">
            {list.map((s) => {
              const m = monitors.find((x) => x.site_id === s.id);
              const sch = schedules.find((x) => x.siteId === s.id);
              return (
                <article key={s.id} className="card site-row">
                  <div className="site-row-main">
                    {s.latest ? <Ring value={s.latest.overall} size={56} /> : <span className="site-noscore muted small">No score</span>}
                    <div>
                      <h3 className="mono">{s.domain}</h3>
                      <p className="muted small">{s.latest ? `Checked ${fmt(s.latest.at)}` : "Not checked yet"}{s.clientName ? ` · ${s.clientName}` : ""}</p>
                    </div>
                  </div>
                  <div className="site-row-opts">
                    <label className={`monitor-toggle ${m ? "on" : ""}`}>
                      <input type="checkbox" checked={!!m} disabled={!canEdit || busy === `m-${s.id}`} onChange={(e) => act(`m-${s.id}`, () => e.target.checked ? api("/api/me/monitors", { method: "POST", body: JSON.stringify({ siteId: s.id, everyDays: 7, email }) }) : api(`/api/me/monitors?siteId=${s.id}`, { method: "DELETE" }))} />
                      <span>{m ? `Weekly check, alerts to ${m.alert_email ?? "owners"}` : "Weekly check with email alerts"}</span>
                    </label>
                    <label className={`monitor-toggle ${sch ? "on" : ""}`}>
                      <input type="checkbox" checked={!!sch} disabled={!canEdit || busy === `s-${s.id}`} onChange={(e) => {
                        if (!e.target.checked) return void act(`s-${s.id}`, () => api(`/api/me/schedules?id=${sch?.id}`, { method: "DELETE" }));
                        const to = window.prompt("Email the monthly report to:", email);
                        if (to) void act(`s-${s.id}`, () => api("/api/me/schedules", { method: "POST", body: JSON.stringify({ siteId: s.id, email: to }) }));
                      }} />
                      <span>{sch ? `Monthly report to ${sch.email}` : "Monthly client report by email"}</span>
                    </label>
                  </div>
                  <div className="site-actions">
                    {canEdit && <button className="btn btn-sm btn-primary" disabled={busy === s.id} onClick={() => act(s.id, () => api(`/api/me/sites/${s.id}/check`, { method: "POST" }))}><RefreshCw size={15} aria-hidden="true" /> {busy === s.id ? "Checking…" : "Check now"}</button>}
                    <AppLink className="btn btn-sm" to={{ tab: "check", mode: "full", url: s.url }}>Full report</AppLink>
                    {canEdit && <button className="btn btn-sm btn-ghost" onClick={() => { const n = window.prompt("Client name (leave empty for your own sites):", s.clientName ?? ""); if (n !== null) void act(`c-${s.id}`, () => api("/api/me/sites", { method: "PATCH", body: JSON.stringify({ id: s.id, clientName: n }) })); }}>Client</button>}
                    {canEdit && <button className="btn btn-sm btn-ghost icon-btn" aria-label={`Remove ${s.domain}`} onClick={() => window.confirm(`Remove ${s.domain}? Its history is deleted too.`) && act(`d-${s.id}`, () => api(`/api/me/sites?id=${s.id}`, { method: "DELETE" }))}><Trash2 size={15} aria-hidden="true" /></button>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function Team() {
  const [data, setData] = useState<{ members: Member[]; invites: Invite[]; seats: number; role: string } | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(() => api<{ members: Member[]; invites: Invite[]; seats: number; role: string }>("/api/me/team").then(setData).catch((e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  const act = async (fn: () => Promise<unknown>) => {
    setErr("");
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
    }
  };
  if (!data) return err ? <p className="c-fail small">{err}</p> : <div className="loading"><div className="spinner" /> Loading your team…</div>;
  const owner = data.role === "owner";
  const used = data.members.length + data.invites.length;
  return (
    <section className="dash-section" aria-label="Team">
      {owner && (
        <form className="card team-invite" onSubmit={(e) => { e.preventDefault(); void act(async () => { const r = await api<{ link: string; emailed: boolean }>("/api/me/team", { method: "POST", body: JSON.stringify({ email, role }) }); setLink(r.emailed ? "" : r.link); setEmail(""); }); }}>
          <h2>Invite someone</h2>
          <p className="muted small">{used} of {data.seats} seats used. Editors can add sites and run checks. Viewers can only look.</p>
          <div className="team-invite-row">
            <label className="sr-only" htmlFor="invite-email">Email</label>
            <input id="invite-email" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
            <label className="sr-only" htmlFor="invite-role">Role</label>
            <select id="invite-role" className="field" value={role} onChange={(e) => setRole(e.target.value)}><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
            <button className="btn btn-primary">Send invite</button>
          </div>
          {link && <p className="small">Email isn&apos;t set up, so send this link yourself: <code className="invite-link">{link}</code></p>}
        </form>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      <div className="card dash-card">
        <h2>Members</h2>
        <ul className="member-list">
          {data.members.map((m) => (
            <li key={m.userId}>
              <span>{m.email}{m.you && <span className="muted"> (you)</span>}</span>
              {owner && !m.you ? (
                <select className="field" value={m.role} aria-label={`Role for ${m.email}`} onChange={(e) => act(() => api("/api/me/team", { method: "PATCH", body: JSON.stringify({ userId: m.userId, role: e.target.value }) }))}>
                  <option value="owner">Owner</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                </select>
              ) : <span className="muted">{m.role[0].toUpperCase() + m.role.slice(1)}</span>}
              {(owner || m.you) && <button className="btn btn-sm btn-ghost" onClick={() => window.confirm(m.you ? "Leave this team?" : `Remove ${m.email} from the team?`) && act(() => api(`/api/me/team?userId=${m.userId}`, { method: "DELETE" }).then(() => { if (m.you) window.location.href = "/dashboard"; }))}>{m.you ? "Leave" : "Remove"}</button>}
            </li>
          ))}
        </ul>
        {owner && data.invites.length > 0 && (
          <>
            <h3 className="vis-h">Waiting to accept</h3>
            <ul className="member-list">
              {data.invites.map((i) => <li key={i.id}><span>{i.email}</span><span className="muted">{i.role}</span><button className="btn btn-sm btn-ghost" onClick={() => act(() => api(`/api/me/team?invite=${i.id}`, { method: "DELETE" }))}>Withdraw</button></li>)}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/** Send dashboard alerts to a Slack channel through an incoming webhook. */
function SlackCard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { api<{ connected: boolean }>("/api/me/slack").then((r) => setConnected(r.connected)).catch(() => setConnected(false)); }, []);
  const save = async (value: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ connected: boolean }>("/api/me/slack", { method: "PUT", body: JSON.stringify({ url: value }) });
      setConnected(r.connected);
      setUrl("");
      setMsg({ ok: true, text: r.connected ? "Connected. We sent a test message to the channel." : "Slack is disconnected." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't work." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card dash-card">
      <h3>Slack alerts</h3>
      <p className="muted small">Post every alert (score drops, new failing checks, app and AI visibility changes) to a Slack channel as well as by email. In Slack, add the Incoming Webhooks app to a channel and paste its webhook URL here.</p>
      {connected ? (
        <div className="site-actions">
          <span className="dash-pill good">Connected</span>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => save("")}>{busy ? "Working…" : "Disconnect"}</button>
        </div>
      ) : (
        <form className="team-invite-row" onSubmit={(e) => { e.preventDefault(); void save(url); }}>
          <label className="sr-only" htmlFor="slack-url">Slack webhook URL</label>
          <input id="slack-url" className="field" inputMode="url" placeholder="https://hooks.slack.com/services/…" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <button className="btn" disabled={busy || connected === null}>{busy ? "Testing…" : "Connect"}</button>
        </form>
      )}
      {msg && <p className={`small ${msg.ok ? "c-pass" : "c-fail"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </div>
  );
}

/** A team webhook: alerts and finished reports POSTed as signed JSON (for Zapier, Make or your own code). */
function WebhookCard() {
  const [hook, setHook] = useState<{ url: string } | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { api<{ webhook: { url: string } | null }>("/api/me/webhook").then((r) => setHook(r.webhook)).catch(() => setHook(null)); }, []);
  const save = async (value: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ secret: string | null }>("/api/me/webhook", { method: "PUT", body: JSON.stringify({ url: value }) });
      setHook(value ? { url: value } : null);
      setSecret(r.secret ?? "");
      setUrl("");
      setMsg({ ok: true, text: value ? "Connected. We sent a test request." : "Webhook removed." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't work." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card dash-card">
      <h3>Webhook</h3>
      <p className="muted small">Send every alert and each finished full report to your own address as JSON, for Zapier, Make or your own code. Each request carries an <code>x-webhook-signature</code> header (HMAC-SHA256 of the body with your secret).</p>
      {hook ? (
        <div className="site-actions">
          <span className="mono small">{hook.url}</span>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => save("")}>{busy ? "Working…" : "Remove"}</button>
        </div>
      ) : (
        <form className="team-invite-row" onSubmit={(e) => { e.preventDefault(); void save(url); }}>
          <label className="sr-only" htmlFor="webhook-url">Webhook URL</label>
          <input id="webhook-url" className="field" inputMode="url" placeholder="https://hooks.zapier.com/…" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <button className="btn" disabled={busy || hook === undefined}>{busy ? "Testing…" : "Connect"}</button>
        </form>
      )}
      {secret && <p className="small">Your signing secret (shown once; copy it now): <code className="mono">{secret}</code></p>}
      {msg && <p className={`small ${msg.ok ? "c-pass" : "c-fail"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </div>
  );
}

function SettingsPanel({ me, reload }: { me: Me; reload: () => void }) {
  const [name, setName] = useState(me.org.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const signOut = async () => {
    await browserAuth()?.auth.signOut();
    window.location.href = "/";
  };
  const del = async () => {
    if (!window.confirm("Delete your account? Your saved sites, score history and report links are deleted. This can't be undone.")) return;
    setBusy(true);
    try {
      await api("/api/me/account", { method: "DELETE" });
      await browserAuth()?.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Couldn't delete the account.");
    }
  };
  return (
    <section className="dash-section" aria-label="Settings">
      {me.role === "owner" && (
        <form className="card dash-card settings-row" onSubmit={async (e) => { e.preventDefault(); try { await api("/api/me/orgs", { method: "PATCH", body: JSON.stringify({ name }) }); reload(); } catch (x) { setErr(x instanceof Error ? x.message : "Couldn't rename."); } }}>
          <label className="lbl" htmlFor="team-name">Team name</label>
          <div className="team-invite-row"><input id="team-name" className="field" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn">Save</button></div>
        </form>
      )}
      <div className="card dash-card dash-account">
        <dl>
          <div><dt>Email</dt><dd>{me.email}</dd></div>
          <div><dt>Team</dt><dd>{me.org.name}</dd></div>
          <div><dt>Your role</dt><dd>{me.role[0].toUpperCase() + me.role.slice(1)}</dd></div>
        </dl>
        <div className="site-actions">
          <button className="btn" onClick={signOut}>Sign out</button>
          <button className="btn btn-ghost c-fail" disabled={busy} onClick={del}>{busy ? "Deleting…" : "Delete account"}</button>
        </div>
        {err && <p className="c-fail small" role="alert">{err}</p>}
      </div>
      <ChangeEmailCard email={me.email} />
      {me.role === "owner" && <SlackCard />}
      {me.role === "owner" && <WebhookCard />}
      <ApiKeysCard />
      <ExportCard />
    </section>
  );
}
