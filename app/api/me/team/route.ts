import { requireAccount } from "@/lib/apiAuth";
import { returnOrigin } from "@/lib/billing";
import { limitsFor } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rateLimit";
import { TeamError, changeRole, inviteMember, isRole, listInvites, listMembers, removeMember, revokeInvite } from "@/lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (e: unknown) => {
  if (e instanceof TeamError) return Response.json({ error: e.message, upgrade: e.status === 402 }, { status: e.status });
  throw e;
};

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const [members, invites] = await Promise.all([listMembers(a), a.role === "owner" ? listInvites(a.org.id) : Promise.resolve([])]);
  return Response.json({ members, invites, seats: limitsFor(a.org).seats, role: a.role });
}

/** POST { email, role } invites someone. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!await rateLimit("invite:" + a.org.id, 20)) return Response.json({ error: "Too many invites. Try again later." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { email?: string; role?: string };
  try {
    return Response.json(await inviteMember(a, String(b.email ?? ""), (isRole(b.role) ? b.role : "editor"), returnOrigin(req)));
  } catch (e) {
    return fail(e);
  }
}

/** PATCH { userId, role } changes someone's role. */
export async function PATCH(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const b = (await req.json().catch(() => ({}))) as { userId?: string; role?: string };
  try {
    if (!isRole(b.role)) throw new TeamError("Unknown role.");
    await changeRole(a, String(b.userId ?? ""), b.role);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

/** DELETE ?userId= removes someone (or yourself, to leave); DELETE ?invite= withdraws an invite. */
export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const p = new URL(req.url).searchParams;
  try {
    if (p.get("invite")) await revokeInvite(a, p.get("invite") as string);
    else await removeMember(a, p.get("userId") ?? "");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
