import { FEATURES, FEATURE_PLAN, LIMITS, PAYWALL_ENABLED, featureEnabled, isAdmin, isPublic } from "@/lib/config";
import { availableEngines } from "@/lib/ai/visibility";
import { optionalAccount } from "@/lib/apiAuth";
import { SIGNUP_GATE, VISITOR_FIX_PREVIEW } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = isAdmin(req);
  const acc = await optionalAccount(req).catch(() => null);
  return Response.json({
    admin,
    paywall: PAYWALL_ENABLED,
    // Who's asking, so pages can show the right sign-up or upgrade prompts.
    accounts: isPublic("accounts"),
    signupGate: SIGNUP_GATE,
    fixPreview: VISITOR_FIX_PREVIEW,
    account: acc ? { plan: acc.org.plan, role: acc.role } : null,
    features: FEATURES.map((f) => ({
      key: f.key,
      name: f.name,
      description: f.description,
      tier: f.tier,
      plan: FEATURE_PLAN[f.key],
      public: isPublic(f.key),
      enabled: featureEnabled(f.key, req),
      // Only reveal configuration gaps to the admin
      ...(admin ? { requires: f.requires ?? [] } : {}),
    })),
    engines: admin || isPublic("aiVisibility") ? availableEngines() : [],
    aiConfigured: !!process.env.ANTHROPIC_API_KEY,
    limits: { maxPagesDefault: LIMITS.maxPagesDefault, maxPagesHard: LIMITS.maxPagesHard, maxCompetitors: LIMITS.maxCompetitors },
  });
}
