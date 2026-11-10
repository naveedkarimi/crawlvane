import type { Metadata } from "next";
import UnsubscribeButton from "./UnsubscribeButton";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default function UnsubscribePage() {
  return (
    <main>
      <PageHero kicker="Newsletter" title="Unsubscribe from the newsletter">
        <UnsubscribeButton />
      </PageHero>
    </main>
  );
}
