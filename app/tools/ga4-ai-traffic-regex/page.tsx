import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import RegexTool from "./RegexTool";

export const metadata: Metadata = {
  title: "GA4 AI traffic regex: track ChatGPT, Perplexity and Claude visits",
  description: "Build the regex for a GA4 channel that groups visits from ChatGPT, Perplexity, Claude, Gemini, Copilot and other AI assistants, with step-by-step setup. Free.",
  alternates: { canonical: "/tools/ga4-ai-traffic-regex" },
};

const faqs = [
  { q: "Why doesn't GA4 show AI traffic on its own?", a: "GA4's default channels don't have an AI group, so visits from ChatGPT or Perplexity land in Referral, mixed with every other site that links to you. A custom channel group pulls them out into one line." },
  { q: "Does this catch all AI traffic?", a: "No. Some AI apps don't pass a referrer, so those clicks show up as Direct. And when an answer mentions you without a link, people often search for you instead, which shows up as branded search. Treat the AI channel as the minimum." },
  { q: "Will it change my past reports?", a: "Custom channel groups only apply to data collected after you save them. To look back, use the same regex as a session source filter in an Exploration." },
  { q: "Why does ChatGPT appear twice?", a: "ChatGPT moved from chat.openai.com to chatgpt.com, and old links still use the first address. ChatGPT also adds utm_source=chatgpt.com to many links, which GA4 records as the same source." },
];

export default function Page() {
  return (
    <ToolPage slug="ga4-ai-traffic-regex" h1="GA4 AI traffic regex builder" faqs={faqs} guide="ai-referral-traffic-ga4"
      sub="Pick the AI assistants, copy one regex, and see visits from ChatGPT, Perplexity, Claude and Gemini as their own channel in Google Analytics 4. Runs in your browser.">
      <RegexTool />
    </ToolPage>
  );
}
