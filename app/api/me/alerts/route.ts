import { requireAccount } from "@/lib/apiAuth";
import { listAlerts, markAlertsRead } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ alerts: await listAlerts(a.org.id) });
}

/** POST marks every alert as read. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  await markAlertsRead(a.org.id);
  return Response.json({ ok: true });
}
