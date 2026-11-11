import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import LlmsTool from "./LlmsTool";

export const metadata: Metadata = {
  title: "llms.txt generator and validator (free)",
  description:
    "Generate an llms.txt from your site's key pages in about 20 seconds, edit it, and check your existing file against the llmstxt.org format. Free, no sign-up.",
  alternates: { canonical: "/tools/llms-txt-generator" },
};

const faqs = [
  {
    q: "What is llms.txt?",
    a: "llms.txt is a proposed standard from llmstxt.org: a short Markdown file at yoursite.com/llms.txt with your site's name, a one-line summary and links to your most important pages, so AI tools get a clean map of your site.",
  },
  {
    q: "Does llms.txt help with ChatGPT or Google rankings?",
    a: "No search engine or AI company has confirmed using it for ranking, and a 2026 Ahrefs log study found most llms.txt files received no requests at all. It's cheap to add and can help AI tools and agents that look for it, but fix crawler access and readable content first.",
  },
  {
    q: "How does this generator pick pages?",
    a: "It reads your homepage, follows its links in navigation order, adds pages from your sitemap, skips login, cart, search and noindex pages, and reads up to 24 page titles and descriptions. You can edit the result before you download it.",
  },
  {
    q: "What's the difference between llms.txt and llms-full.txt?",
    a: "llms.txt is a short map with links. llms-full.txt is an optional companion that contains the full text of your key pages in one file, so a tool can read everything without following links.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="llms-txt-generator"
      h1="llms.txt generator"
      sub="Enter your site and get a ready-to-upload llms.txt built from your key pages. Already have one? We check it too."
      faqs={faqs}
      guide="does-llms-txt-matter"
    >
      <LlmsTool />
    </ToolPage>
  );
}
