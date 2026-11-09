/**
 * AI bot access test: fetch a page as a normal browser and as each AI crawler,
 * then compare. Catches firewall and CDN rules (for example Cloudflare's default
 * AI-bot blocking) that block crawlers even when robots.txt allows them.
 *
 * Limits: we send each crawler's user-agent from our own server. Some firewalls
 * also check that a "GPTBot" request really comes from OpenAI's IP ranges, so a
 * block here can also mean "your firewall blocks bots that pretend to be GPTBot".
 * The UI says so and tells people where to confirm.
 */
import type { FetchedResource } from "./types";
import { safeFetch } from "./safeFetch";
import { isChallenge } from "./audit";
import { botAccess, parseRobots } from "./robots";

export type LiveStatus = "ok" | "blocked" | "challenge" | "different" | "error";

export interface BotTestRow {
  bot: string;
  owner: string;
  purpose: "search" | "user-fetch" | "training" | "classic-search" | "browser";
  /** robots.txt verdict for this path (null for the browser row). */
  robotsAllowed: boolean | null;
  live: LiveStatus;
  status: number;
  words: number;
  ms: number;
  note: string;
}

export interface BotTestResult {
  url: string;
  testedAt: string;
  robotsTxtFound: boolean;
  rows: BotTestRow[];
  summary: { tested: number; blocked: number; conflicts: number; verdict: "good" | "warn" | "bad"; text: string };
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

/** User-agent strings as each company documents them (token is what firewalls match on). */
export const TEST_BOTS: { bot: string; ua: string }[] = [
  { bot: "Googlebot", ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
  { bot: "Bingbot", ua: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" },
  { bot: "OAI-SearchBot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot" },
  { bot: "ChatGPT-User", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot" },
  { bot: "GPTBot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot" },
  { bot: "Claude-SearchBot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)" },
  { bot: "Claude-User", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +https://www.anthropic.com)" },
  { bot: "ClaudeBot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)" },
  { bot: "PerplexityBot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" },
  { bot: "Perplexity-User", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)" },
  { bot: "Applebot", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)" },
  { bot: "Meta-ExternalAgent", ua: "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)" },
  { bot: "CCBot", ua: "CCBot/2.0 (https://commoncrawl.org/faq/)" },
];

const textWords = (html: string) =>
  (html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").match(/[\p{L}\p{N}]+/gu) || []).length;

/** Classify one crawler fetch against the browser fetch. Exported for tests. */
export function classify(page: FetchedResource, browser: FetchedResource): { live: LiveStatus; note: string } {
  if (page.status === 0) return { live: "error", note: page.error ?? "Request failed" };
  if (isChallenge(page)) return { live: "challenge", note: "Got a bot challenge page instead of the content" };
  if (page.status === 401 || page.status === 403) return { live: "blocked", note: `Refused with HTTP ${page.status}` };
  if (page.status === 429 || page.status === 503) return { live: "blocked", note: `Turned away with HTTP ${page.status}` };
  if (page.status >= 400) return { live: "blocked", note: `HTTP ${page.status}` };
  const bw = textWords(browser.body), w = textWords(page.body);
  if (browser.status < 400 && bw >= 100 && w < bw * 0.4)
    return { live: "different", note: `Got much less text than a browser (${w} vs ${bw} words)` };
  return { live: "ok", note: "Same page as a browser" };
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

export async function runBotTest(url: string): Promise<BotTestResult> {
  const u = new URL(url);
  const [browser, robotsRes] = await Promise.all([
    safeFetch(u.toString(), { userAgent: BROWSER_UA, timeoutMs: 12000 }),
    safeFetch(`${u.origin}/robots.txt`, { accept: "text/plain,*/*", timeoutMs: 8000 }),
  ]);
  if (browser.status === 0) throw new Error(`Couldn't load ${u.hostname}: ${browser.error ?? "unknown error"}`);
  const robotsFound = robotsRes.status === 200 && !/<html/i.test(robotsRes.body.slice(0, 500));
  const robots = robotsFound ? parseRobots(robotsRes.body) : null;
  const rules = new Map(botAccess(robots, u.pathname || "/").map((b) => [b.bot.toLowerCase(), b]));

  const fetched = await pool(TEST_BOTS, 4, (b) => safeFetch(u.toString(), { userAgent: b.ua, timeoutMs: 10000 }));
  const rows: BotTestRow[] = [
    { bot: "Browser (Chrome)", owner: "A normal visitor", purpose: "browser", robotsAllowed: null, live: browser.status < 400 ? "ok" : "blocked",
      status: browser.status, words: textWords(browser.body), ms: browser.ms, note: browser.status < 400 ? "Baseline" : `HTTP ${browser.status}` },
    ...TEST_BOTS.map((b, i) => {
      const r = rules.get(b.bot.toLowerCase());
      const c = classify(fetched[i], browser);
      return {
        bot: b.bot,
        owner: r?.owner ?? "",
        purpose: (r?.purpose ?? "search") as BotTestRow["purpose"],
        robotsAllowed: r ? r.allowed : true,
        live: c.live,
        status: fetched[i].status,
        words: textWords(fetched[i].body),
        ms: fetched[i].ms,
        note: c.note,
      };
    }),
  ];

  const bots = rows.slice(1);
  const notOk = bots.filter((r) => r.live !== "ok" && r.live !== "error");
  const conflicts = bots.filter((r) => r.robotsAllowed && (r.live === "blocked" || r.live === "challenge")).length;
  const keyBots = new Set(["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User"]);
  const keyBlocked = notOk.filter((r) => keyBots.has(r.bot)).length;
  const verdict = keyBlocked > 0 ? "bad" : notOk.length > 0 ? "warn" : "good";
  const text =
    verdict === "good"
      ? "Every crawler we tested got the same page as a browser."
      : verdict === "bad"
        ? `${keyBlocked} search or AI assistant crawler${keyBlocked === 1 ? " was" : "s were"} blocked or served a different page, so ${keyBlocked === 1 ? "it" : "they"} can't read or cite you.`
        : `${notOk.length} training crawler${notOk.length === 1 ? " was" : "s were"} blocked. That only affects AI training, not search or citations.`;

  return { url: u.toString(), testedAt: new Date().toISOString(), robotsTxtFound: robotsFound, rows, summary: { tested: bots.length, blocked: notOk.length, conflicts, verdict, text } };
}
