import { recordSiteCheck } from "@/lib/siteChecks";
import { runAudit } from "@/lib/audit";
import { verifyApiKey } from "@/lib/apiKeys";
import { rateLimit } from "@/lib/rateLimit";
import { UnsafeUrlError } from "@/lib/safeFetch";
import { countAudit } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "access-control-allow-origin": "*" } });

/**
 * Public API: GET /api/v1/audit?url=example.com with header "Authorization: Bearer fdb_…"
 * (or x-api-key). Returns scores, every check and the key facts. See /developers.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-api-key");
  const key = await verifyApiKey(auth);
  if (!key) return json({ error: "Missing or invalid API key." }, 401);
  if (!rateLimit("apikey:" + key.id, key.perHour)) return json({ error: `Rate limit reached (${key.perHour} audits per hour).` }, 429);
  const url = (new URL(req.url).searchParams.get("url") ?? "").trim();
  if (!url || url.length > 2048) return json({ error: "Add ?url=" }, 400);
  try {
    const r = await runAudit(url);
    countAudit().catch(() => {});
    recordSiteCheck({ url: r.url, tool: "api", scores: r.scores, checks: r.checks });
    return json({ url: r.url, finalUrl: r.facts.finalUrl, auditedAt: r.auditedAt, scores: r.scores, checks: r.checks, facts: { ...r.facts, textExcerpt: undefined } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Audit failed." }, e instanceof UnsafeUrlError ? 400 : 502);
  }
}

export function OPTIONS() {
  return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, x-api-key", "access-control-allow-methods": "GET" } });
}
