import { requireAccount } from "@/lib/apiAuth";
import { BrandingError, getBranding, setBranding } from "@/lib/branding";
import { featureEnabled } from "@/lib/config";
import { planAllowsFor } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (e: unknown) => {
  if (e instanceof BrandingError) return Response.json({ error: e.message, upgrade: e.status === 402 }, { status: e.status });
  throw e;
};

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({
    branding: await getBranding(a.org.id),
    allowed: featureEnabled("whiteLabel", req) && planAllowsFor(a.org, "whiteLabel"),
    customDomains: process.env.CUSTOM_REPORT_DOMAINS === "1",
    canEdit: a.role === "owner",
  });
}

/** PATCH { name, logoUrl, color, domain } saves the team's report branding. */
export async function PATCH(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!featureEnabled("whiteLabel", req)) return Response.json({ error: "Report branding isn't available yet." }, { status: 404 });
  try {
    return Response.json({ branding: await setBranding(a, (await req.json().catch(() => ({}))) as Record<string, unknown>) });
  } catch (e) {
    return fail(e);
  }
}
