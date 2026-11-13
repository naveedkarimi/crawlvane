import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/AuthForms";
import { authConfigured, currentUser } from "@/lib/auth";
import { authHref } from "@/lib/authLinks";
import { safeNextPath } from "@/lib/safeNext";

export const metadata: Metadata = { title: "Create your account", robots: { index: false, follow: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (authConfigured() && (await currentUser().catch(() => null))) redirect(next);
  return (
    <div className="auth-panel"><SignupForm loginHref={authHref("/login", next)} /></div>
  );
}
