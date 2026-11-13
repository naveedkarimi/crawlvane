import type { Metadata } from "next";
import { Suspense } from "react";
import ToolPage from "@/components/ToolPage";
import AppCheck from "@/components/AppCheck";

export const metadata: Metadata = {
  title: "App Store and Google Play listing checker (ASO)",
  description:
    "Free App Store and Google Play listing check for any country: rating, screenshots, freshness and search basics, with a score and what to fix.",
  alternates: { canonical: "/tools/app-store-checker" },
};

const faqs = [
  {
    q: "What is App Store optimisation (ASO)?",
    a: "ASO is SEO for apps: making a store listing easier to find in store search and more likely to turn visitors into installs. The name, subtitle or short description, screenshots, ratings and how recently the app was updated all matter.",
  },
  {
    q: "Does the App Store use my description for search?",
    a: "No. Apple ranks apps on the name, the subtitle and a hidden 100-character keywords field you set in App Store Connect. The description still matters for people deciding whether to install. Google Play is different: it does use the full description for search.",
  },
  {
    q: "Can I check an app in another country?",
    a: "Yes. Pick any country from the list. Ratings, prices and even whether an app is available change from country to country, and each language has its own search index.",
  },
  {
    q: "How do I get more ratings?",
    a: "Ask at a good moment, such as after someone finishes a task, using Apple's in-app rating prompt or Google Play's In-App Review API. Don't ask on first launch, and fix the problems people mention in reviews first.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="app-store-checker"
      h1="App Check"
      sub="Check any App Store or Google Play listing, in any country. Get a score and a clear list of what to fix to be found and installed."
      faqs={faqs}
    >
      <Suspense fallback={null}>
        <AppCheck />
      </Suspense>
    </ToolPage>
  );
}
