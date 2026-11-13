import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import AgentTool from "./AgentTool";

export const metadata: Metadata = {
  title: "AI agent readiness checker for websites",
  description:
    "Free check for the agent era: landmarks, labelled forms, named buttons, link text, prices and contact details as text, schema and server-rendered content.",
  alternates: { canonical: "/tools/ai-agent-readiness" },
};

const faqs = [
  {
    q: "What is an AI agent on a website?",
    a: "An AI agent is an assistant that does tasks for someone: opens pages, compares options, fills in forms and books or buys. It reads the page's structure and text rather than its look, so unlabelled buttons and facts hidden in images get in its way.",
  },
  {
    q: "How is this different from an accessibility check?",
    a: "It overlaps a lot: agents and screen readers both rely on landmarks, labels and button names. This checker also looks at things agents need to make decisions, such as prices, contact details and structured data about your business. It isn't a full accessibility audit.",
  },
  {
    q: "What are WebMCP and NLWeb?",
    a: "WebMCP is a draft standard previewed by Google in 2026 that lets a site offer actions, such as search or book, as tools an agent can call. NLWeb, from Microsoft, makes a site queryable in natural language using its Schema.org data. Both are early; the basics checked here come first.",
  },
  {
    q: "Why does it say my forms have no labels when they look fine?",
    a: "A placeholder inside a field disappears when you type and isn't a label. Agents and screen readers need a <label> element or an aria-label to know what a field is for.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="ai-agent-readiness"
      h1="AI agent readiness checker"
      sub="AI agents now browse, compare and book for people. Check whether they can understand your page and use its forms and buttons."
      faqs={faqs}
      guide="is-your-website-ready-for-ai-agents"
    >
      <AgentTool />
    </ToolPage>
  );
}
