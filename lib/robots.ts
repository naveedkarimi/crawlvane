import type { BotAccess } from "./types";

interface Rule {
  allow: boolean;
  path: string;
}
interface Group {
  agents: string[];
  rules: Rule[];
}

export interface ParsedRobots {
  groups: Group[];
  sitemaps: string[];
}

export function parseRobots(txt: string): ParsedRobots {
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      if (!current) continue;
      // "Disallow:" with empty value means allow everything
      if (value === "" && key === "disallow") continue;
      current.rules.push({ allow: key === "allow", path: value });
    } else if (key === "sitemap") {
      sitemaps.push(value);
    } else {
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

function patternToRegex(p: string): RegExp {
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

/** Pick the group for a bot: most specific matching user-agent token wins, else "*". */
function groupFor(robots: ParsedRobots, bot: string): { group: Group | null; name: string } {
  const b = bot.toLowerCase();
  let best: Group | null = null;
  let bestLen = -1;
  let bestName = "";
  for (const g of robots.groups) {
    for (const a of g.agents) {
      // RFC 9309: match on the crawler's product token (case-insensitive)
      if (a !== "*" && a === b && a.length > bestLen) {
        best = g;
        bestLen = a.length;
        bestName = a;
      }
    }
  }
  if (best) {
    // Merge all groups naming the same agent (RFC 9309)
    const rules = robots.groups.filter((g) => g.agents.includes(bestName)).flatMap((g) => g.rules);
    return { group: { agents: [bestName], rules }, name: bestName };
  }
  const star = robots.groups.filter((g) => g.agents.includes("*"));
  if (star.length) return { group: { agents: ["*"], rules: star.flatMap((g) => g.rules) }, name: "*" };
  return { group: null, name: "(none)" };
}

export function isAllowed(robots: ParsedRobots, bot: string, path: string): { allowed: boolean; group: string } {
  const { group, name } = groupFor(robots, bot);
  if (!group) return { allowed: true, group: name };
  let best: Rule | null = null;
  for (const r of group.rules) {
    if (!patternToRegex(r.path).test(path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return { allowed: best ? best.allow : true, group: name };
}

export const AI_BOTS: Omit<BotAccess, "allowed" | "matchedGroup">[] = [
  { bot: "Googlebot", owner: "Google", purpose: "classic-search" },
  { bot: "Bingbot", owner: "Microsoft (also powers Copilot & ChatGPT search partners)", purpose: "classic-search" },
  { bot: "OAI-SearchBot", owner: "OpenAI – ChatGPT search", purpose: "search" },
  { bot: "ChatGPT-User", owner: "OpenAI – user-triggered fetches", purpose: "user-fetch" },
  { bot: "GPTBot", owner: "OpenAI – model training", purpose: "training" },
  { bot: "Claude-SearchBot", owner: "Anthropic – Claude search", purpose: "search" },
  { bot: "Claude-User", owner: "Anthropic – user-triggered fetches", purpose: "user-fetch" },
  { bot: "ClaudeBot", owner: "Anthropic – model training", purpose: "training" },
  { bot: "PerplexityBot", owner: "Perplexity – search index", purpose: "search" },
  { bot: "Perplexity-User", owner: "Perplexity – user-triggered fetches", purpose: "user-fetch" },
  { bot: "Google-Extended", owner: "Google – Gemini training/grounding control", purpose: "training" },
  { bot: "Applebot-Extended", owner: "Apple – AI training control", purpose: "training" },
  { bot: "Applebot", owner: "Apple – Siri/Spotlight search", purpose: "search" },
  { bot: "DuckAssistBot", owner: "DuckDuckGo – AI answers", purpose: "search" },
  { bot: "Meta-ExternalAgent", owner: "Meta – AI training", purpose: "training" },
  { bot: "Amazonbot", owner: "Amazon – Alexa/AI", purpose: "search" },
  { bot: "CCBot", owner: "Common Crawl – dataset used by many LLMs", purpose: "training" },
  { bot: "Bytespider", owner: "ByteDance – AI training", purpose: "training" },
  { bot: "MistralAI-User", owner: "Mistral – Le Chat user fetches", purpose: "user-fetch" },
];

export function botAccess(robots: ParsedRobots | null, path: string): BotAccess[] {
  return AI_BOTS.map((b) => {
    if (!robots) return { ...b, allowed: true, matchedGroup: "(no robots.txt)" };
    const r = isAllowed(robots, b.bot, path);
    return { ...b, allowed: r.allowed, matchedGroup: r.group };
  });
}
