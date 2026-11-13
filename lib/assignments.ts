import { db } from "./store";
import type { Account } from "./accounts";

/** Who on the team is fixing which issue on a saved site, how far it has got, and a short note. */
export type FixStatus = "open" | "doing" | "done";
export const FIX_STATUSES: FixStatus[] = ["open", "doing", "done"];
export interface Assignment { siteId: string; checkId: string; assignee: string | null; status: FixStatus; note: string | null }

export class AssignmentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function listAssignments(orgId: string): Promise<Assignment[]> {
  const { data, error } = await db().from("issue_assignments").select("*, sites!inner(org_id)").eq("sites.org_id", orgId);
  if (error) throw new Error(`Database read failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    siteId: r.site_id as string,
    checkId: r.check_id as string,
    assignee: (r.assignee as string | null) ?? null,
    status: FIX_STATUSES.includes(r.status) ? (r.status as FixStatus) : "open",
    note: (r.note as string | null) ?? null,
  }));
}

/**
 * Updates an issue's owner, status or note (only the fields given). Owners and editors only.
 * A row with no owner, "open" and no note is removed, so the table only holds real information.
 */
export async function setAssignment(a: Account, siteId: string, checkId: string, change: { assignee?: string | null; status?: string; note?: string | null }): Promise<void> {
  if (a.role === "viewer") throw new AssignmentError("Viewers can't change fixes.", 403);
  if (!/^[a-z0-9_.:-]{1,80}$/i.test(checkId)) throw new AssignmentError("Unknown issue.");
  const { data: site, error } = await db().from("sites").select("id").eq("org_id", a.org.id).eq("id", siteId).maybeSingle();
  if (error) throw new Error(`Database read failed: ${error.message}`);
  if (!site) throw new AssignmentError("Site not found.", 404);
  if (change.status !== undefined && !FIX_STATUSES.includes(change.status as FixStatus)) throw new AssignmentError("Unknown status.");
  if (change.assignee) {
    const { data: m } = await db().from("memberships").select("user_id").eq("org_id", a.org.id).eq("user_id", change.assignee).maybeSingle();
    if (!m) throw new AssignmentError("That person isn't on this team.");
  }
  const { data: now } = await db().from("issue_assignments").select("*").eq("site_id", siteId).eq("check_id", checkId).maybeSingle();
  const next = {
    assignee: change.assignee !== undefined ? change.assignee || null : ((now?.assignee as string | null) ?? null),
    status: (change.status as FixStatus | undefined) ?? ((now?.status as FixStatus | undefined) ?? "open"),
    note: change.note !== undefined ? (change.note?.trim().slice(0, 500) || null) : ((now?.note as string | null) ?? null),
  };
  if (!next.assignee && next.status === "open" && !next.note) {
    const { error: e } = await db().from("issue_assignments").delete().eq("site_id", siteId).eq("check_id", checkId);
    if (e) throw new Error(`Database write failed: ${e.message}`);
    return;
  }
  const { error: e2 } = await db().from("issue_assignments").upsert({ site_id: siteId, check_id: checkId, ...next, assigned_by: a.user.id });
  if (e2) throw new Error(`Database write failed: ${e2.message}`);
}
