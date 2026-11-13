import { requireAccount } from "@/lib/apiAuth";
import { BingError, bingLinkCounts, bingUrlLinks } from "@/lib/bing";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?site=ID → the site's most-linked pages (from Bing Webmaster Tools);
 * &url=PAGE → the pages linking to it, with anchor text. Read live, not stored.
 */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!await rateLimit("backlinks:" + a.org.id, 120)) return Response.json({ error: "Too many requests. Try again in a bit." }, { status: 429 });
  const p = new URL(req.url).searchParams;
  const site = p.get("site") ?? "", url = p.get("url"), page = Number(p.get("page")) || 0;
  try {
    if (url) return Response.json({ detail: await bingUrlLinks(a.org.id, site, url, page) });
    return Response.json({ counts: await bingLinkCounts(a.org.id, site, page) });
  } catch (e) {
    if (e instanceof BingError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
