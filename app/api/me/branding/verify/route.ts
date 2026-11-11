import { requireAccount } from "@/lib/apiAuth";
import { BrandingError, verifyDomain } from "@/lib/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST checks that the team's report domain points at this server. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  try {
    return Response.json({ branding: await verifyDomain(a) });
  } catch (e) {
    if (e instanceof BrandingError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
