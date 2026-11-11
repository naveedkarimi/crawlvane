import { NextResponse } from "next/server";
import { authClient, authConfigured } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The sign-in email links here. Swap the one-time code for a session, then go to the dashboard. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const next = u.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (!authConfigured() || !code) return NextResponse.redirect(new URL("/login?error=link", u.origin));
  const { error } = await (await authClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? "/login?error=link" : safeNext, u.origin));
}
