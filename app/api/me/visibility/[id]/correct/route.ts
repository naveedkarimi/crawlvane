import { requireAccount } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/store";
import { recountShareOfVoice, recountSummary } from "@/lib/promptGaps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { prompt, engine, notUs } on the latest run: notUs true marks a brand mention as wrong (a
 * different business with a similar name); false undoes it. Mention rates and share of voice are
 * recounted. Only mentions can be removed, never added.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change results." }, { status: 403 });
  if (!await rateLimit("viscorrect:" + a.org.id, 60)) return Response.json({ error: "Too many changes. Try again later." }, { status: 429 });
  const id = (await ctx.params).id;
  const b = (await req.json().catch(() => ({}))) as { prompt?: string; engine?: string; notUs?: boolean };
  const { data: t } = await db().from("visibility_trackers").select("id, brand, competitors").eq("org_id", a.org.id).eq("id", id).maybeSingle();
  if (!t) return Response.json({ error: "Tracker not found." }, { status: 404 });
  const { data: run } = await db().from("visibility_runs").select("id, rows").eq("tracker_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const rows = (run?.rows ?? []) as { prompt: string; engine: string; mentioned: boolean; corrected?: boolean; sentiment?: string | null }[];
  const row = rows.find((r) => r.prompt === b.prompt && r.engine === b.engine);
  if (!run || !row) return Response.json({ error: "That answer isn't in the latest run." }, { status: 404 });
  if (b.notUs) {
    if (!row.mentioned) return Response.json({ error: "That answer doesn't mention you." }, { status: 400 });
    row.mentioned = false;
    row.corrected = true;
  } else {
    if (!row.corrected) return Response.json({ error: "Nothing to undo." }, { status: 400 });
    row.mentioned = true;
    row.corrected = false;
  }
  const { error } = await db().from("visibility_runs").update({ rows, summary: recountSummary(rows), share_of_voice: recountShareOfVoice(rows, t.brand as string, (t.competitors ?? []) as { name: string }[]) }).eq("id", run.id);
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return Response.json({ ok: true, mentioned: row.mentioned });
}
