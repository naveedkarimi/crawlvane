import { FEATURE_PLAN, LIMITS, PAYWALL_ENABLED, type FeatureKey } from "./config";
import { db, insertRow } from "./store";
import { limitEmail } from "./lifecycle";

/**
 * Plans, limits and AI credits. Change the numbers here and the whole app follows.
 * Nothing is enforced until PAYWALL_ENABLED is on: before that, everyone gets the generous launch limits.
 */
export type PlanId = "free" | "pro" | "agency";

export interface PlanLimits {
  sites: number;
  fullReportsPerMonth: number;
  maxPages: number;
  competitors: number;
  monitors: number;
  apps: number;
  aiCreditsPerMonth: number;
  seats: number;
  scheduledReports: number;
  visibilityTrackers: number;
  /** Keys for the public API. */
  apiKeys: number;
  /** Embeddable audit widgets. */
  widgets: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { sites: 1, fullReportsPerMonth: 2, maxPages: 50, competitors: 0, monitors: 1, apps: 1, aiCreditsPerMonth: 5, seats: 1, scheduledReports: 0, visibilityTrackers: 0, apiKeys: 0, widgets: 0 },
  pro: { sites: 3, fullReportsPerMonth: 30, maxPages: 300, competitors: 3, monitors: 3, apps: 3, aiCreditsPerMonth: 200, seats: 2, scheduledReports: 0, visibilityTrackers: 3, apiKeys: 1, widgets: 0 },
  agency: { sites: 25, fullReportsPerMonth: 200, maxPages: 300, competitors: 3, monitors: 25, apps: 25, aiCreditsPerMonth: 1000, seats: 10, scheduledReports: 25, visibilityTrackers: 25, apiKeys: 5, widgets: 5 },
};

/** While the paywall is off: today's launch limits. */
const LAUNCH: PlanLimits = {
  sites: 50, fullReportsPerMonth: Number.POSITIVE_INFINITY, maxPages: LIMITS.maxPagesHard, competitors: LIMITS.maxCompetitors,
  monitors: 50, apps: 50, aiCreditsPerMonth: Number.POSITIVE_INFINITY, seats: 50, scheduledReports: 50, visibilityTrackers: 50, apiKeys: 5, widgets: 5,
};

/** What each AI feature costs in credits. Each credit covers roughly one AI answer. */
export const CREDIT_COST = {
  aiPlan: 1,
  appAdvice: 2,
  appReviews: 3,
  socialPosts: 2,
  deepResearch: 10,
  /** Per question, per AI engine. */
  visibilityAnswer: 1,
  /** One AI call per tracking run to read how the answers describe the brand. */
  sentiment: 1,
  /** AI page helpers on the page check. */
  topicCoverage: 1,
  answerRewrites: 2,
  faqBuilder: 1,
  metaWriter: 1,
  /** A content brief for one prompt where competitors are mentioned and you aren't. */
  gapBrief: 1,
} as const;

const RANK: Record<PlanId, number> = { free: 0, pro: 1, agency: 2 };
export const planOf = (org?: { plan?: string } | null): PlanId => (org?.plan && org.plan in PLAN_LIMITS ? (org.plan as PlanId) : "free");

/** Agency add-ons: each site pack adds this many saved and monitored sites. */
export const SITES_PER_PACK = 10;
export interface OrgPlanInfo { plan?: string; extra_seats?: number | null; extra_site_packs?: number | null }

/** The plan's limits, plus any add-on seats and site packs bought on top. */
export function limitsFor(org?: OrgPlanInfo | null): PlanLimits {
  if (!PAYWALL_ENABLED) return LAUNCH;
  const base = PLAN_LIMITS[planOf(org)];
  const seats = Math.max(0, Math.floor(Number(org?.extra_seats) || 0));
  const packs = Math.max(0, Math.floor(Number(org?.extra_site_packs) || 0));
  if (!seats && !packs) return base;
  const more = packs * SITES_PER_PACK;
  return { ...base, seats: base.seats + seats, sites: base.sites + more, monitors: base.monitors + more };
}

/** Is this feature included in the organisation's plan? Always true while the paywall is off. */
export function planAllowsFor(org: { plan?: string } | null | undefined, key: FeatureKey): boolean {
  if (!PAYWALL_ENABLED) return true;
  return RANK[planOf(org)] >= RANK[FEATURE_PLAN[key]];
}

export class PaywallError extends Error {
  constructor(message: string, public status = 402) {
    super(message);
  }
}

const period = () => new Date().toISOString().slice(0, 7);

function failed(what: string, e: { message: string }): never {
  throw new Error(`Database ${what} failed: ${e.message}`);
}

export async function usageThisMonth(orgId: string): Promise<Record<string, number>> {
  const { data, error } = await db().from("usage_counters").select("metric, count").eq("org_id", orgId).eq("period", period());
  if (error) failed("read", error);
  return Object.fromEntries((data ?? []).map((r) => [r.metric, Number(r.count)]));
}

export async function bumpUsage(orgId: string, metric: string, by = 1): Promise<number> {
  const { data, error } = await db().rpc("bump_usage", { p_org: orgId, p_period: period(), p_metric: metric, p_by: by });
  if (error) failed("write", error);
  return Number(data);
}

/** Bought credits or report packs not used yet. */
export async function packBalance(orgId: string, kind: "ai" | "report"): Promise<number> {
  const { data, error } = await db().from("credit_ledger").select("delta").eq("org_id", orgId).eq("kind", kind);
  if (error) failed("read", error);
  return (data ?? []).reduce((n, r) => n + Number(r.delta), 0);
}

export async function addPack(orgId: string, kind: "ai" | "report", amount: number, reason: string): Promise<void> {
  await insertRow("credit_ledger", { org_id: orgId, kind, delta: amount, reason });
}

/** How a spend splits between this month's allowance and bought packs. Null when there isn't enough. */
export function splitSpend(n: number, allowanceLeft: number, packs: number): { fromAllowance: number; fromPacks: number } | null {
  if (n <= 0) return { fromAllowance: 0, fromPacks: 0 };
  const fromAllowance = Math.min(n, Math.max(0, allowanceLeft));
  const fromPacks = n - fromAllowance;
  return fromPacks <= Math.max(0, packs) ? { fromAllowance, fromPacks } : null;
}

export async function creditsLeft(org: { id: string; plan?: string }): Promise<number> {
  if (!PAYWALL_ENABLED) return Number.POSITIVE_INFINITY;
  const [usage, packs] = await Promise.all([usageThisMonth(org.id), packBalance(org.id, "ai")]);
  return Math.max(0, limitsFor(org).aiCreditsPerMonth - (usage.ai_credits ?? 0)) + Math.max(0, packs);
}

type Payer = { org: { id: string } & OrgPlanInfo } | null;

/** Takes AI credits, from the monthly allowance first, then bought packs. Does nothing while the paywall is off. */
export async function spendCredits(account: Payer, n: number, reason: string): Promise<void> {
  if (!PAYWALL_ENABLED || n <= 0) return;
  if (!account) throw new PaywallError("Sign in to use AI features.", 401);
  const [usage, packs] = await Promise.all([usageThisMonth(account.org.id), packBalance(account.org.id, "ai")]);
  const split = splitSpend(n, limitsFor(account.org).aiCreditsPerMonth - (usage.ai_credits ?? 0), packs);
  if (!split) {
    void limitEmail(account.org.id, "limit_credits").catch(() => {});
    throw new PaywallError(`This needs ${n} AI credit${n === 1 ? "" : "s"} and you don't have enough left this month. Upgrade or buy more credits.`);
  }
  if (split.fromAllowance) await bumpUsage(account.org.id, "ai_credits", split.fromAllowance);
  if (split.fromPacks) await addPack(account.org.id, "ai", -split.fromPacks, reason);
}

/** Counts a full report against the monthly limit, or a bought one-off report. */
export async function useFullReport(account: Payer): Promise<void> {
  if (!PAYWALL_ENABLED) return;
  if (!account) throw new PaywallError("Sign in to run a full site report. It's free to start.", 401);
  const usage = await usageThisMonth(account.org.id);
  if ((usage.full_reports ?? 0) < limitsFor(account.org).fullReportsPerMonth) {
    await bumpUsage(account.org.id, "full_reports");
    return;
  }
  if ((await packBalance(account.org.id, "report")) > 0) {
    await addPack(account.org.id, "report", -1, "full report");
    return;
  }
  void limitEmail(account.org.id, "limit_reports").catch(() => {});
  throw new PaywallError("You've used this month's full reports. Upgrade, or buy a one-off report.");
}

export interface UsageSummary {
  paywall: boolean;
  plan: PlanId;
  limits: PlanLimits;
  used: { sites: number; fullReports: number; aiCredits: number };
  packs: { ai: number; report: number };
  creditsLeft: number | null;
  /** Added by /api/me/usage: yearly prices and the trial, when set up in Stripe. */
  billing?: { yearly: { pro: boolean; agency: boolean }; trialDays: number };
}

export async function usageSummary(org: { id: string; plan?: string }, sites: number): Promise<UsageSummary> {
  const [usage, ai, report] = await Promise.all([usageThisMonth(org.id), packBalance(org.id, "ai"), packBalance(org.id, "report")]);
  const limits = limitsFor(org);
  const left = PAYWALL_ENABLED ? Math.max(0, limits.aiCreditsPerMonth - (usage.ai_credits ?? 0)) + Math.max(0, ai) : null;
  const finite = (n: number) => (Number.isFinite(n) ? n : -1);
  return {
    paywall: PAYWALL_ENABLED,
    plan: planOf(org),
    limits: Object.fromEntries(Object.entries(limits).map(([k, v]) => [k, finite(v)])) as unknown as PlanLimits,
    used: { sites, fullReports: usage.full_reports ?? 0, aiCredits: usage.ai_credits ?? 0 },
    packs: { ai: Math.max(0, ai), report: Math.max(0, report) },
    creditsLeft: left,
  };
}
