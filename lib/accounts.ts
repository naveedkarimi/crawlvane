import type { SessionUser } from "./auth";
import { readJson, db, insertRow } from "./store";
import { domainOf } from "./siteChecks";
import type { Report } from "./reportTypes";
import type { AuditResult } from "./types";

/**
 * Accounts and organisations. Every user belongs to an organisation (a person or an agency);
 * sites, reports and later plans and credits belong to the organisation so teams share them.
 */
export type Role = "owner" | "editor" | "viewer";
export interface Org { id: string; name: string; plan: string; extra_seats?: number; extra_site_packs?: number }
export interface Account { user: SessionUser; org: Org; role: Role }
export interface Scores { overall: number; seo: number; aeo: number; geo: number }
export interface IssueRef { id: string; title: string; status: "fail" | "warn"; category: string; weight: number; detail: string }
export interface BotRef { bot: string; purpose: string; allowed: boolean }
export interface ScoreExtras { reportId?: string; fails?: number; issues?: IssueRef[]; bots?: BotRef[]; /** Average PageSpeed score of the top pages, from a full report. */ speed?: number }

/** What the dashboard keeps from a page audit besides the scores: the top problems and AI crawler access. */
export function extrasFromAudit(r: AuditResult): ScoreExtras {
  const bad = r.checks.filter((c): c is typeof c & { status: "fail" | "warn" } => c.status === "fail" || c.status === "warn");
  bad.sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1));
  return {
    fails: bad.filter((c) => c.status === "fail").length,
    issues: bad.slice(0, 12).map((c) => ({ id: c.id, title: c.title, status: c.status, category: c.category, weight: c.weight, detail: c.detail.slice(0, 200) })),
    bots: r.facts.bots.filter((b) => b.purpose !== "training").map((b) => ({ bot: b.bot, purpose: b.purpose, allowed: b.allowed })),
  };
}
export interface SiteSummary {
  id: string;
  url: string;
  domain: string;
  createdAt: string;
  clientName: string | null;
  latest: (Scores & { at: string; source: string }) | null;
  /** Change in the overall score against the last check at least a week older. */
  delta: number | null;
  issues: IssueRef[];
  bots: BotRef[];
  history: (Scores & { at: string; speed?: number | null })[];
}

export const MAX_SITES = 50;

function failed(what: string, e: { message: string }): never {
  throw new Error(`Database ${what} failed: ${e.message}`);
}

/** Finds the user's organisation, creating one (with them as owner) on first sign-in. */
export async function ensureAccount(user: SessionUser, preferredOrgId?: string | null): Promise<Account> {
  const { data: ms, error } = await db().from("memberships").select("org_id, role").eq("user_id", user.id).order("created_at");
  if (error) failed("read", error);
  const m = ms?.find((x) => x.org_id === preferredOrgId) ?? ms?.[0];
  let orgId = m?.org_id as string | undefined;
  let role = (m?.role as Role | undefined) ?? "owner";
  if (!orgId) {
    const name = (user.email.split("@")[0] || "My team").slice(0, 60);
    const { data: o, error: e1 } = await db().from("organizations").insert({ name }).select("id").single();
    if (e1) failed("write", e1);
    orgId = o.id as string;
    role = "owner";
    const { error: e2 } = await db().from("memberships").insert({ org_id: orgId, user_id: user.id, role });
    if (e2) failed("write", e2);
  }
  // "*" so the add-on columns come along when they exist, and older databases still work.
  const { data: row, error: e3 } = await db().from("organizations").select("*").eq("id", orgId).single();
  if (e3) failed("read", e3);
  const org: Org = { id: row.id, name: row.name, plan: row.plan, extra_seats: row.extra_seats ?? 0, extra_site_packs: row.extra_site_packs ?? 0 };
  return { user, org, role };
}

/** "Example.com/page" becomes https://example.com. Returns an error message for anything else. */
export function normalizeSiteUrl(raw: string): { url: string; domain: string } | string {
  const s = raw.trim();
  if (!s) return "Enter a website address.";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return "Enter a website address, like example.com.";
    const domain = domainOf(u.origin);
    if (!domain) return "Enter a website address, like example.com.";
    return { url: u.origin, domain };
  } catch {
    return "Enter a website address, like example.com.";
  }
}

export async function listSites(orgId: string): Promise<SiteSummary[]> {
  const { data: sites, error } = await db().from("sites").select("id, url, domain, client_name, created_at").eq("org_id", orgId).order("created_at");
  if (error) failed("read", error);
  if (!sites?.length) return [];
  const { data: scores, error: e2 } = await db()
    .from("site_scores")
    // "*" so a newer column (speed) that the database doesn't have yet can't break the dashboard.
    .select("*")
    .in("site_id", sites.map((s) => s.id))
    .order("created_at", { ascending: false })
    .limit(1000);
  if (e2) failed("read", e2);
  return sites.map((s) => {
    const mine = (scores ?? []).filter((x) => x.site_id === s.id);
    const l = mine[0];
    const weekOld = l ? mine.find((x) => Date.parse(l.created_at) - Date.parse(x.created_at) >= 6 * 86400000) : undefined;
    const withDetail = mine.find((x) => Array.isArray(x.issues));
    return {
      id: s.id,
      url: s.url,
      domain: s.domain,
      clientName: s.client_name ?? null,
      createdAt: s.created_at,
      latest: l ? { overall: l.overall, seo: l.seo, aeo: l.aeo, geo: l.geo, at: l.created_at, source: l.source } : null,
      delta: l && weekOld ? l.overall - weekOld.overall : null,
      issues: (withDetail?.issues ?? []) as IssueRef[],
      bots: (withDetail?.bots ?? []) as BotRef[],
      history: mine.slice(0, 40).reverse().map((x) => ({ at: x.created_at, overall: x.overall, seo: x.seo, aeo: x.aeo, geo: x.geo, speed: typeof x.speed === "number" ? x.speed : null })),
    };
  });
}

export async function addSite(orgId: string, raw: string, maxSites = MAX_SITES, planLimited = maxSites < MAX_SITES): Promise<{ id: string } | string> {
  const n = normalizeSiteUrl(raw);
  if (typeof n === "string") return n;
  const { count, error: e0 } = await db().from("sites").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if (e0) failed("read", e0);
  if ((count ?? 0) >= maxSites) return planLimited ? `Your plan includes ${maxSites} site${maxSites === 1 ? "" : "s"}. Upgrade to add more.` : `You can save up to ${maxSites} sites.`;
  const { data, error } = await db().from("sites").insert({ org_id: orgId, url: n.url, domain: n.domain }).select("id").single();
  if (error) return error.code === "23505" ? "That site is already saved." : failed("write", error);
  return { id: data.id as string };
}

export async function getSite(orgId: string, id: string): Promise<{ id: string; url: string; domain: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("sites").select("id, url, domain").eq("org_id", orgId).eq("id", id).maybeSingle();
  if (error) failed("read", error);
  return data;
}

export async function setClientName(orgId: string, id: string, name: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { error } = await db().from("sites").update({ client_name: name.trim().slice(0, 80) || null }).eq("org_id", orgId).eq("id", id);
  if (error) failed("write", error);
}

export async function removeSite(orgId: string, id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { error } = await db().from("sites").delete().eq("org_id", orgId).eq("id", id);
  if (error) failed("delete", error);
}

export async function siteForDomain(orgId: string, domain: string): Promise<string | null> {
  const { data, error } = await db().from("sites").select("id").eq("org_id", orgId).eq("domain", domain).maybeSingle();
  if (error) failed("read", error);
  return (data?.id as string) ?? null;
}

export async function recordScore(siteId: string, s: Scores, source: "page-check" | "report" | "monitor", x: ScoreExtras = {}): Promise<void> {
  const row = { site_id: siteId, overall: s.overall, seo: s.seo, aeo: s.aeo, geo: s.geo, source, report_id: x.reportId, fails: x.fails, issues: x.issues, bots: x.bots };
  if (x.speed === undefined) return insertRow("site_scores", row);
  // The speed column arrived in a later schema.sql. If it hasn't been run yet, keep the score without it.
  try {
    await insertRow("site_scores", { ...row, speed: x.speed });
  } catch (e) {
    if (!/speed/i.test(e instanceof Error ? e.message : "")) throw e;
    await insertRow("site_scores", row);
  }
}

/** Records a page check against a saved site, when the signed-in user's organisation has one for that domain. */
export async function recordCheckForOrg(orgId: string, url: string, r: AuditResult): Promise<void> {
  const domain = domainOf(url);
  const siteId = domain ? await siteForDomain(orgId, domain) : null;
  if (siteId) await recordScore(siteId, r.scores, "page-check", extrasFromAudit(r));
}

export async function linkReport(orgId: string, reportId: string, url: string): Promise<void> {
  const domain = domainOf(url);
  const siteId = domain ? await siteForDomain(orgId, domain) : null;
  await insertRow("org_reports", { org_id: orgId, report_id: reportId, url: url.slice(0, 500), site_id: siteId });
}

/** When a full report finishes, add its score to the saved site's history (if the report belongs to an organisation). */
export async function recordReportScore(reportId: string, s: Scores, home?: AuditResult, speed?: number | null): Promise<void> {
  const { data, error } = await db().from("org_reports").select("site_id").eq("report_id", reportId).maybeSingle();
  if (error) failed("read", error);
  if (data?.site_id) await recordScore(data.site_id as string, s, "report", { reportId, ...(home ? { issues: extrasFromAudit(home).issues, bots: extrasFromAudit(home).bots } : {}), ...(typeof speed === "number" ? { speed } : {}) });
}

export interface ReportSummary { id: string; url: string; createdAt: string; status: string; score: number | null }

export async function listReports(orgId: string): Promise<ReportSummary[]> {
  const { data, error } = await db().from("org_reports").select("report_id, url, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50);
  if (error) failed("read", error);
  return Promise.all(
    (data ?? []).map(async (r) => {
      const rep = await readJson<Report>("reports", r.report_id).catch(() => null);
      return { id: r.report_id, url: r.url, createdAt: r.created_at, status: rep ? rep.status : "deleted", score: rep?.site?.scores.overall ?? null };
    }),
  );
}

/** Deletes the user, and any organisation they're the only member of (its sites, scores and report links go with it). */
export async function deleteAccount(user: SessionUser): Promise<void> {
  const { data: mine, error } = await db().from("memberships").select("org_id").eq("user_id", user.id);
  if (error) failed("read", error);
  for (const m of mine ?? []) {
    const { count, error: e1 } = await db().from("memberships").select("user_id", { count: "exact", head: true }).eq("org_id", m.org_id);
    if (e1) failed("read", e1);
    if ((count ?? 0) <= 1) {
      const { error: e2 } = await db().from("organizations").delete().eq("id", m.org_id);
      if (e2) failed("delete", e2);
    }
  }
  const { error: e3 } = await db().auth.admin.deleteUser(user.id);
  if (e3) failed("delete", e3);
}
