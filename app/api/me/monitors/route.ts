import { requireAccount } from "@/lib/apiAuth";
import { MonitorError, listSiteMonitors, removeSiteMonitor, setSiteMonitor } from "@/lib/orgMonitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ monitors: await listSiteMonitors(a.org.id) });
}

/** POST { siteId, everyDays?, email? } turns weekly monitoring on for a saved site. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change monitoring." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; everyDays?: number; email?: string };
  try {
    await setSiteMonitor(a, String(b.siteId ?? ""), Number(b.everyDays ?? 7), String(b.email ?? a.user.email).slice(0, 254));
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof MonitorError) return Response.json({ error: e.message, upgrade: e.status === 402 }, { status: e.status });
    throw e;
  }
}

export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change monitoring." }, { status: 403 });
  await removeSiteMonitor(a.org.id, new URL(req.url).searchParams.get("siteId") ?? "");
  return Response.json({ ok: true });
}
