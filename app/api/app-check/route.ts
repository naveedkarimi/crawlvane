import { recordAppCheck } from "@/lib/appChecks";
import { AppStoreError, lookupApp, parseAppInput, scoreListing, type Store } from "@/lib/appStore";
import { featureEnabled } from "@/lib/config";
import { isStoreCountry } from "@/lib/countries";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/app-check?app=<link, id or name>&store=apple|google&country=us */
export async function GET(req: Request) {
  if (!featureEnabled("appCheck", req)) return Response.json({ error: "The app checker isn't available right now." }, { status: 404 });
  const p = new URL(req.url).searchParams;
  const store: Store = p.get("store") === "google" ? "google" : "apple";
  const country = (p.get("country") ?? "us").toLowerCase();
  if (!isStoreCountry(country)) return Response.json({ error: "Choose a country from the list." }, { status: 400 });
  const ref = parseAppInput(p.get("app") ?? "", store);
  if (typeof ref === "string") return Response.json({ error: ref }, { status: 400 });
  if (!await rateLimit("appcheck:" + clientIp(req), Number(process.env.APP_CHECKS_PER_HOUR ?? 20)))
    return Response.json({ error: "Too many app checks from your network. Try again in a bit." }, { status: 429 });
  try {
    const listing = await lookupApp(ref, country);
    const { score, checks } = scoreListing(listing);
    recordAppCheck({ store: listing.store, appId: listing.id, country, title: listing.title, score, failed: checks.filter((c) => c.status === "fail").map((c) => c.id) });
    return Response.json({ listing, score, checks });
  } catch (e) {
    if (e instanceof AppStoreError) return Response.json({ error: e.message }, { status: e.status });
    console.error("App check failed:", e);
    return Response.json({ error: "The check failed. Try again in a minute." }, { status: 502 });
  }
}
