import { LIMITS, featureEnabled, isAdmin } from "@/lib/config";
import { createReport } from "@/lib/report";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl } from "@/lib/safeFetch";
import type { ReportOptions } from "@/lib/reportTypes";
import { optionalAccount } from "@/lib/apiAuth";
import { linkReport } from "@/lib/accounts";
import { CREDIT_COST, PaywallError, creditsLeft, limitsFor, planAllowsFor, spendCredits, useFullReport } from "@/lib/entitlements";
import { PAYWALL_ENABLED } from "@/lib/config";
import { availableEngines } from "@/lib/ai/visibility";

import { getBranding, whiteLabelFrom } from "@/lib/branding";
import { SIGNUP_GATE } from "@/lib/tiers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, n = 300) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  if (!featureEnabled("siteCrawl", req)) return Response.json({ error: "Full reports aren't available yet." }, { status: 404 });
  const acc = await optionalAccount(req);
  if ((PAYWALL_ENABLED || SIGNUP_GATE) && !acc) return Response.json({ error: "Create a free account to run a full site report.", signup: true }, { status: 401 });
  const plan = acc?.org ?? null;
  const limits = limitsFor(plan);
  if (!isAdmin(req) && !await rateLimit("report:" + clientIp(req), LIMITS.reportsPerHour))
    return Response.json({ error: "You've run a lot of reports — please try again in an hour." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const url = str(body.url, 2048);
  try {
    await assertPublicUrl(url);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid URL" }, { status: 400 });
  }

  const competitors: string[] = [];
  if (featureEnabled("competitors", req) && planAllowsFor(plan, "competitors") && Array.isArray(body.competitors)) {
    for (const c of body.competitors.map((x) => str(x, 2048)).filter(Boolean).slice(0, Math.min(LIMITS.maxCompetitors, limits.competitors))) {
      try {
        await assertPublicUrl(c);
        competitors.push(c);
      } catch (e) {
        return Response.json({ error: `Competitor "${c}": ${e instanceof Error ? e.message : "invalid"}` }, { status: 400 });
      }
    }
  }

  const want = (k: string) => body[k] === true;
  const options: ReportOptions = {
    maxPages: Math.min(Math.max(1, Number(body.maxPages) || LIMITS.maxPagesDefault), LIMITS.maxPagesHard, limits.maxPages),
    competitors,
    aiPlan: featureEnabled("aiPlan", req) && planAllowsFor(plan, "aiPlan") && body.aiPlan !== false,
    aiVisibility: featureEnabled("aiVisibility", req) && planAllowsFor(plan, "aiVisibility") && want("aiVisibility"),
    visibilityPrompts: Array.isArray(body.visibilityPrompts)
      ? body.visibilityPrompts.map((p) => str(p, 200)).filter(Boolean).slice(0, 20)
      : [],
    deepResearch: featureEnabled("deepResearch", req) && planAllowsFor(plan, "deepResearch") && want("deepResearch"),
    render: featureEnabled("jsRender", req) && planAllowsFor(plan, "jsRender") && want("render"),
    socialPosts: featureEnabled("socialPosts", req) && planAllowsFor(plan, "socialPosts") && want("socialPosts"),
  };
  if (featureEnabled("whiteLabel", req) && planAllowsFor(plan, "whiteLabel") && body.whiteLabel && typeof body.whiteLabel === "object") {
    const w = body.whiteLabel as Record<string, unknown>;
    const name = str(w.name, 80);
    const logoUrl = str(w.logoUrl, 500);
    const color = str(w.color, 20);
    if (name)
      options.whiteLabel = {
        name,
        logoUrl: /^https:\/\//.test(logoUrl) ? logoUrl : undefined,
        color: /^#[0-9a-f]{3,8}$/i.test(color) ? color : undefined,
      };
  }
  // No branding chosen for this report: use the team's saved branding, if it has some.
  if (!options.whiteLabel && acc && body.whiteLabel !== false) {
    const wl = whiteLabelFrom(acc.org, await getBranding(acc.org.id).catch(() => null));
    if (wl) options.whiteLabel = wl;
  }

  // AI features cost credits; a full report counts against the monthly limit. Both only once the paywall is on.
  const engines = options.aiVisibility ? Math.max(1, availableEngines().length) : 0;
  const cost =
    (options.aiPlan ? CREDIT_COST.aiPlan : 0) +
    (options.socialPosts ? CREDIT_COST.socialPosts : 0) +
    (options.deepResearch ? CREDIT_COST.deepResearch : 0) +
    engines * (options.visibilityPrompts.length || 8) * CREDIT_COST.visibilityAnswer;
  try {
    if (plan && cost > (await creditsLeft(plan))) throw new PaywallError(`These options need ${cost} AI credits and you don't have enough left this month. Turn some off, upgrade, or buy credits.`);
    await useFullReport(acc);
    await spendCredits(acc, cost, "full report");
  } catch (e) {
    if (e instanceof PaywallError) return Response.json({ error: e.message, upgrade: true }, { status: e.status });
    throw e;
  }
  const report = await createReport(url, options);
  if (acc) await linkReport(acc.org.id, report.id, url).catch((e) => console.error("Linking a report failed:", e));
  return Response.json({ id: report.id });
}
