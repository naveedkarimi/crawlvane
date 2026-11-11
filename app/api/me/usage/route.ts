import { listSites } from "@/lib/accounts";
import { requireAccount } from "@/lib/apiAuth";
import { usageSummary } from "@/lib/entitlements";
import { billingOptions } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const sites = await listSites(a.org.id);
  return Response.json({ ...(await usageSummary(a.org, sites.length)), billing: billingOptions() });
}
