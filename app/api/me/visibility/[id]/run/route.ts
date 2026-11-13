import { requireAccount } from "@/lib/apiAuth";
import { MonitorError } from "@/lib/orgMonitoring";
import { rateLimit } from "@/lib/rateLimit";
import { runTrackerNow } from "@/lib/visibilityTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't run checks." }, { status: 403 });
  if (!await rateLimit("visrun:" + a.org.id, 6)) return Response.json({ error: "Too many runs. Try again later." }, { status: 429 });
  try {
    return Response.json(await runTrackerNow(a, (await ctx.params).id));
  } catch (e) {
    if (e instanceof MonitorError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
