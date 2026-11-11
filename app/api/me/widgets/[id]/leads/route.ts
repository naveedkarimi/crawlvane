import { requireAccount } from "@/lib/apiAuth";
import { getOrgWidget, listLeadsFor } from "@/lib/widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Leads one of the team's widgets collected. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const { id } = await params;
  if (!(await getOrgWidget(a.org.id, id))) return Response.json({ error: "That widget wasn't found." }, { status: 404 });
  return Response.json({ leads: await listLeadsFor(id) });
}
