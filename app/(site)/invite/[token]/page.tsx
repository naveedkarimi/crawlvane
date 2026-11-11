import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import AcceptInvite from "@/components/AcceptInvite";

export const metadata: Metadata = { title: "Join a team", robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main>
      <PageHero kicker="Team invite" title="Join the team">
        <p className="hero-sub">You&apos;ve been invited to share sites, reports and alerts with a team.</p>
        <AcceptInvite token={token} />
      </PageHero>
    </main>
  );
}
