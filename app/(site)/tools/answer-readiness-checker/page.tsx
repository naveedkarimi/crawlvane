import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import AnswersTool from "./AnswersTool";

export const metadata: Metadata = {
  title: "Answer readiness checker (AEO) for AI Overviews",
  description:
    "Free AEO tool: lists the questions your page answers, checks each answer is short and direct enough to quote, and suggests headings to rephrase as questions.",
  alternates: { canonical: "/tools/answer-readiness-checker" },
};

const faqs = [
  {
    q: "What is answer engine optimization (AEO)?",
    a: "AEO is shaping your content so answer engines, such as Google's featured snippets and AI Overviews, voice assistants and AI chat, can lift a clear answer from your page. It mostly means question headings, direct answers and well-structured lists and tables.",
  },
  {
    q: "How long should an answer be?",
    a: "Aim for 40 to 60 words directly under the question: long enough to be complete, short enough to quote. Add detail, examples and caveats after it. This checker counts 8 to 90 words as quotable.",
  },
  {
    q: "Why doesn't the checker find my FAQ answers?",
    a: "It reads the raw HTML, like most AI crawlers. If your FAQ is loaded by JavaScript or the answers sit far from their questions in the code, they may not be found. That's worth fixing, because crawlers face the same problem.",
  },
  {
    q: "Does every page need question headings?",
    a: "No. They matter most on pages meant to answer things: guides, service pages, pricing and FAQs. A contact page or a product gallery doesn't need them.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="answer-readiness-checker"
      h1="Answer readiness checker"
      sub="See which questions your page answers and whether each answer is short and direct enough for AI Overviews and assistants to quote."
      faqs={faqs}
      guide="write-content-ai-assistants-quote"
    >
      <AnswersTool />
    </ToolPage>
  );
}
