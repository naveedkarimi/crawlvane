import { verifyApiKey } from "@/lib/apiKeys";
import { rateLimit } from "@/lib/rateLimit";
import { UnsafeUrlError } from "@/lib/safeFetch";
import { limitsFor } from "@/lib/entitlements";
import { db } from "@/lib/store";
import { buildFixBundle } from "@/lib/fixBundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "access-control-allow-origin": "*" } });

/**
 * Public API: GET /api/v1/fixes?url=example.com with "Authorization: Bearer cv_…".
 * Returns ready-to-apply fixes (robots.txt, llms.txt, schema, head tags, sitemap). The WordPress
 * plugin uses this. Counts against the same hourly limit as /api/v1/audit.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-api-key");
  const key = await verifyApiKey(auth);
  if (!key) return json({ error: "Missing or invalid API key." }, 401);
  if (key.orgId) {
    const { data: org } = await db().from("organizations").select("plan").eq("id", key.orgId).maybeSingle();
    if (!org) return json({ error: "This API key's team no longer exists." }, 401);
    if (limitsFor(org).apiKeys < 1) return json({ error: "Your plan doesn't include the API. Upgrade in the dashboard." }, 402);
  }
  if (!rateLimit("apikey:" + key.id, key.perHour)) return json({ error: `Rate limit reached (${key.perHour} requests per hour).` }, 429);
  const url = (new URL(req.url).searchParams.get("url") ?? "").trim();
  if (!url || url.length > 2048) return json({ error: "Add ?url=" }, 400);
  try {
    return json(await buildFixBundle(url));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn't build fixes." }, e instanceof UnsafeUrlError ? 400 : 502);
  }
}

export function OPTIONS() {
  return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, x-api-key", "access-control-allow-methods": "GET" } });
}
