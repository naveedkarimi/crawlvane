import { requireAccount } from "@/lib/apiAuth";
import { BillingError, addonLabels, addonsOffered, setAddons } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → whether add-ons are offered, their labels and what the team has now. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ offered: addonsOffered(), labels: addonLabels(), seats: a.org.extra_seats ?? 0, sitePacks: a.org.extra_site_packs ?? 0, plan: a.org.plan });
}

/** POST { seats, sitePacks } sets the Agency add-ons on the subscription. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const b = (await req.json().catch(() => ({}))) as { seats?: unknown; sitePacks?: unknown };
  try {
    const r = await setAddons(a, { seats: Number(b.seats), sitePacks: Number(b.sitePacks) });
    return Response.json({ seats: r.extra_seats, sitePacks: r.extra_site_packs });
  } catch (e) {
    if (e instanceof BillingError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Add-ons failed:", e);
    return Response.json({ error: "We couldn't change add-ons. Try again in a minute." }, { status: 502 });
  }
}
