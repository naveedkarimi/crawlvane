import { recordSiteCheck } from "@/lib/siteChecks";
import { runAudit } from "@/lib/audit";
import { validEmail } from "@/lib/leads";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { UnsafeUrlError } from "@/lib/safeFetch";
import { countAudit } from "@/lib/stats";
import { getWidget, saveWidgetLead, widgetSummary } from "@/lib/widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Visitor submits URL + email in an agency widget: run the audit, store and forward the lead. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = /^[\w-]{6,64}$/.test(id) ? await getWidget(id) : null;
  if (!w) return Response.json({ error: "This widget doesn't exist." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.website === "string" && body.website) return Response.json({ error: "Rejected." }, { status: 400 });
  const email = String(body.email ?? "").trim().toLowerCase();
  const url = String(body.url ?? "").trim();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) || undefined : undefined;
  if (!url || url.length > 2048) return Response.json({ error: "Please enter your website." }, { status: 400 });
  if (!validEmail(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!rateLimit("widget:" + clientIp(req), Number(process.env.WIDGET_PER_HOUR ?? 10)))
    return Response.json({ error: "Too many checks from your network. Try again later." }, { status: 429 });
  try {
    const r = await runAudit(url);
    const summary = widgetSummary(r);
    await saveWidgetLead(w, { email, name, url: summary.url, score: r.scores.overall }, summary);
    countAudit().catch(() => {});
    recordSiteCheck({ url: r.url, tool: "widget", scores: r.scores, checks: r.checks });
    return Response.json(summary);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "The check failed." }, { status: e instanceof UnsafeUrlError ? 400 : 502 });
  }
}
