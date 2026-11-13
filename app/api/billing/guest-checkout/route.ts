import { BillingError, createGuestCheckout, guestReportOffer, returnOrigin } from "@/lib/billing";
import { PAYWALL_ENABLED } from "@/lib/config";
import { normalizeSiteUrl } from "@/lib/accounts";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { url } → { url } of a Stripe checkout for one full report, before signing in. */
export async function POST(req: Request) {
  if (!PAYWALL_ENABLED || !guestReportOffer()) return Response.json({ error: "One-off reports aren't on sale yet." }, { status: 503 });
  if (!rateLimit("guestcheckout:" + clientIp(req), 10)) return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { url?: unknown };
  const site = normalizeSiteUrl(String(b.url ?? ""));
  if (typeof site === "string") return Response.json({ error: site }, { status: 400 });
  try {
    return Response.json({ url: await createGuestCheckout(site.url, returnOrigin(req)) });
  } catch (e) {
    if (e instanceof BillingError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Guest checkout failed:", e);
    return Response.json({ error: "We couldn't open checkout. Try again in a minute." }, { status: 502 });
  }
}
