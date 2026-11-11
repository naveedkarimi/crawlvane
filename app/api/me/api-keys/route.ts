import { requireAccount } from "@/lib/apiAuth";
import { createApiKey, listOrgApiKeys, revokeOrgApiKey } from "@/lib/apiKeys";
import { limitsFor } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The team's keys for the public API. Never returns the keys themselves, only their first characters. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ keys: await listOrgApiKeys(a.org.id), limit: limitsFor(a.org).apiKeys, canManage: a.role === "owner" });
}

/** POST { name } creates a key. The full key is in this response only. Owners only. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only team owners can create API keys." }, { status: 403 });
  const limit = limitsFor(a.org).apiKeys;
  if (limit < 1) return Response.json({ error: "Your plan doesn't include the API.", upgrade: true }, { status: 402 });
  if ((await listOrgApiKeys(a.org.id)).length >= limit) return Response.json({ error: `Your plan includes ${limit} API key${limit === 1 ? "" : "s"}. Revoke one first.`, upgrade: true }, { status: 402 });
  const b = (await req.json().catch(() => ({}))) as { name?: string };
  const name = String(b.name ?? "").trim().slice(0, 80) || "API key";
  const { key, record } = await createApiKey(name, 100, a.org.id);
  return Response.json({ key, record });
}

export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only team owners can revoke API keys." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!(await revokeOrgApiKey(a.org.id, id))) return Response.json({ error: "That key wasn't found." }, { status: 404 });
  return Response.json({ ok: true });
}
