import { listReports } from "@/lib/accounts";
import { requireAccount } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ reports: await listReports(a.org.id) });
}
