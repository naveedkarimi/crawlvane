import { requireAccount } from "@/lib/apiAuth";
import { applyReferral, referralStats } from "@/lib/referrals";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → the team's referral link and what it has earned. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  try {
    return Response.json(await referralStats(a.org.id));
  } catch {
    return Response.json({ error: "Referrals aren't available yet." }, { status: 503 });
  }
}

/** POST { code } links a new team to the team that referred it (sent once, after the first sign-in). */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!await rateLimit("referral:" + a.org.id, 10)) return Response.json({ error: "Too many tries." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { code?: unknown };
  const result = await applyReferral(a.org.id, String(b.code ?? "")).catch(() => "unknown" as const);
  return Response.json({ result });
}
