import { adviseListing, analyzeReviews } from "@/lib/appPremium";
import { AppStoreError, fetchReviews, lookupApp, parseAppInput, scoreListing, type Store } from "@/lib/appStore";
import { featureEnabled } from "@/lib/config";
import { isStoreCountry } from "@/lib/countries";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** POST /api/app-check/premium { action: "advice" | "reviews" | "compare", app, store, country, competitors? } */
export async function POST(req: Request) {
  if (!featureEnabled("appPremium", req)) return Response.json({ error: "This is a premium feature and it's coming soon." }, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const store: Store = body.store === "google" ? "google" : "apple";
  const country = String(body.country ?? "us").toLowerCase();
  if (!isStoreCountry(country)) return Response.json({ error: "Choose a country from the list." }, { status: 400 });
  const ref = parseAppInput(String(body.app ?? ""), store);
  if (typeof ref === "string") return Response.json({ error: ref }, { status: 400 });
  if (!rateLimit("apppremium:" + clientIp(req), 10)) return Response.json({ error: "Too many requests. Try again in a bit." }, { status: 429 });
  try {
    const listing = await lookupApp(ref, country);
    if (body.action === "advice") return Response.json(await adviseListing(listing));
    if (body.action === "reviews") return Response.json(await analyzeReviews(listing, await fetchReviews(listing)));
    if (body.action === "compare") {
      const inputs = (Array.isArray(body.competitors) ? body.competitors : []).map(String).filter((s) => s.trim()).slice(0, 3);
      if (!inputs.length) return Response.json({ error: "Add at least one competitor." }, { status: 400 });
      const rows = await Promise.all(
        [listing, ...inputs].map(async (x) => {
          try {
            const l = typeof x === "string" ? await (async () => {
              const r = parseAppInput(x, store);
              if (typeof r === "string") throw new AppStoreError(r);
              return lookupApp(r, country);
            })() : x;
            const { score, checks } = scoreListing(l);
            return { ok: true as const, title: l.title, store: l.store, icon: l.icon, url: l.url, score, rating: l.rating, ratingCount: l.ratingCount, screenshots: l.screenshots, lastUpdated: l.lastUpdated, checks: Object.fromEntries(checks.map((c) => [c.id, c.status])) };
          } catch (e) {
            return { ok: false as const, input: typeof x === "string" ? x : x.title, error: e instanceof Error ? e.message : "Couldn't check this app." };
          }
        }),
      );
      return Response.json({ rows });
    }
    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    if (e instanceof AppStoreError) return Response.json({ error: e.message }, { status: e.status });
    console.error("App premium failed:", e);
    return Response.json({ error: e instanceof Error && /ANTHROPIC_API_KEY/.test(e.message) ? "AI features need an ANTHROPIC_API_KEY." : "That didn't work. Try again in a minute." }, { status: 502 });
  }
}
