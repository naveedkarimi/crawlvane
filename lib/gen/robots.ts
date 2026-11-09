import { AI_BOTS } from "../robots";
import type { BotAccess } from "../types";

export type Choice = "allow" | "block";

export interface RobotsOptions {
  /** AI search indexes: OAI-SearchBot, Claude-SearchBot, PerplexityBot... */
  aiSearch: Choice;
  /** On-request fetchers: ChatGPT-User, Claude-User, Perplexity-User... */
  fetchers: Choice;
  /** Training crawlers and controls: GPTBot, ClaudeBot, CCBot, Google-Extended... */
  training: Choice;
  /** Paths every crawler should skip, e.g. /admin/. */
  disallow: string[];
  sitemap: string;
}

export const DEFAULT_ROBOTS: RobotsOptions = { aiSearch: "allow", fetchers: "allow", training: "allow", disallow: [], sitemap: "" };

const botsFor = (purpose: BotAccess["purpose"]) => AI_BOTS.filter((b) => b.purpose === purpose).map((b) => b.bot);

export const BOT_GROUPS = {
  aiSearch: botsFor("search"),
  fetchers: botsFor("user-fetch"),
  training: botsFor("training"),
};

export const cleanPaths = (raw: string[]) =>
  [...new Set(raw.map((p) => p.trim()).filter(Boolean).map((p) => (p.startsWith("/") ? p : `/${p}`)))];

/**
 * Build a robots.txt. A crawler that matches a named group ignores the "*" group
 * (RFC 9309), so the shared Disallow paths are repeated in every named group.
 */
export function buildRobotsTxt(o: RobotsOptions): string {
  const paths = cleanPaths(o.disallow);
  const rules = (choice: Choice) => (choice === "block" ? ["Disallow: /"] : ["Allow: /", ...paths.map((p) => `Disallow: ${p}`)]);
  const out: string[] = ["# Search engines and everyone else", "User-agent: *", ...rules("allow"), ""];

  const section = (title: string, bots: string[], choice: Choice) => {
    out.push(`# ${title}: ${choice === "allow" ? "allowed" : "blocked"}`, ...bots.map((b) => `User-agent: ${b}`), ...rules(choice), "");
  };
  section("AI search (lets assistants find and cite you)", BOT_GROUPS.aiSearch, o.aiSearch);
  section("AI assistants opening a page when a user asks", BOT_GROUPS.fetchers, o.fetchers);
  section("AI model training", BOT_GROUPS.training, o.training);

  const sitemap = o.sitemap.trim();
  if (sitemap) out.push(`Sitemap: ${sitemap}`);
  return out.join("\n").trim() + "\n";
}
