import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import MetaTool from "./MetaTool";

export const metadata: Metadata = {
  title: "Meta title and description writer: free AI tool",
  description: "Free tool: get title tags and meta descriptions written from your own page, sized to fit in search results, with character counts.",
  alternates: { canonical: "/tools/meta-tag-writer" },
};

const faqs = [
  {
    q: "How long should a title tag be?",
    a: "About 50 to 60 characters. Longer titles get cut off in search results. Put the words people search for first, and your brand at the end if it fits.",
  },
  {
    q: "How long should a meta description be?",
    a: "About 120 to 155 characters. Say what the page offers and why someone should click. Search engines often rewrite descriptions, but a clear one is used more often.",
  },
  {
    q: "Where do the suggestions come from?",
    a: "An AI model reads your page's title, headings and text and writes options from them. It's told not to invent prices, numbers or claims, so check each one before you use it.",
  },
  {
    q: "How often can I use it?",
    a: "Five times a day from the same network.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="meta-tag-writer"
      h1="Meta title and description writer"
      sub="Get title tags and meta descriptions written from your page, sized to fit in search results."
      faqs={faqs}
    >
      <MetaTool />
    </ToolPage>
  );
}
