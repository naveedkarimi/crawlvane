import { requireAccount } from "@/lib/apiAuth";
import { AppStoreError, type Store } from "@/lib/appStore";
import { isStoreCountry } from "@/lib/countries";
import { MonitorError, addApp, listApps, removeApp, setCompetitors } from "@/lib/orgMonitoring";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fail = (e: unknown) => {
  if (e instanceof MonitorError || e instanceof AppStoreError) return Response.json({ error: e.message, upgrade: e.status === 402 }, { status: e.status });
  throw e;
};

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ apps: await listApps(a.org.id) });
}

/** POST { app, store, country } starts tracking an app. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't add apps." }, { status: 403 });
  if (!rateLimit("addapp:" + a.org.id, 20)) return Response.json({ error: "Too many changes. Try again in a bit." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { app?: string; store?: string; country?: string };
  const country = String(b.country ?? "us").toLowerCase();
  if (!isStoreCountry(country)) return Response.json({ error: "Choose a country from the list." }, { status: 400 });
  try {
    return Response.json(await addApp(a, String(b.app ?? ""), (b.store === "google" ? "google" : "apple") as Store, country));
  } catch (e) {
    return fail(e);
  }
}

/** PATCH { id, competitors: string[] } sets up to 3 competitors to watch. */
export async function PATCH(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change apps." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; competitors?: unknown };
  try {
    return Response.json({ competitors: await setCompetitors(a, String(b.id ?? ""), Array.isArray(b.competitors) ? b.competitors.map(String) : []) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't remove apps." }, { status: 403 });
  await removeApp(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
  return Response.json({ ok: true });
}
