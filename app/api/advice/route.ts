import { pagePlan } from "@/lib/ai/plan";
import { featureEnabled } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import type { AuditResult } from "@/lib/types";
import { optionalAccount } from "@/lib/apiAuth";
import { SIGNUP_GATE } from "@/lib/tiers";
import { CREDIT_COST, PaywallError, spendCredits } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 190;

export async function POST(req: Request) {
  if (!featureEnabled("aiPlan", req)) return Response.json({ error: "Not available." }, { status: 404 });
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: "AI fix plan isn't configured yet (missing ANTHROPIC_API_KEY)." }, { status: 503 });
  if (!rateLimit("advice:" + clientIp(req), 10))
    return Response.json({ error: "AI fix plan limit reached — try again later." }, { status: 429 });

  let body: AuditResult;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  if (!Array.isArray(body?.checks)) return Response.json({ error: "Bad request." }, { status: 400 });
  if (SIGNUP_GATE && !(await optionalAccount(req)))
    return Response.json({ error: "Create a free account to get your AI fix plan.", signup: true }, { status: 401 });

  // Rebuild a safe, typed view of the client payload
  const f = body.facts ?? ({} as AuditResult["facts"]);
  const audit = {
    ...body,
    scores: { overall: 0, seo: Number(body.scores?.seo) || 0, aeo: Number(body.scores?.aeo) || 0, geo: Number(body.scores?.geo) || 0 },
    checks: body.checks.slice(0, 80).map((c) => ({ ...c, title: String(c.title), detail: String(c.detail), category: String(c.category) })),
    facts: {
      ...f,
      finalUrl: String(f.finalUrl ?? body.url ?? ""),
      title: String(f.title ?? ""),
      metaDescription: String(f.metaDescription ?? ""),
      h1: Array.isArray(f.h1) ? f.h1.map(String) : [],
      wordCount: Number(f.wordCount) || 0,
      schemaTypes: Array.isArray(f.schemaTypes) ? f.schemaTypes.map(String) : [],
    },
  } as AuditResult;

  try {
    try {
      await spendCredits(await optionalAccount(req), CREDIT_COST.aiPlan, "page AI plan");
    } catch (e) {
      if (e instanceof PaywallError) return Response.json({ error: e.message, upgrade: true }, { status: e.status });
      throw e;
    }
    return Response.json(await pagePlan(audit));
  } catch (e) {
    console.error("advice", e);
    return Response.json({ error: "AI service error — try again." }, { status: 502 });
  }
}
