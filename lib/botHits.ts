import { randomBytes } from "node:crypto";
import { db } from "./store";
import { AI_BOTS } from "./robots";
import { BRAND } from "./brand";

/**
 * Live AI bot visits. A small snippet on the customer's site (a Cloudflare Worker, or a few lines of
 * PHP or Node) spots AI crawlers by their user agent and tells us, with a secret per-site token.
 * We keep only a daily count per bot: no IP address, no page address, no user agent string.
 */
export class BotHitsError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Names that appear in real user agents. Google-Extended and Applebot-Extended are robots.txt-only tokens. */
export const TRACKED_BOTS = AI_BOTS.map((b) => b.bot).filter((b) => !/-Extended$/.test(b)).sort((a, b) => b.length - a.length);

/** Which tracked bot a user agent belongs to, or null. Longest names first, so "Claude-SearchBot" isn't read as a shorter one. */
export function matchBot(ua: unknown): string | null {
  if (typeof ua !== "string" || !ua || ua.length > 1000) return null;
  const low = ua.toLowerCase();
  return TRACKED_BOTS.find((b) => low.includes(b.toLowerCase())) ?? null;
}

export const isBotToken = (t: unknown): t is string => typeof t === "string" && /^[a-f0-9]{48}$/.test(t);
const makeToken = () => randomBytes(24).toString("hex");

/** One regex source the snippets use to decide which requests to report. */
export const botRegexSource = () => TRACKED_BOTS.map((b) => b.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|");

export function botSnippets(endpoint: string, token: string): { worker: string; php: string; node: string } {
  const re = botRegexSource();
  return {
    worker: `// ${BRAND.name}: count AI bot visits. Cloudflare → Workers & Pages → Create → paste → add a route for yourdomain.com/*.
// Only the bot's user agent is sent, never visitors' details. Every request is passed through unchanged.
const AI_BOTS = /${re}/i;
export default {
  async fetch(request, env, ctx) {
    const ua = request.headers.get("user-agent") || "";
    if (AI_BOTS.test(ua)) {
      ctx.waitUntil(fetch(${JSON.stringify(endpoint)}, {
        method: "POST",
        headers: { "content-type": "application/json", "x-bot-token": ${JSON.stringify(token)} },
        body: JSON.stringify({ ua }),
      }).catch(() => {}));
    }
    return fetch(request);
  },
};
`,
    php: `<?php
// ${BRAND.name}: count AI bot visits. Put this near the top of your theme's functions.php (WordPress) or a shared header file.
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
if (preg_match('/${re.replace(/'/g, "\\'")}/i', $ua)) {
  $ch = curl_init(${JSON.stringify(endpoint)});
  curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT_MS => 800,
    CURLOPT_HTTPHEADER => ['content-type: application/json', 'x-bot-token: ${token}'],
    CURLOPT_POSTFIELDS => json_encode(['ua' => $ua])]);
  curl_exec($ch);
  curl_close($ch);
}
`,
    node: `// ${BRAND.name}: count AI bot visits. Express middleware: app.use(countAiBots);
const AI_BOTS = /${re}/i;
function countAiBots(req, res, next) {
  const ua = req.get("user-agent") || "";
  if (AI_BOTS.test(ua)) {
    fetch(${JSON.stringify(endpoint)}, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bot-token": ${JSON.stringify(token)} },
      body: JSON.stringify({ ua }),
    }).catch(() => {});
  }
  next();
}
`,
  };
}

// ---------- Setup (signed in) ----------
async function siteRow(orgId: string, siteId: string): Promise<{ id: string; bot_token: string | null }> {
  const { data } = await db().from("sites").select("id, bot_token").eq("org_id", orgId).eq("id", siteId).maybeSingle();
  if (!data) throw new BotHitsError("Site not found.", 404);
  return data as { id: string; bot_token: string | null };
}

/** Makes the site's token (or a new one, which stops the old snippet counting). */
export async function botToken(orgId: string, siteId: string, rotate = false): Promise<string> {
  const s = await siteRow(orgId, siteId);
  if (s.bot_token && !rotate) return s.bot_token;
  const token = makeToken();
  const { error } = await db().from("sites").update({ bot_token: token }).eq("org_id", orgId).eq("id", siteId);
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return token;
}

export interface BotSummary {
  days: number;
  total: number;
  bots: { bot: string; owner: string; purpose: string; hits: number }[];
  /** Hits per day, oldest first, for a small chart. */
  daily: { day: string; hits: number }[];
  lastDay: string | null;
}

/** Adds up rows into totals per bot and a day-by-day series with zero days filled in. */
export function summariseBotHits(rows: { day: string; bot: string; hits: number }[], days: number, today = new Date()): BotSummary {
  const perBot = new Map<string, number>();
  const perDay = new Map<string, number>();
  for (const r of rows) {
    perBot.set(r.bot, (perBot.get(r.bot) ?? 0) + r.hits);
    perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.hits);
  }
  const daily: BotSummary["daily"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i)).toISOString().slice(0, 10);
    daily.push({ day, hits: perDay.get(day) ?? 0 });
  }
  const info = (b: string) => AI_BOTS.find((x) => x.bot === b);
  return {
    days,
    total: [...perBot.values()].reduce((a, b) => a + b, 0),
    bots: [...perBot.entries()].sort((a, b) => b[1] - a[1]).map(([bot, hits]) => ({ bot, owner: info(bot)?.owner ?? "", purpose: info(bot)?.purpose ?? "", hits })),
    daily,
    lastDay: rows.length ? rows.map((r) => r.day).sort().at(-1) ?? null : null,
  };
}

export async function botSummary(orgId: string, siteId: string, days = 30): Promise<BotSummary & { token: string | null }> {
  const s = await siteRow(orgId, siteId);
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const { data, error } = await db().from("bot_hits").select("day, bot, hits").eq("site_id", siteId).gte("day", since);
  if (error) throw new Error(`Database read failed: ${error.message}`);
  return { ...summariseBotHits((data ?? []) as { day: string; bot: string; hits: number }[], days), token: s.bot_token };
}

// ---------- Counting (from the customer's site) ----------
/** Counts one visit. Returns the bot it counted, or null when the token or user agent didn't match. */
export async function recordBotHit(token: unknown, ua: unknown): Promise<string | null> {
  if (!isBotToken(token)) throw new BotHitsError("Missing or unknown token.", 401);
  const bot = matchBot(ua);
  if (!bot) return null;
  const { data: site } = await db().from("sites").select("id").eq("bot_token", token).maybeSingle();
  if (!site) throw new BotHitsError("Missing or unknown token.", 401);
  const { error } = await db().rpc("add_bot_hit", { p_site: site.id, p_bot: bot });
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return bot;
}
