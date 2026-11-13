import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import BrandTool from "./BrandTool";

export const metadata: Metadata = {
  title: "How does AI describe my business? Free AI brand check",
  description:
    "Free tool: see what an AI assistant says about your business, next to what your website says, and the changes that help AI describe you correctly.",
  alternates: { canonical: "/tools/ai-brand-description" },
};

const faqs = [
  {
    q: "Which AI does this ask?",
    a: "Claude, from its own knowledge and without searching the web. Other assistants such as ChatGPT, Perplexity and Gemini learn from different sources and may say something else. To test those every week, use AI visibility tracking in the dashboard.",
  },
  {
    q: "Why doesn't the AI know my business?",
    a: "AI models learn from what's published about you: your own site, directories, reviews, press and profiles. Small or new businesses often aren't known yet. A clear About page, Organization schema with your official profiles, and consistent details everywhere make it easier to learn the right facts.",
  },
  {
    q: "Why do you ask for my email?",
    a: "This tool runs an AI model, which costs us money each time. The email keeps it free and stops abuse. We may email you about results like these, and every email has an unsubscribe link.",
  },
  {
    q: "How often can I use it?",
    a: "Three times a day from the same network, so everyone gets a turn.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="ai-brand-description"
      h1="How does AI describe my business?"
      sub="See what an AI assistant says about you from its own knowledge, next to what your website says, and what to change so it gets you right."
      faqs={faqs}
    >
      <BrandTool />
    </ToolPage>
  );
}
