import { recordSiteCheck } from "@/lib/siteChecks";
import { auditFetched, brokenSchemaImages, fetchPage, httpErrorMessage, loadSiteContext } from "@/lib/audit";
import { featureEnabled } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { UnsafeUrlError } from "@/lib/safeFetch";
import { analyzeSocial } from "@/lib/social";
import { countAudit } from "@/lib/stats";
import { optionalAccount } from "@/lib/apiAuth";
import { recordCheckForOrg } from "@/lib/accounts";
import { SIGNUP_GATE, lockFixes } from "@/lib/tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limit = Number(process.env.RATE_LIMIT_PER_HOUR ?? 30);
  if (!rateLimit("audit:" + clientIp(req), limit))
    return Response.json({ error: "Too many audits from your network — try again in a bit." }, { status: 429 });

  let url = "";
  let render = false;
  try {
    const body = await req.json();
    url = body.url;
    render = body.render === true && featureEnabled("jsRender", req);
  } catch {
    /* fallthrough */
  }
  if (!url || typeof url !== "string" || url.length > 2048)
    return Response.json({ error: "Please enter a URL." }, { status: 400 });

  try {
    const page = await fetchPage(url, { render });
    // An error page has nothing to audit, and scoring it would be misleading.
    if (page.status >= 400) return Response.json({ error: httpErrorMessage(page.status) }, { status: 502 });
    const [ctx, networkChecks] = await Promise.all([loadSiteContext(new URL(page.url).origin), brokenSchemaImages(page)]);
    const result = auditFetched(page.url, page, ctx, networkChecks);
    const social = featureEnabled("social", req) ? analyzeSocial(page.body, page.url) : undefined;
    countAudit().catch(() => {});
    recordSiteCheck({ url: result.url, tool: "page-check", scores: result.scores, checks: result.checks });
    const acc = await optionalAccount(req).catch(() => null);
    if (acc) void recordCheckForOrg(acc.org.id, result.url, result).catch(() => {});
    // Visitors see every issue and the first few fixes; a free account shows the rest.
    const checks = SIGNUP_GATE && !acc ? lockFixes(result.checks) : result.checks;
    return Response.json({ ...result, checks, social });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Audit failed.";
    return Response.json({ error: msg }, { status: e instanceof UnsafeUrlError ? 400 : 502 });
  }
}
