import { requireAccount } from "@/lib/apiAuth";
import { db } from "@/lib/store";
import { BingError, bingConfigured, bingConnected, connectBing, disconnectBing, listBingSites } from "@/lib/bing";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → whether Bing is set up and connected, the Bing sites the key can see, and each saved site's link. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!bingConfigured()) return Response.json({ configured: false, connected: false });
  const connected = await bingConnected(a.org.id).catch(() => false);
  if (!connected) return Response.json({ configured: true, connected: false });
  const { data: links } = await db().from("sites").select("id, bing_site").eq("org_id", a.org.id);
  try {
    return Response.json({ configured: true, connected: true, sites: await listBingSites(a.org.id), links: links ?? [] });
  } catch (e) {
    if (e instanceof BingError) return Response.json({ configured: true, connected: true, sites: [], links: links ?? [], error: e.message });
    throw e;
  }
}

/** POST { apiKey } connects Bing for the team, after checking the key with Bing. Owners only. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only the team owner can connect Bing." }, { status: 403 });
  if (!await rateLimit("bing-connect:" + a.org.id, 10)) return Response.json({ error: "Too many tries. Try again in an hour." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { apiKey?: string };
  try {
    const sites = await connectBing(a.org.id, String(b.apiKey ?? ""));
    return Response.json({ connected: true, sites });
  } catch (e) {
    if (e instanceof BingError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

/** DELETE removes the stored key and every site link. Owners only. */
export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only the team owner can disconnect Bing." }, { status: 403 });
  await disconnectBing(a.org.id);
  return Response.json({ connected: false });
}
