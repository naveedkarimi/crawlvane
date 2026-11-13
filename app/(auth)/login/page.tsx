import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForms";
import { authConfigured, currentUser } from "@/lib/auth";
import { authHref } from "@/lib/authLinks";
import { safeNextPath } from "@/lib/safeNext";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  // Already signed in: skip the form and go straight to the app.
  if (authConfigured() && (await currentUser().catch(() => null))) redirect(next);
  return (
    <div className="auth-panel"><LoginForm signupHref={authHref("/signup", next)} /></div>
  );
}
