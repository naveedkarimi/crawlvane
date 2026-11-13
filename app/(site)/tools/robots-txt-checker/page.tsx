import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import RobotsTool from "./RobotsTool";

export const metadata: Metadata = {
  title: "AI robots.txt checker and generator",
  description:
    "See which search and AI crawlers your robots.txt allows, test any path, and build one that lets AI search cite you while you choose on training bots.",
  alternates: { canonical: "/tools/robots-txt-checker" },
};

const faqs = [
  {
    q: "Should I block GPTBot in robots.txt?",
    a: "Only if you don't want your content used to train OpenAI's models. GPTBot is a training crawler. ChatGPT search uses OAI-SearchBot and ChatGPT-User, so you can block GPTBot and still be found and cited in ChatGPT.",
  },
  {
    q: "What's the difference between AI search bots and training bots?",
    a: "AI search bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot) build the index assistants search when answering. On-request fetchers (ChatGPT-User, Claude-User, Perplexity-User) open a page when a user asks. Training bots (GPTBot, ClaudeBot, CCBot, Google-Extended) collect content for future models.",
  },
  {
    q: "Why does my disallow rule not apply to AI bots?",
    a: "A crawler that finds a group with its own name follows only that group and ignores the User-agent: * group. That's why this generator repeats your blocked paths in every named group.",
  },
  {
    q: "Is robots.txt enough to control AI crawlers?",
    a: "robots.txt is a request that reputable crawlers follow. It doesn't block anything by itself, and your firewall or CDN can block crawlers that robots.txt allows. Use the AI Bot Checker to test what actually happens.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="robots-txt-checker"
      h1="AI robots.txt checker"
      sub="See which search engines and AI crawlers your robots.txt lets in, test any path, and build a new file in a few clicks."
      faqs={faqs}
      guide="ai-crawlers-which-to-allow"
    >
      <RobotsTool />
    </ToolPage>
  );
}
