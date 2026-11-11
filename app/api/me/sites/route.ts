import { addSite, listSites, MAX_SITES, removeSite, setClientName } from "@/lib/accounts";
import { limitsFor } from "@/lib/entitlements";
import { requireAccount } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ sites: await listSites(a.org.id) });
}

export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't add sites." }, { status: 403 });
  if (!rateLimit("addsite:" + a.org.id, 30)) return Response.json({ error: "Too many changes. Try again in a bit." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  const r = await addSite(a.org.id, String(body.url ?? ""), Math.min(MAX_SITES, limitsFor(a.org).sites));
  return typeof r === "string" ? Response.json({ error: r }, { status: 400 }) : Response.json(r);
}

/** PATCH { id, clientName } groups a site under a client (for agencies). */
export async function PATCH(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't edit sites." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; clientName?: string };
  await setClientName(a.org.id, String(b.id ?? ""), String(b.clientName ?? ""));
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't remove sites." }, { status: 403 });
  await removeSite(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
  return Response.json({ ok: true });
}
