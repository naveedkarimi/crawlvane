import { requireAccount } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/store";
import { gapBrief } from "@/lib/ai/helpers";
import { CREDIT_COST, PaywallError, spendCredits } from "@/lib/entitlements";
import { promptGaps } from "@/lib/visibilityTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST { prompt } → a content brief for one question where competitors are mentioned and the brand isn't. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Briefs need the AI to be set up." }, { status: 503 });
  if (!await rateLimit("gapbrief:" + a.org.id, 20)) return Response.json({ error: "Too many briefs. Try again later." }, { status: 429 });
  const id = (await ctx.params).id;
  const { prompt } = (await req.json().catch(() => ({}))) as { prompt?: string };
  const { data: t } = await db().from("visibility_trackers").select("id, brand, sites!inner(domain)").eq("org_id", a.org.id).eq("id", id).maybeSingle();
  if (!t) return Response.json({ error: "Tracker not found." }, { status: 404 });
  const { data: run } = await db().from("visibility_runs").select("rows").eq("tracker_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  // Only questions from the latest run that really are gaps, so the brief matches what the team sees.
  const gap = promptGaps(run?.rows ?? []).find((g) => g.prompt === prompt);
  if (!gap) return Response.json({ error: "That question isn't a gap in the latest run." }, { status: 400 });
  try {
    await spendCredits(a, CREDIT_COST.gapBrief, "AI visibility gap brief");
  } catch (e) {
    if (e instanceof PaywallError) return Response.json({ error: e.message, upgrade: true }, { status: e.status });
    throw e;
  }
  try {
    const domain = (t.sites as unknown as { domain: string }).domain;
    return Response.json(await gapBrief({ brand: t.brand as string, domain, prompt: gap.prompt, competitors: gap.competitors }));
  } catch (e) {
    console.error("gap brief", e);
    return Response.json({ error: "The AI didn't answer properly. Try again." }, { status: 502 });
  }
}
