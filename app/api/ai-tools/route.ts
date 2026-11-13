import { describeBrand, metaIdeas, pageInput } from "@/lib/ai/helpers";
import { runAudit } from "@/lib/audit";
import { featureEnabled } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { insertRow, newId } from "@/lib/store";
import { UnsafeUrlError } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** Most AI free-tool runs per day across everyone, a cost ceiling on top of the per-visitor limits. */
const DAILY_CAP = Math.max(1, Number(process.env.AI_TOOLS_DAILY_CAP || 150) || 150);
let day = "";
let used = 0;
function underDailyCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; used = 0; }
  if (used >= DAILY_CAP) return false;
  used++;
  return true;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

/**
 * POST { tool: "describe", url, email, brand? } → how an AI assistant describes the business, next to what the site says.
 * POST { tool: "meta", url } → title and meta description ideas that fit in search results.
 * Free, with an email for "describe", per-visitor daily limits and a daily cap overall.
 */
export async function POST(req: Request) {
  if (!featureEnabled("aiTools", req)) return Response.json({ error: "Not available." }, { status: 404 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "This tool isn't set up yet." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { tool?: string; url?: string; email?: string; brand?: string };
  const tool = b.tool === "describe" || b.tool === "meta" ? b.tool : null;
  if (!tool) return Response.json({ error: "Bad request." }, { status: 400 });
  const email = String(b.email ?? "").trim().slice(0, 254);
  if (tool === "describe" && !EMAIL.test(email)) return Response.json({ error: "Enter your email address to get the result." }, { status: 400 });
  if (!await rateLimit(`aitool:${tool}:${clientIp(req)}`, tool === "describe" ? 3 : 5, 86400_000))
    return Response.json({ error: "You've reached today's free limit for this tool. Try again tomorrow." }, { status: 429 });
  if (!underDailyCap()) return Response.json({ error: "This free tool is busy today. Try again tomorrow." }, { status: 429 });

  let audit;
  try {
    audit = await runAudit(String(b.url ?? ""));
  } catch (e) {
    const msg = e instanceof UnsafeUrlError ? "Enter a public website address." : "We couldn't load that page. Check the address and try again.";
    return Response.json({ error: msg }, { status: 400 });
  }
  if (audit.facts.status >= 400) return Response.json({ error: `That page returned an error (${audit.facts.status}), so there's nothing to read.` }, { status: 422 });
  const page = pageInput({ ...audit.facts, url: audit.url });
  try {
    if (tool === "meta") return Response.json({ url: page.url, current: { title: page.title, description: page.metaDescription }, ideas: await metaIdeas(page) });
    const host = new URL(page.url).hostname.replace(/^www\./, "");
    const brand = String(b.brand ?? "").trim().slice(0, 80) || page.title.split(/[|\-–—:]/)[0].trim() || host;
    await insertRow("leads", { id: newId(14), kind: "tool", email, url: page.url, source: "tool:ai-brand-description" }).catch((e) => console.error("Tool lead not saved:", e));
    return Response.json({ url: page.url, brand, result: await describeBrand(brand, page) });
  } catch (e) {
    console.error("ai-tools", tool, e);
    return Response.json({ error: "The AI didn't answer properly. Try again." }, { status: 502 });
  }
}
