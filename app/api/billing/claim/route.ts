import { requireAccount } from "@/lib/apiAuth";
import { BillingError, claimGuestReport } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { session } adds a report bought before signing in to this team → { url } to run it on. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const b = (await req.json().catch(() => ({}))) as { session?: unknown };
  try {
    return Response.json(await claimGuestReport(a, String(b.session ?? "")));
  } catch (e) {
    if (e instanceof BillingError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Claim failed:", e);
    return Response.json({ error: "We couldn't add your report. Contact us with your receipt and we'll sort it out." }, { status: 502 });
  }
}
