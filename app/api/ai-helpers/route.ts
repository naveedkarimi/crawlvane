import { HELPER_KINDS, answerRewrites, faqBuilder, metaIdeas, pageInput, topicCoverage, type HelperKind } from "@/lib/ai/helpers";
import { featureEnabled } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { optionalAccount } from "@/lib/apiAuth";
import { SIGNUP_GATE } from "@/lib/tiers";
import { CREDIT_COST, PaywallError, spendCredits } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 150;

const COST: Record<HelperKind, number> = { topics: CREDIT_COST.topicCoverage, answers: CREDIT_COST.answerRewrites, faq: CREDIT_COST.faqBuilder, meta: CREDIT_COST.metaWriter };
const RUN = { topics: topicCoverage, answers: answerRewrites, faq: faqBuilder, meta: metaIdeas };

/** POST { kind: "topics" | "answers" | "faq" | "meta", facts } → the AI helper's result for the page just checked. */
export async function POST(req: Request) {
  if (!featureEnabled("aiHelpers", req)) return Response.json({ error: "Not available." }, { status: 404 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "AI helpers aren't set up yet." }, { status: 503 });
  if (!rateLimit("aihelper:" + clientIp(req), 20)) return Response.json({ error: "You've used the AI helpers a lot this hour. Try again later." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { kind?: string; facts?: Record<string, unknown> } | null;
  const kind = body?.kind as HelperKind;
  if (!HELPER_KINDS.includes(kind) || !body?.facts) return Response.json({ error: "Bad request." }, { status: 400 });
  const page = pageInput(body.facts);
  if (!page.url || (!page.textExcerpt && !page.outline.length)) return Response.json({ error: "This page has no text in its HTML for the AI to work with." }, { status: 422 });
  const account = await optionalAccount(req);
  if (SIGNUP_GATE && !account) return Response.json({ error: "Create a free account to use the AI helpers.", signup: true }, { status: 401 });
  try {
    await spendCredits(account, COST[kind], `AI helper: ${kind}`);
  } catch (e) {
    if (e instanceof PaywallError) return Response.json({ error: e.message, upgrade: true }, { status: e.status });
    throw e;
  }
  try {
    return Response.json({ kind, result: await RUN[kind](page) });
  } catch (e) {
    console.error("ai-helpers", kind, e);
    return Response.json({ error: "The AI didn't answer properly. Try again." }, { status: 502 });
  }
}
