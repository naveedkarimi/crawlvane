import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import LogTool from "./LogTool";

export const metadata: Metadata = {
  title: "AI bot log analyzer: GPTBot and ClaudeBot visits",
  description: "Upload your server log to see which AI crawlers visit, what they read, what gets blocked and how many visitors ChatGPT and Perplexity send. Runs in-browser.",
  alternates: { canonical: "/tools/ai-bot-log-analyzer" },
};

const faqs = [
  { q: "Is my log uploaded anywhere?", a: "No. The file is read and analysed by JavaScript in your browser. Nothing is sent to our server, so it works with logs that contain visitor IP addresses." },
  { q: "Which log formats work?", a: "The Apache and nginx \"combined\" format that most hosts use, including cPanel's raw access logs, plus JSON lines from Cloudflare Logpush and Caddy when they include the path and user agent." },
  { q: "What's the difference between the crawler types?", a: "AI search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) build the index AI assistants search. User-asked fetchers (ChatGPT-User, Claude-User, Perplexity-User) load a page because someone asked about it right now. Training crawlers (GPTBot, ClaudeBot, CCBot) collect text for future models." },
  { q: "Why don't I see any AI crawlers?", a: "Either they haven't found your site yet, your firewall or CDN blocks them before they reach your server log, or your host's log only covers a few days. Try a longer log, and check access with the AI bot checker." },
];

export default function Page() {
  return (
    <ToolPage slug="ai-bot-log-analyzer" h1="AI bot log analyzer" faqs={faqs} guide="ai-crawlers-which-to-allow"
      sub="Drop in your server access log to see which AI crawlers read your site, what they read, what gets blocked, and which visits come from ChatGPT or Perplexity.">
      <LogTool />
    </ToolPage>
  );
}
