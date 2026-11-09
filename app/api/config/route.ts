import { FEATURES, FEATURE_PLAN, LIMITS, PAYWALL_ENABLED, featureEnabled, isAdmin, isPublic } from "@/lib/config";
import { availableEngines } from "@/lib/ai/visibility";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = isAdmin(req);
  return Response.json({
    admin,
    paywall: PAYWALL_ENABLED,
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
