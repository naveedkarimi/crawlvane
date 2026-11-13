import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safeNext";
import { authClient, authConfigured } from "@/lib/auth";
import { afterLink, linkType } from "@/lib/authLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Account email links and Google, Microsoft and GitHub sign-in land here.
 *  - ?token_hash=&type= comes from our email templates. It works in any browser, so a link opened
 *    on a phone still signs in.
 *  - ?code= comes from Supabase's own links and from social sign-in. It only works in the browser
 *    that started the sign-in.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const tokenHash = u.searchParams.get("token_hash");
  const type = linkType(u.searchParams.get("type"));
  const safeNext = safeNextPath(u.searchParams.get("next") ?? "/dashboard");
  const recovery = type === "recovery" || safeNext === "/reset-password";
  const back = (kind: "link" | "oauth") =>
    NextResponse.redirect(new URL(recovery ? "/forgot-password?error=link" : `/login?error=${kind}&next=${encodeURIComponent(safeNext)}`, u.origin));
  // Google, Microsoft or GitHub send ?error= when someone cancels or the provider refuses.
  if (u.searchParams.get("error")) return back("oauth");
  if (!authConfigured()) return back("link");
  const auth = (await authClient()).auth;
  if (tokenHash && type) {
    const { error } = await auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? back("link") : NextResponse.redirect(new URL(afterLink(type, safeNext), u.origin));
  }
  if (!code) return back("link");
  const { error } = await auth.exchangeCodeForSession(code);
  return error ? back("link") : NextResponse.redirect(new URL(safeNext, u.origin));
}
