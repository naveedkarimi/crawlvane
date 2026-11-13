import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHero from "@/components/PageHero";
import LoginForm from "@/components/LoginForm";
import { authConfigured, currentUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { safeNextPath } from "@/lib/safeNext";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  // Already signed in: skip the form and go straight to the app.
  if (authConfigured() && (await currentUser().catch(() => null))) {
    const { next } = await searchParams;
    redirect(safeNextPath(next));
  }
  return (
    <main>
      <PageHero kicker="Account" title={`Sign in to ${BRAND.name}`}>
        <p className="hero-sub">Save your sites, see how scores change over time and keep every report in one place. No password needed.</p>
        <LoginForm />
      </PageHero>
    </main>
  );
}
