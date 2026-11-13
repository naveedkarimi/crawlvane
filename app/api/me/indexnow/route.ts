import { requireAccount } from "@/lib/apiAuth";
import { IndexNowError, indexNowStatus, setUpIndexNow, submitSite, verifyIndexNow } from "@/lib/indexNow";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (e: unknown) => {
  if (e instanceof IndexNowError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
};

/** GET ?id=SITE → the site's IndexNow key, where its file goes, and when it was last checked and sent. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  try {
    return Response.json(await indexNowStatus(a.org.id, new URL(req.url).searchParams.get("id") ?? ""));
  } catch (e) {
    return fail(e);
  }
}

/**
 * POST { siteId, action }:
 *  - "setup": make the key.  - "verify": check the key file is online.
 *  - "submit" (+ optional urls): send pages to IndexNow; without urls, the latest report's pages.
 */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change this." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; action?: string; urls?: unknown };
  const siteId = String(b.siteId ?? "");
  try {
    if (b.action === "setup") return Response.json(await setUpIndexNow(a.org.id, siteId));
    if (b.action === "verify") {
      if (!await rateLimit("inow-verify:" + a.org.id, 60)) return Response.json({ error: "Too many checks. Try again in a bit." }, { status: 429 });
      return Response.json({ verified: await verifyIndexNow(a.org.id, siteId) });
    }
    if (b.action === "submit") {
      if (!await rateLimit("inow-submit:" + a.org.id, 20)) return Response.json({ error: "You've sent a lot today. Try again in an hour." }, { status: 429 });
      const urls = Array.isArray(b.urls) ? b.urls.filter((u): u is string => typeof u === "string").slice(0, 2000) : undefined;
      return Response.json(await submitSite(a.org.id, siteId, urls));
    }
    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return fail(e);
  }
}
