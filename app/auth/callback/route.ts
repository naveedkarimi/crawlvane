import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safeNext";
import { authClient, authConfigured } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sign-in emails and Google, Microsoft and GitHub sign-in land here. Swap the one-time code for a session, then go on. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const next = u.searchParams.get("next") ?? "/dashboard";
  const safeNext = safeNextPath(next);
  const back = (kind: "link" | "oauth") => NextResponse.redirect(new URL(`/login?error=${kind}&next=${encodeURIComponent(safeNext)}`, u.origin));
  // Google, Microsoft or GitHub send ?error= when someone cancels or the provider refuses.
  if (u.searchParams.get("error")) return back("oauth");
  if (!authConfigured() || !code) return back("link");
  const { error } = await (await authClient()).auth.exchangeCodeForSession(code);
  return error ? back("link") : NextResponse.redirect(new URL(safeNext, u.origin));
}
