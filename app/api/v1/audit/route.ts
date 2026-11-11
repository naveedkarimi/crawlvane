import { recordSiteCheck } from "@/lib/siteChecks";
import { runAudit } from "@/lib/audit";
import { verifyApiKey } from "@/lib/apiKeys";
import { rateLimit } from "@/lib/rateLimit";
import { UnsafeUrlError } from "@/lib/safeFetch";
import { countAudit } from "@/lib/stats";
import { recordCheckForOrg } from "@/lib/accounts";
import { limitsFor } from "@/lib/entitlements";
import { db } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "access-control-allow-origin": "*" } });

/**
 * Public API: GET /api/v1/audit?url=example.com with header "Authorization: Bearer cv_…"
 * (or x-api-key). Returns scores, every check and the key facts. See /developers.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-api-key");
  const key = await verifyApiKey(auth);
  if (!key) return json({ error: "Missing or invalid API key." }, 401);
  if (key.orgId) {
    // A team's key works while its plan includes the API.
    const { data: org } = await db().from("organizations").select("plan").eq("id", key.orgId).maybeSingle();
    if (!org) return json({ error: "This API key's team no longer exists." }, 401);
    if (limitsFor(org).apiKeys < 1) return json({ error: "Your plan doesn't include the API. Upgrade in the dashboard." }, 402);
  }
  if (!rateLimit("apikey:" + key.id, key.perHour)) return json({ error: `Rate limit reached (${key.perHour} audits per hour).` }, 429);
  const url = (new URL(req.url).searchParams.get("url") ?? "").trim();
  if (!url || url.length > 2048) return json({ error: "Add ?url=" }, 400);
  try {
    const r = await runAudit(url);
    countAudit().catch(() => {});
    recordSiteCheck({ url: r.url, tool: "api", scores: r.scores, checks: r.checks });
    // Checks of a team's saved sites are added to their score history, like checks in the dashboard.
    if (key.orgId) recordCheckForOrg(key.orgId, r.url, r).catch(() => {});
    return json({ url: r.url, finalUrl: r.facts.finalUrl, auditedAt: r.auditedAt, scores: r.scores, checks: r.checks, facts: { ...r.facts, textExcerpt: undefined } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Audit failed." }, e instanceof UnsafeUrlError ? 400 : 502);
  }
}

export function OPTIONS() {
  return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, x-api-key", "access-control-allow-methods": "GET" } });
}
