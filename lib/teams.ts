import { db, newId } from "./store";
import type { Account, Role } from "./accounts";
import type { SessionUser } from "./auth";
import { limitsFor } from "./entitlements";
import { mailConfigured, sendMail } from "./mail";
import { BRAND } from "./brand";

/** Teams: invites, roles and members. The owner manages the team; seats depend on the plan. */
export class TeamError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
function failed(what: string, e: { message: string }): never {
  throw new Error(`Database ${what} failed: ${e.message}`);
}
const ROLES: Role[] = ["owner", "editor", "viewer"];
export const isRole = (r: unknown): r is Role => ROLES.includes(r as Role);
const INVITE_DAYS = 14;

export interface Member { userId: string; email: string; role: Role; you: boolean }
export interface Invite { id: string; email: string; role: Role; createdAt: string }

export async function listMembers(a: Account): Promise<Member[]> {
  const { data, error } = await db().from("memberships").select("user_id, role, created_at").eq("org_id", a.org.id).order("created_at");
  if (error) failed("read", error);
  const out: Member[] = [];
  for (const m of data ?? []) {
    const u = await db().auth.admin.getUserById(m.user_id as string).catch(() => null);
    out.push({ userId: m.user_id as string, email: u?.data.user?.email ?? "(deleted user)", role: m.role as Role, you: m.user_id === a.user.id });
  }
  return out;
}

export async function listInvites(orgId: string): Promise<Invite[]> {
  const { data, error } = await db().from("invites").select("id, email, role, created_at").eq("org_id", orgId).is("accepted_at", null).order("created_at", { ascending: false });
  if (error) failed("read", error);
  return (data ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.created_at }));
}

const ownerOnly = (a: Account) => {
  if (a.role !== "owner") throw new TeamError("Only the team owner can manage the team.", 403);
};

/** Invites someone by email. Returns the invite link (also emailed when SMTP is set). */
export async function inviteMember(a: Account, email: string, role: Role, origin: string): Promise<{ link: string; emailed: boolean }> {
  ownerOnly(a);
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) || e.length > 254) throw new TeamError("Enter a valid email address.");
  if (!isRole(role) || role === "owner") throw new TeamError("Invite people as an editor or a viewer.");
  const [members, invites] = await Promise.all([listMembers(a), listInvites(a.org.id)]);
  if (members.some((m) => m.email.toLowerCase() === e)) throw new TeamError("That person is already on the team.");
  if (members.length + invites.length >= limitsFor(a.org).seats) throw new TeamError(`Your plan includes ${limitsFor(a.org).seats} seat${limitsFor(a.org).seats === 1 ? "" : "s"}. Upgrade to add more people.`, 402);
  const token = newId(32);
  const { error } = await db().from("invites").insert({ org_id: a.org.id, email: e, role, token, invited_by: a.user.id });
  if (error) failed("write", error);
  const link = `${origin}/invite/${token}`;
  let emailed = false;
  if (mailConfigured()) {
    const subject = `${a.user.email} invited you to ${a.org.name} on ${BRAND.name}`;
    await sendMail(e, subject, `<p>${subject}.</p><p><a href="${link}">Accept the invite</a> (link valid for ${INVITE_DAYS} days).</p>`, `${subject}.\n\nAccept: ${link}`).then(() => (emailed = true)).catch(() => {});
  }
  return { link, emailed };
}

export async function revokeInvite(a: Account, id: string): Promise<void> {
  ownerOnly(a);
  const { error } = await db().from("invites").delete().eq("org_id", a.org.id).eq("id", id);
  if (error) failed("delete", error);
}

/** Joins the invite's team. The invite must be for the signed-in email and not older than 14 days. */
export async function acceptInvite(user: SessionUser, token: string): Promise<{ orgId: string }> {
  if (!/^[a-zA-Z0-9_-]{20,64}$/.test(token)) throw new TeamError("This invite link isn't valid.", 404);
  const { data: inv, error } = await db().from("invites").select("id, org_id, email, role, created_at, accepted_at").eq("token", token).maybeSingle();
  if (error) failed("read", error);
  if (!inv || inv.accepted_at) throw new TeamError("This invite was already used or withdrawn.", 404);
  if (Date.now() - Date.parse(inv.created_at) > INVITE_DAYS * 86400000) throw new TeamError("This invite has expired. Ask for a new one.", 410);
  if (String(inv.email).toLowerCase() !== user.email.toLowerCase()) throw new TeamError(`This invite is for ${inv.email}. Sign in with that email to accept it.`, 403);
  const { error: e2 } = await db().from("memberships").upsert({ org_id: inv.org_id, user_id: user.id, role: inv.role }, { onConflict: "org_id,user_id" });
  if (e2) failed("write", e2);
  await db().from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
  return { orgId: inv.org_id as string };
}

async function ownerCount(orgId: string): Promise<number> {
  const { count, error } = await db().from("memberships").select("user_id", { count: "exact", head: true }).eq("org_id", orgId).eq("role", "owner");
  if (error) failed("read", error);
  return count ?? 0;
}

export async function changeRole(a: Account, userId: string, role: Role): Promise<void> {
  ownerOnly(a);
  if (!isRole(role)) throw new TeamError("Unknown role.");
  const { data: m } = await db().from("memberships").select("role").eq("org_id", a.org.id).eq("user_id", userId).maybeSingle();
  if (!m) throw new TeamError("That person isn't on the team.", 404);
  if (m.role === "owner" && role !== "owner" && (await ownerCount(a.org.id)) <= 1) throw new TeamError("A team needs at least one owner. Make someone else the owner first.");
  const { error } = await db().from("memberships").update({ role }).eq("org_id", a.org.id).eq("user_id", userId);
  if (error) failed("write", error);
}

/** Removes a member (owner only), or lets someone leave the team themselves. */
export async function removeMember(a: Account, userId: string): Promise<void> {
  if (userId !== a.user.id) ownerOnly(a);
  const { data: m } = await db().from("memberships").select("role").eq("org_id", a.org.id).eq("user_id", userId).maybeSingle();
  if (!m) return;
  if (m.role === "owner" && (await ownerCount(a.org.id)) <= 1) throw new TeamError("A team needs at least one owner. Make someone else the owner first.");
  const { error } = await db().from("memberships").delete().eq("org_id", a.org.id).eq("user_id", userId);
  if (error) failed("delete", error);
}

export async function listOrgs(userId: string): Promise<{ id: string; name: string; role: Role }[]> {
  const { data, error } = await db().from("memberships").select("role, organizations!inner(id, name)").eq("user_id", userId).order("created_at");
  if (error) failed("read", error);
  return (data ?? []).map((m) => { const o = m.organizations as unknown as { id: string; name: string }; return { id: o.id, name: o.name, role: m.role as Role }; });
}

export async function renameOrg(a: Account, name: string): Promise<void> {
  ownerOnly(a);
  const n = name.trim().slice(0, 60);
  if (!n) throw new TeamError("Enter a team name.");
  const { error } = await db().from("organizations").update({ name: n }).eq("id", a.org.id);
  if (error) failed("write", error);
}
