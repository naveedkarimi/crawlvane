import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SchemaTool from "./SchemaTool";

export const metadata: Metadata = {
  title: "Schema markup generator (JSON-LD) for SEO and AI search",
  description:
    "Free JSON-LD generator for Organization, LocalBusiness, Person, Article, FAQPage and Product schema. Fill in a short form, copy the code, paste it into your page.",
  alternates: { canonical: "/tools/schema-generator" },
};

const faqs = [
  {
    q: "Which schema should I add first?",
    a: "Start with Organization (or Person for a personal brand) on your homepage, with sameAs links to your real profiles. It tells search engines and AI assistants who you are. Then add Article to blog posts, Product to product pages and LocalBusiness if you have an address.",
  },
  {
    q: "Does schema help with ChatGPT and AI search?",
    a: "It helps machines understand your business and connect it to your profiles, which reduces the chance of being misdescribed. It isn't a ranking guarantee, and it can't make up for text that crawlers can't read.",
  },
  {
    q: "Where do I paste the code?",
    a: "Inside the <head> of the page it describes, or anywhere in the body. On WordPress, use your SEO plugin's schema settings or a plugin that adds header scripts. On Shopify, Wix and Squarespace, use the custom code or header injection setting.",
  },
  {
    q: "Is anything I type sent to your server?",
    a: "No. This generator runs entirely in your browser. Nothing you type is stored or sent anywhere.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="schema-generator"
      h1="Schema markup generator"
      sub="Pick a type, fill in a short form, and copy JSON-LD that search engines and AI assistants understand. Runs in your browser."
      faqs={faqs}
      guide="structured-data-for-ai-search"
    >
      <SchemaTool />
    </ToolPage>
  );
}
