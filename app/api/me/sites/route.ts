import { addSite, listSites, MAX_SITES, removeSite, setClientName } from "@/lib/accounts";
import { limitsFor } from "@/lib/entitlements";
import { PAYWALL_ENABLED } from "@/lib/config";
import { limitEmail } from "@/lib/lifecycle";
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
  if (!await rateLimit("addsite:" + a.org.id, 30)) return Response.json({ error: "Too many changes. Try again in a bit." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  // With the paywall on, the plan (plus any site packs) sets the limit; before that, the launch cap.
  const r = await addSite(a.org.id, String(body.url ?? ""), PAYWALL_ENABLED ? limitsFor(a.org).sites : MAX_SITES, PAYWALL_ENABLED);
  if (typeof r === "string" && r.startsWith("Your plan includes")) void limitEmail(a.org.id, "limit_sites").catch(() => {});
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
