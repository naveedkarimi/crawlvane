import { requireAccount } from "@/lib/apiAuth";
import { GoogleError, setSiteProperties, siteSearchData } from "@/lib/google";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (e: unknown) => {
  if (e instanceof GoogleError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
};

/** GET ?id=SITE → clicks, impressions, top queries and AI referral sessions for the last 28 days. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!await rateLimit("gdata:" + a.org.id, 120)) return Response.json({ error: "Too many requests. Try again in a bit." }, { status: 429 });
  try {
    return Response.json(await siteSearchData(a.org.id, new URL(req.url).searchParams.get("id") ?? ""));
  } catch (e) {
    return fail(e);
  }
}

/** POST { siteId, gsc, ga4 } links a saved site to its Search Console and GA4 properties (null to unlink). */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change this." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; gsc?: string | null; ga4?: string | null };
  try {
    await setSiteProperties(a.org.id, String(b.siteId ?? ""), b.gsc || null, b.ga4 || null);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
