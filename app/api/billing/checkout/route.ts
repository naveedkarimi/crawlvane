import { requireAccount } from "@/lib/apiAuth";
import { BillingError, ITEMS, createCheckout, returnOrigin, type Item } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { item: "pro" | "agency" | "report" | "credits" } → { url } of a Stripe checkout page. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const body = (await req.json().catch(() => ({}))) as { item?: string };
  if (!ITEMS.includes(body.item as Item)) return Response.json({ error: "Choose a plan or pack." }, { status: 400 });
  try {
    return Response.json({ url: await createCheckout(a, body.item as Item, returnOrigin(req)) });
  } catch (e) {
    if (e instanceof BillingError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Checkout failed:", e);
    return Response.json({ error: "We couldn't open checkout. Try again in a minute." }, { status: 502 });
  }
}
