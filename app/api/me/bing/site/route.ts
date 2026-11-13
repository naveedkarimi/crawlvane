import { requireAccount } from "@/lib/apiAuth";
import { BingError, bingSiteData, setBingSite } from "@/lib/bing";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (e: unknown) => {
  if (e instanceof BingError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
};

/** GET ?id=SITE → Bing clicks, impressions, top searches and top pages for the last 28 days. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!await rateLimit("bdata:" + a.org.id, 120)) return Response.json({ error: "Too many requests. Try again in a bit." }, { status: 429 });
  try {
    return Response.json({ data: await bingSiteData(a.org.id, new URL(req.url).searchParams.get("id") ?? "") });
  } catch (e) {
    return fail(e);
  }
}

/** POST { siteId, bingSite } links a saved site to its Bing Webmaster Tools site (null to unlink). */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change this." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; bingSite?: string | null };
  try {
    await setBingSite(a.org.id, String(b.siteId ?? ""), b.bingSite || null);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
