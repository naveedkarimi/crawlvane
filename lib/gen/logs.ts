/**
 * Server log analysis for AI crawlers and AI referrals. Runs in the browser: the log never
 * leaves the visitor's computer. Reads Apache/nginx "combined" logs and most formats that
 * keep the request line and user agent in quotes (Cloudflare, Caddy and JSON lines work if
 * they include those fields).
 */
import { AI_BOTS } from "../robots";
import { AI_SOURCES } from "./aiReferrers";

// Robots.txt-only tokens never appear in a user agent.
const ROBOTS_ONLY = new Set(["Google-Extended", "Applebot-Extended"]);
// Longest names first so "Claude-SearchBot" wins over "ClaudeBot" style overlaps.
const BOTS = AI_BOTS.filter((b) => !ROBOTS_ONLY.has(b.bot)).sort((a, b) => b.bot.length - a.bot.length);

export interface LogLine { ip: string; time: string; method: string; path: string; status: number; referer: string; ua: string }

const COMBINED = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) \S+(?: "([^"]*)" "([^"]*)")?/;

export function parseLogLine(line: string): LogLine | null {
  const m = line.match(COMBINED);
  if (m) return { ip: m[1], time: m[2], method: m[3], path: m[4], status: Number(m[5]), referer: m[6] ?? "", ua: m[7] ?? "" };
  // JSON lines (Cloudflare Logpush, Caddy, custom)
  if (line.startsWith("{")) {
    try {
      const j = JSON.parse(line);
      const g = (...k: string[]) => k.map((x) => x.split(".").reduce((o: any, p) => o?.[p], j)).find((v) => v !== undefined && v !== null);
      const path = g("ClientRequestURI", "request.uri", "uri", "path", "url");
      const ua = g("ClientRequestUserAgent", "request.headers.User-Agent.0", "user_agent", "userAgent", "ua");
      if (!path && !ua) return null;
      return {
        ip: String(g("ClientIP", "request.remote_ip", "remote_addr", "ip") ?? ""),
        time: String(g("EdgeStartTimestamp", "ts", "time", "timestamp") ?? ""),
        method: String(g("ClientRequestMethod", "request.method", "method") ?? "GET"),
        path: String(path ?? ""),
        status: Number(g("EdgeResponseStatus", "status", "status_code") ?? 0),
        referer: String(g("ClientRequestReferer", "request.headers.Referer.0", "referer", "referrer") ?? ""),
        ua: String(ua ?? ""),
      };
    } catch {
      return null;
    }
  }
  // Last resort: the request line and the final quoted string (usually the user agent)
  const req = line.match(/"(GET|HEAD|POST|PUT|OPTIONS) (\S+)[^"]*" (\d{3})/);
  if (!req) return null;
  const quoted = [...line.matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  return { ip: line.split(/\s/)[0], time: line.match(/\[([^\]]+)\]/)?.[1] ?? "", method: req[1], path: req[2], status: Number(req[3]), referer: quoted.length >= 3 ? quoted[quoted.length - 2] : "", ua: quoted[quoted.length - 1] ?? "" };
}

export function botFor(ua: string) {
  const l = ua.toLowerCase();
  return BOTS.find((b) => l.includes(b.bot.toLowerCase())) ?? null;
}

const refHost = (r: string) => {
  try {
    return new URL(r).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
export function aiSourceFor(referer: string) {
  const h = refHost(referer);
  if (!h) return null;
  return AI_SOURCES.find((s) => s.hosts.some((x) => h === x || h.endsWith("." + x))) ?? null;
}

export interface BotStat { bot: string; owner: string; purpose: string; hits: number; pages: number; errors: number; blocked: number; first: string; last: string; topPaths: [string, number][] }
export interface LogReport {
  lines: number;
  parsed: number;
  bots: BotStat[];
  referrals: { source: string; visits: number; topPaths: [string, number][] }[];
  topPaths: [string, number][];
  statuses: Record<string, number>;
}

const top = (m: Map<string, number>, n = 8) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const ASSET = /\.(css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|map|mp4|webm)(\?|$)/i;

export function analyzeLogs(text: string, maxLines = 1_000_000): LogReport {
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, maxLines);
  const bots = new Map<string, { s: BotStat; paths: Map<string, number> }>();
  const refs = new Map<string, { visits: number; paths: Map<string, number> }>();
  const allPaths = new Map<string, number>();
  const statuses: Record<string, number> = {};
  let parsed = 0;
  for (const raw of lines) {
    const l = parseLogLine(raw);
    if (!l) continue;
    parsed++;
    const path = l.path.split("#")[0];
    const bot = botFor(l.ua);
    if (bot) {
      const e = bots.get(bot.bot) ?? { s: { bot: bot.bot, owner: bot.owner, purpose: bot.purpose, hits: 0, pages: 0, errors: 0, blocked: 0, first: l.time, last: l.time, topPaths: [] }, paths: new Map() };
      e.s.hits++;
      if (l.status >= 400) e.s.errors++;
      if (l.status === 403 || l.status === 429) e.s.blocked++;
      e.s.last = l.time || e.s.last;
      if (!ASSET.test(path)) {
        e.s.pages++;
        e.paths.set(path, (e.paths.get(path) ?? 0) + 1);
        allPaths.set(path, (allPaths.get(path) ?? 0) + 1);
      }
      const k = String(Math.floor(l.status / 100)) + "xx";
      statuses[k] = (statuses[k] ?? 0) + 1;
      bots.set(bot.bot, e);
      continue;
    }
    const src = aiSourceFor(l.referer);
    if (src && !ASSET.test(path)) {
      const r = refs.get(src.name) ?? { visits: 0, paths: new Map() };
      r.visits++;
      r.paths.set(path, (r.paths.get(path) ?? 0) + 1);
      refs.set(src.name, r);
    }
  }
  return {
    lines: lines.length,
    parsed,
    bots: [...bots.values()].map(({ s, paths }) => ({ ...s, topPaths: top(paths, 5) })).sort((a, b) => b.hits - a.hits),
    referrals: [...refs.entries()].map(([source, r]) => ({ source, visits: r.visits, topPaths: top(r.paths, 5) })).sort((a, b) => b.visits - a.visits),
    topPaths: top(allPaths, 10),
    statuses,
  };
}
