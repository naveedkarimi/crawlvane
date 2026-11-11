import { BillingError, handleEvent, liveDeps, verifyWebhook } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe → POST /api/billing/webhook. Signed by Stripe; the only place a plan changes. */
export async function POST(req: Request) {
  const body = await req.text();
  let event;
  try {
    event = verifyWebhook(body, req.headers.get("stripe-signature"));
  } catch (e) {
    const status = e instanceof BillingError ? e.status : 400;
    return Response.json({ error: e instanceof Error ? e.message : "Bad signature." }, { status });
  }
  try {
    const result = await handleEvent(event, liveDeps);
    return Response.json({ received: true, result });
  } catch (e) {
    console.error("Stripe webhook failed:", event.type, e);
    return Response.json({ error: "Handling failed; Stripe will retry." }, { status: 500 });
  }
}
