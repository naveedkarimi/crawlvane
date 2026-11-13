import { requireAccount } from "@/lib/apiAuth";
import { db } from "@/lib/store";
import { connection, disconnect, googleConfigured, listProperties, GoogleError } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → whether Google is set up and connected; ?properties=1 also lists Search Console and GA4 properties. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!googleConfigured()) return Response.json({ configured: false, connected: false });
  const c = await connection(a.org.id).catch(() => null);
  if (!c || !new URL(req.url).searchParams.get("properties")) return Response.json({ configured: true, connected: !!c, email: c?.email ?? null });
  try {
    const [properties, { data: links }] = await Promise.all([listProperties(a.org.id), db().from("sites").select("id, gsc_property, ga4_property").eq("org_id", a.org.id)]);
    return Response.json({ configured: true, connected: true, email: c.email, properties, links: links ?? [] });
  } catch (e) {
    if (e instanceof GoogleError) return Response.json({ configured: true, connected: true, email: c.email, error: e.message });
    throw e;
  }
}

/** DELETE disconnects Google for the team and revokes access at Google. Owners only. */
export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only the team owner can disconnect Google." }, { status: 403 });
  await disconnect(a.org.id);
  return Response.json({ connected: false });
}
