import { requireAccount } from "@/lib/apiAuth";
import { AppStoreError } from "@/lib/appStore";
import { MonitorError, checkApp } from "@/lib/orgMonitoring";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!await rateLimit("appcheck-org:" + a.org.id, 30)) return Response.json({ error: "Too many checks. Try again in a bit." }, { status: 429 });
  try {
    return Response.json(await checkApp(a.org.id, (await ctx.params).id));
  } catch (e) {
    if (e instanceof MonitorError || e instanceof AppStoreError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
