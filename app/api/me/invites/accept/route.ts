import { cookies } from "next/headers";
import { ORG_COOKIE } from "@/lib/apiAuth";
import { authConfigured, currentUser } from "@/lib/auth";
import { featureEnabled } from "@/lib/config";
import { TeamError, acceptInvite } from "@/lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { token } joins the team the invite is for, and makes it the team the dashboard shows. */
export async function POST(req: Request) {
  if (!featureEnabled("accounts", req) || !authConfigured()) return Response.json({ error: "Accounts aren't available yet." }, { status: 404 });
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  try {
    const { orgId } = await acceptInvite(user, String(token ?? ""));
    (await cookies()).set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof TeamError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
