import { requireAccount } from "@/lib/apiAuth";
import { BotHitsError, botSnippets, botSummary, botToken } from "@/lib/botHits";
import { APP_URL } from "@/lib/hosts";
import { SITE_URL } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = (req: Request) => `${process.env.NODE_ENV === "development" ? new URL(req.url).origin : APP_URL || SITE_URL}/api/bot-hits`;
const fail = (e: unknown) => {
  if (e instanceof BotHitsError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
};

/** GET ?id=SITE → AI bot visits over the last 30 days, and the snippets once tracking is set up. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  try {
    const s = await botSummary(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
    const canSee = a.role !== "viewer";
    return Response.json({ ...s, token: undefined, set: !!s.token, snippets: s.token && canSee ? botSnippets(endpoint(req), s.token) : null });
  } catch (e) {
    return fail(e);
  }
}

/** POST { siteId, rotate? } sets up tracking (or makes a new token, so the old snippet stops counting). */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change this." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; rotate?: boolean };
  try {
    const token = await botToken(a.org.id, String(b.siteId ?? ""), !!b.rotate);
    return Response.json({ snippets: botSnippets(endpoint(req), token) });
  } catch (e) {
    return fail(e);
  }
}
