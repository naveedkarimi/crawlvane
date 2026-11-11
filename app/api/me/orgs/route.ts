import { cookies } from "next/headers";
import { ORG_COOKIE, requireAccount } from "@/lib/apiAuth";
import { listOrgs, renameOrg, TeamError } from "@/lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ current: a.org.id, orgs: await listOrgs(a.user.id) });
}

/** POST { orgId } switches the team the dashboard shows. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const { orgId } = (await req.json().catch(() => ({}))) as { orgId?: string };
  const orgs = await listOrgs(a.user.id);
  if (!orgs.some((o) => o.id === orgId)) return Response.json({ error: "You're not on that team." }, { status: 403 });
  (await cookies()).set(ORG_COOKIE, String(orgId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return Response.json({ ok: true });
}

/** PATCH { name } renames the current team. */
export async function PATCH(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  try {
    await renameOrg(a, String(name ?? ""));
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof TeamError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
