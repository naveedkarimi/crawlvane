import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import MarkdownTool from "./MarkdownTool";

export const metadata: Metadata = {
  title: "Webpage to Markdown converter for LLMs (free)",
  description:
    "Turn any web page into clean Markdown, without menus or scripts, with word and token counts. See what an AI model reads, then copy or download it.",
  alternates: { canonical: "/tools/page-to-markdown" },
};

const faqs = [
  {
    q: "Why convert a page to Markdown?",
    a: "Markdown keeps the structure that matters (headings, lists, links, tables) without the HTML noise, so it's compact and easy for language models to read. It's handy for pasting a page into ChatGPT or Claude, building llms-full.txt, or checking what an AI tool actually gets from your page.",
  },
  {
    q: "Why is my converted page almost empty?",
    a: "The converter reads the HTML your server sends, without running JavaScript, as most AI crawlers do. If the result is nearly empty, your content is built in the browser and those crawlers can't see it either. Server-side rendering or prerendering fixes that.",
  },
  {
    q: "What counts as a token?",
    a: "Language models read text in tokens: pieces of words. In English, one token is about three quarters of a word, so 750 words is roughly 1,000 tokens. The exact count depends on the model.",
  },
  {
    q: "Can I convert pages I don't own?",
    a: "You can convert any public page for reading and research. Respect the site's copyright and terms if you plan to republish or reuse the content.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="page-to-markdown"
      h1="Page to Markdown"
      sub="Turn any page into the clean Markdown an AI model reads: the main content without menus, scripts or footers, with word and token counts."
      faqs={faqs}
      guide="can-chatgpt-read-your-website"
    >
      <MarkdownTool />
    </ToolPage>
  );
}
