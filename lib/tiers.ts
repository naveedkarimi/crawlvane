import { isPublic } from "./config";
import { PLAN_LIMITS } from "./entitlements";
import type { Check } from "./types";

/**
 * The ladder from visitor to Agency. Visitors get the basics; a free account unlocks the rest of
 * the free product; Pro and Agency add tracking and client work. Change what each level gets here.
 *
 * Visitor gates apply when SIGNUP_GATE=1 (and accounts are on). Plan limits apply when
 * PAYWALL_ENABLED=1. The two are separate, so you can collect sign-ups before taking payments.
 */
export const SIGNUP_GATE = /^(1|true)$/i.test(process.env.SIGNUP_GATE ?? "") && isPublic("accounts");

/** How many "how to fix" answers a visitor sees on a page check before signing up. */
export const VISITOR_FIX_PREVIEW = Math.max(0, Number(process.env.VISITOR_FIX_PREVIEW || 3));

/** What only a free account (or better) can do. */
export const SIGNUP_ONLY = ["allFixes", "aiPlan", "downloads", "fullReport"] as const;
export type SignupOnly = (typeof SIGNUP_ONLY)[number];

/** Should this visitor be asked to sign up first? */
export const visitorBlocked = (signedIn: boolean) => SIGNUP_GATE && !signedIn;

/**
 * Keeps the first few fixes, ordered by importance, and hides the rest behind sign-up.
 * Scores, issues and details stay visible: the free check has to be useful on its own.
 */
export function lockFixes(checks: Check[], keep = VISITOR_FIX_PREVIEW): Check[] {
  const shown = new Set(
    checks
      .filter((c) => c.fix && (c.status === "fail" || c.status === "warn"))
      .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1))
      .slice(0, keep)
      .map((c) => c.id),
  );
  const issue = (c: Check) => c.status === "fail" || c.status === "warn";
  return checks.map((c) => (c.fix && issue(c) && !shown.has(c.id) ? { ...c, fix: undefined, fixLocked: true } : c));
}

export type Tier = "visitor" | "free" | "pro" | "agency";
type Cell = string | boolean;

/** The comparison table on /pricing. Numbers come from the enforced plan limits. */
export function ladder(): { label: string; cells: Record<Tier, Cell> }[] {
  const f = PLAN_LIMITS.free, p = PLAN_LIMITS.pro, a = PLAN_LIMITS.agency;
  const gate = SIGNUP_GATE;
  const fixes = gate ? `First ${VISITOR_FIX_PREVIEW}` : true;
  return [
    { label: "Page check: about 50 SEO, AEO and GEO checks", cells: { visitor: true, free: true, pro: true, agency: true } },
    { label: "AI crawler access, Core Web Vitals and free tools", cells: { visitor: true, free: true, pro: true, agency: true } },
    { label: "How to fix each issue", cells: { visitor: fixes, free: true, pro: true, agency: true } },
    { label: "AI fix plan (AI credits a month)", cells: { visitor: !gate, free: `${f.aiCreditsPerMonth}`, pro: `${p.aiCreditsPerMonth}`, agency: `${a.aiCreditsPerMonth}` } },
    { label: "Download reports (Markdown, CSV, JSON)", cells: { visitor: !gate, free: true, pro: true, agency: true } },
    { label: "Full site reports a month", cells: { visitor: !gate, free: `${f.fullReportsPerMonth}`, pro: `${p.fullReportsPerMonth}`, agency: `${a.fullReportsPerMonth}` } },
    { label: "Pages per full report", cells: { visitor: !gate && `${f.maxPages}`, free: `${f.maxPages}`, pro: `${p.maxPages}`, agency: `${a.maxPages}` } },
    { label: "Saved websites with score history", cells: { visitor: false, free: `${f.sites}`, pro: `${p.sites}`, agency: `${a.sites}` } },
    { label: "Weekly checks with email alerts", cells: { visitor: false, free: f.monitors ? `${f.monitors}` : false, pro: `${p.monitors}`, agency: `${a.monitors}` } },
    { label: "Competitor comparison", cells: { visitor: false, free: f.competitors ? `${f.competitors}` : false, pro: `Up to ${p.competitors}`, agency: `Up to ${a.competitors}` } },
    { label: "AI visibility tracking (ChatGPT, Claude, Perplexity, Gemini)", cells: { visitor: false, free: false, pro: `${p.visibilityTrackers} sites`, agency: `${a.visibilityTrackers} sites` } },
    { label: "App Store and Google Play tracking", cells: { visitor: false, free: `${f.apps}`, pro: `${p.apps}`, agency: `${a.apps}` } },
    { label: "Team seats", cells: { visitor: false, free: `${f.seats}`, pro: `${p.seats}`, agency: `${a.seats}` } },
    { label: "API access", cells: { visitor: false, free: false, pro: `${p.apiKeys} key`, agency: `${a.apiKeys} keys` } },
    { label: "Your branding and domain on reports", cells: { visitor: false, free: false, pro: false, agency: true } },
    { label: "Monthly client reports by email", cells: { visitor: false, free: false, pro: false, agency: `${a.scheduledReports} sites` } },
    { label: "Audit widget for lead generation", cells: { visitor: false, free: false, pro: false, agency: `${a.widgets}` } },
  ];
}
