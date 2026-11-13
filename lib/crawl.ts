import { createHash } from "node:crypto";
import { suggestLinks } from "./linkSuggest";
import { diagnose } from "./siteDiagnostics";
import * as cheerio from "cheerio";
import { BotBlockedError, auditFetched, fetchPage, type SiteContext } from "./audit";
import type { AuditResult, Check } from "./types";
import type { IssueGroup, PageSummary, SiteAudit } from "./reportTypes";

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|zip|gz|rar|mp4|mp3|mov|avi|webm|woff2?|ttf|eot|css|js|json|xml|txt|docx?|xlsx?|pptx?|csv)$/i;

/** Checks that describe the whole site; reported once (from the homepage), not per page. */
export const SITE_LEVEL = new Set([
  "robots-txt", "sitemap", "sitemap-in-robots", "llms-txt", "llms-full", "ai-search-bots", "ai-user-bots",
  "ai-training-bots", "bing-access", "hsts", "brand-consistency", "https", "entity-schema", "trust-pages", "compression",
  "app-aasa", "app-assetlinks",
]);

export function normalizeUrl(u: string, base?: string): string | null {
  try {
    const url = new URL(u, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    // Drop common tracking params
    for (const p of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|ref$)/i.test(p)) url.searchParams.delete(p);
    let s = url.toString();
    if (url.pathname !== "/" && s.endsWith("/") && !url.search) s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

const sameSite = (a: string, b: string) =>
  new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");

export function extractInternalLinks(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $("a[href]").each((_, a) => {
    const rel = ($(a).attr("rel") ?? "").toLowerCase();
    if (rel.includes("nofollow")) return;
    const n = normalizeUrl($(a).attr("href") ?? "", pageUrl);
    if (!n || !sameSite(n, pageUrl) || SKIP_EXT.test(new URL(n).pathname)) return;
    out.add(n);
  });
  return [...out];
}

function summarize(r: AuditResult, depth: number, inlinks: number): PageSummary {
  const perPage = r.checks.filter((c) => !SITE_LEVEL.has(c.id));
  return {
    url: r.facts.finalUrl,
    status: r.facts.status,
    depth,
    ms: r.facts.responseMs,
    title: r.facts.title,
    description: r.facts.metaDescription,
    h1: r.facts.h1[0] ?? "",
    wordCount: r.facts.wordCount,
    noindex: r.checks.some((c) => c.id === "indexable" && c.status === "fail"),
    canonical: r.facts.canonical,
    scores: r.scores,
    fails: perPage.filter((c) => c.status === "fail").map((c) => c.id),
    warns: perPage.filter((c) => c.status === "warn").map((c) => c.id),
    inlinks,
    // A short fingerprint of the page's main text, to spot exact duplicates without storing the text.
    textKey: r.facts.textExcerpt && r.facts.wordCount >= 30 ? createHash("sha1").update(r.facts.textExcerpt.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16) : undefined,
  };
}

export interface CrawlOptions {
  maxPages: number;
  concurrency: number;
  /** Pause before each page. */
  delayMs?: number;
  render?: boolean;
  /** `note` says what happened to this page. */
  onProgress?: (done: number, total: number, url: string, note: string) => void | Promise<void>;
}

/**
 * Crawl a site breadth-first, seeded from the start URL and the sitemap.
 * Returns per-page audits (checks kept only in memory) and summaries.
 */
export async function crawlSite(startUrl: string, ctx: SiteContext, home: AuditResult, homeHtml: string, opts: CrawlOptions) {
  const start = normalizeUrl(home.facts.finalUrl)!;
  const seen = new Map<string, number>(); // url -> depth
  const inlinks = new Map<string, Set<string>>(); // target -> sources
  const queue: string[] = [];
  const results = new Map<string, { audit?: AuditResult; status: number; error?: string; redirectedTo?: string; depth: number; blocked?: boolean }>();
  /** Found but not web pages (PDFs, feeds…), for the coverage summary. */
  const skipped: string[] = [];

  const enqueue = (u: string, depth: number, from?: string) => {
    if (from) {
      if (!inlinks.has(u)) inlinks.set(u, new Set());
      inlinks.get(u)!.add(from);
    }
    if (seen.has(u)) return;
    seen.set(u, depth);
    queue.push(u);
  };

  seen.set(start, 0);
  results.set(start, { audit: home, status: home.facts.status, depth: 0 });
  for (const l of extractInternalLinks(homeHtml, start)) enqueue(l, 1, start);
  for (const s of ctx.sitemap.urls) {
    const n = normalizeUrl(s);
    if (n && sameSite(n, start) && !SKIP_EXT.test(new URL(n).pathname)) enqueue(n, seen.get(n) ?? 9);
  }

  let fetched = 1;
  let finished = 1;
  const target = () => Math.min(opts.maxPages, seen.size);

  const worker = async () => {
    while (queue.length && fetched < opts.maxPages) {
      const url = queue.shift()!;
      fetched++;
      const depth = seen.get(url) ?? 9;
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      let note: string;
      try {
        const page = await fetchPage(url, { render: opts.render });
        const finalN = normalizeUrl(page.url) ?? page.url;
        const audit = auditFetched(page.url, page, ctx);
        const problems = audit.checks.filter((c) => c.status === "fail" && !SITE_LEVEL.has(c.id)).length;
        note = page.status >= 400 ? `HTTP ${page.status}` : problems ? `${problems} problem${problems === 1 ? "" : "s"}` : "no problems";
        results.set(url, {
          audit,
          status: page.status,
          depth,
          redirectedTo: finalN !== url ? finalN : undefined,
        });
        if (page.status < 400 && sameSite(page.url, start)) {
          for (const l of extractInternalLinks(page.body, page.url)) enqueue(l, depth + 1, url);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (e instanceof BotBlockedError) {
          results.set(url, { status: 0, depth, error: "Blocked by bot protection", blocked: true });
          await opts.onProgress?.(++finished, target(), url, "blocked by bot protection");
          continue;
        }
        if (/not an HTML page/.test(msg)) {
          skipped.push(url);
          await opts.onProgress?.(++finished, target(), url, "skipped, not a web page");
          continue; // PDFs, feeds etc. aren't broken, just not pages
        }
        const status = Number(msg.match(/\b([45]\d\d)\b/)?.[1] ?? 0);
        results.set(url, { status, depth, error: msg });
        note = status ? `HTTP ${status}` : "couldn't load";
      }
      await opts.onProgress?.(++finished, target(), url, note);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));

  return { results, inlinks, discovered: seen.size, start, seen, skipped };
}

function groupIssues(audits: AuditResult[], home: AuditResult): IssueGroup[] {
  const map = new Map<string, IssueGroup>();
  const addCheck = (c: Check, url: string) => {
    if (c.status === "pass" || c.status === "info") return;
    const g = map.get(c.id) ?? {
      id: c.id,
      category: c.category,
      title: c.title,
      status: c.status,
      weight: c.weight,
      fix: c.fix,
      count: 0,
      examples: [],
      sample: c.detail,
    };
    g.count++;
    if (c.status === "fail") g.status = "fail";
    if (g.examples.length < 5) g.examples.push(url);
    map.set(c.id, g);
  };
  for (const c of home.checks) if (SITE_LEVEL.has(c.id)) addCheck(c, home.facts.finalUrl);
  for (const a of audits) for (const c of a.checks) if (!SITE_LEVEL.has(c.id)) addCheck(c, a.facts.finalUrl);
  return [...map.values()];
}

/** Turn crawl results into a site audit with site-level issues. */
export function buildSiteAudit(
  crawl: Awaited<ReturnType<typeof crawlSite>>,
  ctx: SiteContext,
  home: AuditResult,
): SiteAudit {
  const { results, inlinks } = crawl;
  const audits: AuditResult[] = [];
  const pages: PageSummary[] = [];
  const broken: { url: string; status: number; from: string[] }[] = [];
  const redirecting: { url: string; to: string; from: string[] }[] = [];
  const blocked: string[] = [];

  for (const [url, r] of results) {
    const from = [...(inlinks.get(url) ?? [])];
    if (r.audit) {
      audits.push(r.audit);
      pages.push(summarize(r.audit, r.depth, from.length));
      if (r.audit.facts.status >= 400) broken.push({ url, status: r.audit.facts.status, from });
      if (r.redirectedTo && from.length) redirecting.push({ url, to: r.redirectedTo, from });
    } else if (r.blocked) {
      blocked.push(url);
    } else {
      pages.push({
        url, status: r.status, depth: r.depth, ms: 0, title: "", description: "", h1: "", wordCount: 0, noindex: false,
        canonical: "", scores: { overall: 0, seo: 0, aeo: 0, geo: 0 }, fails: [], warns: [], inlinks: from.length, error: r.error,
      });
      if (from.length) broken.push({ url, status: r.status, from });
    }
  }

  const issues = groupIssues(audits, home);
  const site = (id: string, title: string, status: "fail" | "warn", weight: number, examples: string[], count: number, sample: string, fix: string) =>
    count > 0 && issues.push({ id, category: "site", title, status, weight, fix, count, examples: examples.slice(0, 5), sample });

  // Duplicate titles / descriptions among indexable 200 pages
  const ok = pages.filter((p) => p.status === 200 && !p.noindex);
  const dupes = (key: "title" | "description") => {
    const m = new Map<string, string[]>();
    for (const p of ok) if (p[key]) m.set(p[key].toLowerCase(), [...(m.get(p[key].toLowerCase()) ?? []), p.url]);
    return [...m.entries()].filter(([, v]) => v.length > 1);
  };
  const dt = dupes("title");
  site("dup-titles", "Duplicate titles", "warn", 2, dt.flatMap(([, v]) => v), dt.reduce((n, [, v]) => n + v.length, 0),
    dt.length ? `${dt.length} title(s) shared by multiple pages, e.g. "${dt[0][0].slice(0, 70)}"` : "",
    "Give every indexable page a unique title that describes that page specifically.");
  const dd = dupes("description");
  site("dup-descriptions", "Duplicate meta descriptions", "warn", 1, dd.flatMap(([, v]) => v), dd.reduce((n, [, v]) => n + v.length, 0),
    dd.length ? `${dd.length} description(s) reused across pages.` : "",
    "Write a unique meta description per page, or leave it empty rather than duplicating.");

  site("crawl-blocked", "Pages blocked by bot protection", "warn", 1, blocked, blocked.length,
    `${blocked.length} page(s) returned a firewall/CDN challenge to our crawler, so they weren't audited. AI crawlers may be challenged too.`,
    "Make sure your firewall/CDN (e.g. Cloudflare bot fight mode) doesn't challenge legitimate crawlers like Googlebot, Bingbot, OAI-SearchBot and Claude-SearchBot.");
  site("broken-links", "Broken internal links", "fail", 3, broken.map((b) => `${b.url} (${b.status || "error"}) ← ${b.from[0] ?? "sitemap"}`), broken.length,
    `${broken.length} internal URL(s) return an error.`, "Fix or remove links to these URLs, or 301-redirect them to the closest live page.");
  site("internal-redirects", "Internal links that redirect", "warn", 1, redirecting.map((r) => `${r.url} → ${r.to}`), redirecting.length,
    `${redirecting.length} internal link target(s) redirect.`, "Update internal links to point straight at the final URL.");

  const noindexed = ok.length ? pages.filter((p) => p.noindex) : [];
  site("noindex-pages", "Pages set to noindex", "warn", 1, noindexed.map((p) => p.url), noindexed.length,
    `${noindexed.length} crawled page(s) are noindex. Fine for thank-you/login pages; a problem for content pages.`,
    "Check each one is meant to be hidden from search.");

  const thin = ok.filter((p) => p.wordCount < 200);
  site("thin-pages", "Thin pages (<200 words)", "warn", 2, thin.map((p) => `${p.url} (${p.wordCount} words)`), thin.length,
    `${thin.length} of ${ok.length} indexable pages have under 200 words.`, "Expand, merge or noindex thin pages so your site's overall quality signal stays high.");

  const deep = ok.filter((p) => p.depth > 3 && p.depth < 9);
  site("deep-pages", "Pages more than 3 clicks deep", "warn", 1, deep.map((p) => `${p.url} (depth ${p.depth})`), deep.length,
    `${deep.length} page(s) need 4+ clicks from the homepage.`, "Link important pages from the homepage, nav or hub pages.");

  const orphans = ok.filter((p) => p.depth === 9 && p.inlinks === 0);
  site("orphan-pages", "Orphan pages (only in sitemap)", "warn", 2, orphans.map((p) => p.url), orphans.length,
    `${orphans.length} sitemap page(s) had no internal links pointing to them in the crawl.`, "Add internal links to these pages from related content.");

  if (ctx.sitemap.found) {
    const inMap = new Set(ctx.sitemap.urls.map((u) => normalizeUrl(u)));
    const notInMap = ok.filter((p) => !inMap.has(normalizeUrl(p.url)) && !(p.canonical && normalizeUrl(p.canonical, p.url) !== normalizeUrl(p.url)));
    if (ctx.sitemap.urls.length)
      site("missing-from-sitemap", "Indexable pages missing from sitemap", "warn", 1, notInMap.map((p) => p.url), notInMap.length,
        `${notInMap.length} crawled page(s) aren't listed in the sitemap.`, "Generate the sitemap automatically from all canonical, indexable pages.");
    const badInMap = pages.filter((p) => inMap.has(normalizeUrl(p.url)) && (p.status >= 300 || p.noindex));
    site("bad-sitemap-urls", "Sitemap lists non-indexable URLs", "warn", 2, badInMap.map((p) => `${p.url} (${p.noindex ? "noindex" : p.status})`), badInMap.length,
      `${badInMap.length} sitemap URL(s) redirect, error or are noindex.`, "Only list final, 200, indexable canonical URLs in the sitemap.");
  }

  const slow = ok.filter((p) => p.ms > 1800);
  site("slow-pages", "Slow pages (>1.8 s HTML)", "warn", 2, slow.map((p) => `${p.url} (${p.ms} ms)`), slow.length,
    `${slow.length} page(s) took over 1.8 s to return HTML.`, "Add caching (page cache / CDN) and reduce server work on these templates.");

  // Order: fails first, then by weight × affected share
  const n = Math.max(1, audits.length);
  issues.sort((a, b) =>
    (a.status === "fail" ? 0 : 1) - (b.status === "fail" ? 0 : 1) ||
    b.weight * Math.min(1, b.count / n + (b.category === "site" ? 0.5 : 0)) - a.weight * Math.min(1, a.count / n + (a.category === "site" ? 0.5 : 0)),
  );

  // Site score: average page scores, with site-level checks weighed in via the homepage score
  const scored = audits.filter((a) => a.facts.status === 200);
  const avg = (k: "seo" | "aeo" | "geo") =>
    Math.round(scored.reduce((s, a) => s + a.scores[k], 0) / Math.max(1, scored.length));
  const penalty = Math.min(20, broken.length * 2 + (dt.length ? 3 : 0) + orphans.length * 0.5);
  const seo = Math.max(0, Math.round(avg("seo") * 0.7 + home.scores.seo * 0.3 - penalty));
  const aeo = avg("aeo");
  const geo = Math.round(avg("geo") * 0.5 + home.scores.geo * 0.5);

  pages.sort((a, b) => a.depth - b.depth || a.url.localeCompare(b.url));
  return {
    origin: ctx.origin,
    pagesCrawled: results.size - blocked.length,
    pagesDiscovered: crawl.discovered,
    scores: { overall: Math.round(seo * 0.45 + aeo * 0.25 + geo * 0.3), seo, aeo, geo },
    issues,
    pages,
    diagnostics: diagnose({
      seen: crawl.seen ? [...crawl.seen.entries()].map(([url, depth]) => ({ url, depth })) : [],
      skipped: crawl.skipped ?? [],
      results: [...results.entries()].map(([url, r]) => ({ url, status: r.status, error: r.error, blocked: r.blocked, redirectedTo: r.redirectedTo, depth: r.depth })),
      pages,
      inlinks,
    }),
    linkSuggestions: suggestLinks(audits.map((a) => ({
      url: a.facts.finalUrl || a.url, title: a.facts.title, h1: a.facts.h1?.[0] ?? "", description: a.facts.metaDescription,
      inlinks: inlinks.get(a.url)?.size ?? 0, noindex: a.checks.some((c) => c.id === "indexable" && c.status === "fail"), status: a.facts.status,
    })), inlinks),
  };
}
