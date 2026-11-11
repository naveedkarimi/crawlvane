import { requireAccount } from "@/lib/apiAuth";
import { PaywallError } from "@/lib/entitlements";
import { MonitorError } from "@/lib/orgMonitoring";
import { createTracker, listTrackers, removeTracker } from "@/lib/visibilityTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ trackers: await listTrackers(a.org.id) });
}

/** POST { siteId, prompts?: string[], competitors?: string[] } starts weekly AI visibility tracking. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't add trackers." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; prompts?: unknown; competitors?: unknown };
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  try {
    return Response.json(await createTracker(a, String(b.siteId ?? ""), list(b.prompts), list(b.competitors)));
  } catch (e) {
    if (e instanceof MonitorError || e instanceof PaywallError) return Response.json({ error: e.message, upgrade: e.status === 402 }, { status: e.status });
    throw e;
  }
}

export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't remove trackers." }, { status: 403 });
  await removeTracker(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
  return Response.json({ ok: true });
}
