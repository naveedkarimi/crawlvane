import { requireAccount } from "@/lib/apiAuth";
import { db } from "@/lib/store";
import { rateLimit } from "@/lib/rateLimit";
import { CREDIT_COST, PaywallError, spendCredits } from "@/lib/entitlements";
import { WriterError, cleanInput, deleteArticle, getArticle, listArticles, saveArticle, writeArticle } from "@/lib/ai/writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 200;

const brandOf = (domain: string) => {
  const b = domain.replace(/^www\./, "").split(".")[0] ?? domain;
  return b.charAt(0).toUpperCase() + b.slice(1);
};

/** GET → the team's saved drafts; ?id= → one draft. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const article = await getArticle(a.org.id, id);
    return article ? Response.json({ article }) : Response.json({ error: "Draft not found." }, { status: 404 });
  }
  return Response.json({ articles: await listArticles(a.org.id), configured: !!process.env.ANTHROPIC_API_KEY });
}

/** POST { topic, notes?, audience?, length?, siteId? } → writes, saves and returns a draft. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't write articles." }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "The AI writer isn't set up yet." }, { status: 503 });
  if (!await rateLimit("writer:" + a.org.id, 20)) return Response.json({ error: "You've written a lot this hour. Try again later." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const input = cleanInput(b);
    let siteId: string | null = null, domain = "", brand = "";
    if (typeof b.siteId === "string" && b.siteId) {
      const { data } = await db().from("sites").select("id, domain, client_name").eq("org_id", a.org.id).eq("id", b.siteId).maybeSingle();
      if (!data) return Response.json({ error: "Choose one of your saved sites." }, { status: 404 });
      siteId = data.id as string;
      domain = data.domain as string;
      brand = (data.client_name as string | null) || brandOf(domain);
    }
    await spendCredits(a, CREDIT_COST.article, "AI writer article");
    const article = await writeArticle({ ...input, brand: brand || "the business", domain: domain || "their website" });
    const id = await saveArticle(a.org.id, siteId, input.topic, article);
    return Response.json({ id, article });
  } catch (e) {
    if (e instanceof PaywallError) return Response.json({ error: e.message, upgrade: true }, { status: e.status });
    if (e instanceof WriterError) return Response.json({ error: e.message }, { status: e.status });
    console.error("ai-writer", e);
    return Response.json({ error: "The AI didn't answer properly. Try again." }, { status: 502 });
  }
}

/** DELETE ?id= removes a draft. */
export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't delete drafts." }, { status: 403 });
  await deleteArticle(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
  return Response.json({ ok: true });
}
