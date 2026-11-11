import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import AiChecker from "./AiChecker";

export const metadata: Metadata = {
  title: "Can AI read my website? Free AI visibility checker",
  description:
    "See your page as people see it next to the text ChatGPT, Claude and Perplexity crawlers actually read. Find JavaScript-only content that AI can't see. Free.",
  alternates: { canonical: "/tools/ai-visibility-checker" },
};

const faqs = [
  {
    q: "Why can't AI crawlers read some websites?",
    a: "Many modern sites send a nearly empty HTML file and build the page with JavaScript in the browser. Google renders JavaScript, but most AI crawlers, including GPTBot, ClaudeBot and PerplexityBot, read the raw HTML and move on. If your text only appears after JavaScript runs, they can't read, quote or cite it.",
  },
  {
    q: "How many words should AI crawlers see?",
    a: "There's no official number. As a rule of thumb, under 50 words in the HTML usually means the content is built by JavaScript, and under 250 words is a thin page. A healthy page shows the same headings and main text in the raw HTML as people see in the browser.",
  },
  {
    q: "How do I fix a page AI can't read?",
    a: "The best fix is server-side rendering or static generation, which frameworks such as Next.js, Nuxt, SvelteKit and Astro support. If you can't change the framework, prerender your key pages, or at least put the H1, a short intro, key facts and your FAQ in the HTML as real text.",
  },
  {
    q: "Is this the same as being cited by ChatGPT?",
    a: "No. Being readable is the first step, not a guarantee. AI assistants also need to be allowed to crawl your site and to find your content clear and trustworthy. The full audit checks those too.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="ai-visibility-checker"
      h1="Can AI read your page?"
      sub="Most AI crawlers don't run JavaScript. See your page as people see it next to the text ChatGPT, Claude and Perplexity actually get."
      faqs={faqs}
      guide="can-chatgpt-read-your-website"
    >
      <AiChecker />
    </ToolPage>
  );
}
