import { requireAccount } from "@/lib/apiAuth";
import { GoogleError } from "@/lib/google";
import { rateLimit } from "@/lib/rateLimit";
import { RankError, addKeywords, listKeywords, refreshSite, removeKeyword, suggestKeywords } from "@/lib/rankTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (e: unknown) => {
  if (e instanceof RankError || e instanceof GoogleError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
};

/** GET ?site=ID → tracked keywords with their weekly positions; &suggest=1 → ideas from Search Console. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const p = new URL(req.url).searchParams;
  const site = p.get("site") ?? "";
  try {
    if (p.get("suggest")) {
      if (!await rateLimit("kwsuggest:" + a.org.id, 60)) return Response.json({ error: "Too many requests. Try again in a bit." }, { status: 429 });
      return Response.json({ suggestions: await suggestKeywords(a.org.id, site) });
    }
    return Response.json(await listKeywords(a.org.id, site));
  } catch (e) {
    return fail(e);
  }
}

/** POST { siteId, keywords: string[] } adds keywords; { siteId, refresh: true } checks positions now. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change this." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; keywords?: unknown; refresh?: boolean };
  const siteId = String(b.siteId ?? "");
  try {
    if (b.refresh) {
      if (!await rateLimit("kwrefresh:" + a.org.id, 20)) return Response.json({ error: "You've checked a lot this hour. Try again later." }, { status: 429 });
      return Response.json({ checked: await refreshSite(a.org.id, siteId) });
    }
    const added = await addKeywords(a.org.id, siteId, Array.isArray(b.keywords) ? b.keywords.slice(0, 100) : []);
    // Fill in this week's positions straight away when Search Console is linked; ignore failures.
    await refreshSite(a.org.id, siteId).catch(() => 0);
    return Response.json({ added });
  } catch (e) {
    return fail(e);
  }
}

/** DELETE ?id= stops tracking a keyword (its history goes too). */
export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change this." }, { status: 403 });
  await removeKeyword(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
  return Response.json({ ok: true });
}
