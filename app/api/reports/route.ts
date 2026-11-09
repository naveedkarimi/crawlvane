import { LIMITS, featureEnabled, isAdmin, planAllows } from "@/lib/config";
import { createReport } from "@/lib/report";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl } from "@/lib/safeFetch";
import type { ReportOptions } from "@/lib/reportTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, n = 300) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  if (!featureEnabled("siteCrawl", req) || !planAllows("siteCrawl", req))
    return Response.json({ error: "Full reports aren't available yet." }, { status: 404 });
  if (!isAdmin(req) && !rateLimit("report:" + clientIp(req), LIMITS.reportsPerHour))
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
  if (featureEnabled("competitors", req) && Array.isArray(body.competitors)) {
    for (const c of body.competitors.map((x) => str(x, 2048)).filter(Boolean).slice(0, LIMITS.maxCompetitors)) {
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
    maxPages: Math.min(Math.max(1, Number(body.maxPages) || LIMITS.maxPagesDefault), LIMITS.maxPagesHard),
    competitors,
    aiPlan: featureEnabled("aiPlan", req) && body.aiPlan !== false,
    aiVisibility: featureEnabled("aiVisibility", req) && want("aiVisibility"),
    visibilityPrompts: Array.isArray(body.visibilityPrompts)
      ? body.visibilityPrompts.map((p) => str(p, 200)).filter(Boolean).slice(0, 20)
      : [],
    deepResearch: featureEnabled("deepResearch", req) && want("deepResearch"),
    render: featureEnabled("jsRender", req) && want("render"),
    socialPosts: featureEnabled("socialPosts", req) && want("socialPosts"),
  };
  if (featureEnabled("whiteLabel", req) && body.whiteLabel && typeof body.whiteLabel === "object") {
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

  const report = await createReport(url, options);
  return Response.json({ id: report.id });
}
