import { extrasFromAudit, getSite, recordScore } from "@/lib/accounts";
import { requireAccount } from "@/lib/apiAuth";
import { runAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { recordSiteCheck } from "@/lib/siteChecks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Run a page check on a saved site's home page and add the score to its history. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const site = await getSite(a.org.id, (await ctx.params).id);
  if (!site) return Response.json({ error: "Site not found." }, { status: 404 });
  if (!await rateLimit("sitecheck:" + a.org.id, 30)) return Response.json({ error: "Too many checks. Try again in a bit." }, { status: 429 });
  try {
    const r = await runAudit(site.url);
    await recordScore(site.id, r.scores, "page-check", extrasFromAudit(r));
    recordSiteCheck({ url: r.url, tool: "dashboard", scores: r.scores, checks: r.checks });
    return Response.json({ scores: r.scores });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "The check failed." }, { status: 502 });
  }
}
