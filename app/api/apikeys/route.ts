import { isAdmin } from "@/lib/config";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/apiKeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: list keys (without the secret). */
export async function GET(req: Request) {
  if (!isAdmin(req)) return new Response("Forbidden", { status: 403 });
  return Response.json({ keys: await listApiKeys() });
}

/** Admin: create a key. Body: { name, perHour? }. The key is returned once. */
export async function POST(req: Request) {
  if (!isAdmin(req)) return new Response("Forbidden", { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return Response.json({ error: "Give the key a name (who it's for)." }, { status: 400 });
  const perHour = Math.min(5000, Math.max(1, Number(b.perHour) || 100));
  return Response.json(await createApiKey(name, perHour));
}

/** Admin: revoke a key. DELETE /api/apikeys?id=... */
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return new Response("Forbidden", { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[a-f0-9]{32}$/.test(id)) return Response.json({ error: "Bad id." }, { status: 400 });
  await revokeApiKey(id);
  return Response.json({ ok: true });
}
