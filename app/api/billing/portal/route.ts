import { requireAccount } from "@/lib/apiAuth";
import { BillingError, createPortal, returnOrigin } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST → { url } of Stripe's customer portal: invoices, card, plan changes and cancelling. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  try {
    return Response.json({ url: await createPortal(a, returnOrigin(req)) });
  } catch (e) {
    if (e instanceof BillingError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Billing portal failed:", e);
    return Response.json({ error: "We couldn't open billing. Try again in a minute." }, { status: 502 });
  }
}
