import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import BotChecker from "./BotChecker";

export const metadata: Metadata = {
  title: "AI Bot Checker: can AI crawlers load your site?",
  description:
    "Free tool: request your page as GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Googlebot and more. Find firewall and CDN blocks that robots.txt doesn't show.",
  alternates: { canonical: "/tools/ai-bot-checker" },
};

const faqs = [
  {
    q: "Why would AI bots be blocked if my robots.txt allows them?",
    a: "Firewalls and CDNs make their own decisions. Since July 2025, Cloudflare blocks AI crawlers by default on newly added sites, and many security plugins block unknown bots. Your robots.txt can say yes while your firewall says no.",
  },
  {
    q: "Which bots matter most?",
    a: "For being found and cited: Googlebot and Bingbot (search, and Bing feeds Copilot), OAI-SearchBot and ChatGPT-User (ChatGPT search), Claude-SearchBot and Claude-User, PerplexityBot and Perplexity-User. Training bots like GPTBot, ClaudeBot and CCBot only affect model training; blocking them is a business choice.",
  },
  {
    q: "How accurate is this test?",
    a: "We send each crawler's official user-agent from our server and compare the response with a normal browser visit. Some firewalls also check that the request comes from the AI company's IP addresses, so a block can also mean the firewall rejects bots pretending to be that crawler. Confirm in your CDN's bot settings.",
  },
  {
    q: "How do I unblock AI search bots in Cloudflare?",
    a: "In the Cloudflare dashboard, open Security, then Bots, and review the AI Scrapers and Crawlers setting, plus any WAF custom rules that match bot user-agents. You can allow AI search and assistant bots while still blocking training crawlers.",
  },
];

export default function Page() {
  return (
    <ToolPage
      slug="ai-bot-checker"
      h1="Can AI bots load your site?"
      sub="Check whether Googlebot, ChatGPT, Claude, Perplexity and other crawlers actually get your page, or get blocked by a firewall that robots.txt doesn't tell you about."
      faqs={faqs}
      guide="is-cloudflare-blocking-ai-search"
    >
      <BotChecker />
    </ToolPage>
  );
}
