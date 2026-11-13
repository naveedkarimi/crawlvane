import { requireAccount } from "@/lib/apiAuth";
import { AssignmentError, listAssignments, setAssignment } from "@/lib/assignments";
import { listMembers } from "@/lib/teams";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → who is fixing what, and the team members who can be assigned. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const [assignments, members] = await Promise.all([listAssignments(a.org.id).catch(() => []), listMembers(a)]);
  return Response.json({ assignments, members: members.map((m) => ({ userId: m.userId, email: m.email })), canEdit: a.role !== "viewer" });
}

/** POST { siteId, checkId, assignee?, status?, note? } updates an issue's owner, status ("open" | "doing" | "done") or note. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!await rateLimit("assign:" + a.org.id, 120)) return Response.json({ error: "Too many changes. Try again in a bit." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: unknown; checkId?: unknown; assignee?: unknown; status?: unknown; note?: unknown };
  try {
    await setAssignment(a, String(b.siteId ?? ""), String(b.checkId ?? ""), {
      ...("assignee" in b ? { assignee: typeof b.assignee === "string" && b.assignee ? b.assignee : null } : {}),
      ...(typeof b.status === "string" ? { status: b.status } : {}),
      ...("note" in b ? { note: typeof b.note === "string" ? b.note : null } : {}),
    });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AssignmentError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
