import { analyze } from "./analyze";
import { parseRobots } from "./robots";
import { renderWithBrowser } from "./render";
import { assertPublicUrl, safeFetch, BOT_NAME } from "./safeFetch";
import { agentReadiness, linkPreview, type ToolCheck } from "./gen/pageTools";
import { a11yReport } from "./gen/a11y";
import { jsonLdBlocks, schemaImageUrls } from "./schemaValidate";
import type { AuditResult, Category, Check, FetchedResource } from "./types";

export interface SitemapInfo {
  url: string;
  found: boolean;
  urlCount: number;
  isIndex: boolean;
  urls: string[];
  error?: string;
}

/** Site-wide resources fetched once per origin and reused for every page. */
/** Shown instead of a score when a site answers with an error page. */
export const httpErrorMessage = (status: number) =>
  `This site answered with HTTP ${status}, so we couldn't read it. If it's your site, check that your host or firewall isn't blocking our crawler, then try again.`;

export interface SiteContext {
  origin: string;
  robots: FetchedResource | null;
  llms: FetchedResource | null;
  llmsFull: FetchedResource | null;
  sitemap: SitemapInfo;
}

const locs = (xml: string) =>
  [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

async function findSitemap(origin: string, robots: FetchedResource | null): Promise<SitemapInfo> {
  const candidates: string[] = [];
  if (robots?.ok) candidates.push(...parseRobots(robots.body).sitemaps.slice(0, 3));
  candidates.push(`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`);
  let lastError: string | undefined;
  for (const url of [...new Set(candidates)]) {
    const r = await safeFetch(url, { timeoutMs: 8000, accept: "application/xml,text/xml,*/*" });
    if (!r.ok) {
      lastError = r.error ?? `HTTP ${r.status}`;
      continue;
    }
    const isIndex = /<sitemapindex/i.test(r.body);
    const isSet = /<urlset/i.test(r.body);
    if (!isIndex && !isSet) {
      lastError = "not a valid XML sitemap";
      continue;
    }
    const entries = locs(r.body);
    let urls: string[] = isIndex ? [] : entries;
    if (isIndex) {
      // Pull page URLs from the first few child sitemaps
      for (const child of entries.slice(0, 3)) {
        const c = await safeFetch(child, { timeoutMs: 8000, accept: "application/xml,text/xml,*/*" });
        if (c.ok) urls.push(...locs(c.body));
        if (urls.length > 2000) break;
      }
    }
    urls = urls.slice(0, 2000);
    return { url: r.url, found: true, urlCount: entries.length, isIndex, urls };
  }
  return { url: `${origin}/sitemap.xml`, found: false, urlCount: 0, isIndex: false, urls: [], error: lastError };
}

export async function loadSiteContext(origin: string): Promise<SiteContext> {
  const textOpts = { timeoutMs: 8000, accept: "text/plain,text/markdown,*/*" };
  const [robots, llms, llmsFull] = await Promise.all([
    safeFetch(`${origin}/robots.txt`, textOpts),
    safeFetch(`${origin}/llms.txt`, textOpts),
    safeFetch(`${origin}/llms-full.txt`, { ...textOpts, timeoutMs: 6000 }),
  ]);
  const sitemap = await findSitemap(origin, robots);
  return { origin, robots, llms, llmsFull, sitemap };
}

export class BotBlockedError extends Error {}

const CHALLENGE_TITLE = /^(client challenge|just a moment\.*|attention required!? \| cloudflare|access denied|ddos-guard|checking your browser.*|security check|captcha|please wait\.*|one more step)$/i;

/** Detect bot-protection / challenge pages (Cloudflare, Akamai, Fastly, Sucuri...). */
export function isChallenge(page: FetchedResource): boolean {
  const title = (page.body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  if (CHALLENGE_TITLE.test(title)) return true;
  if ((page.status === 403 || page.status === 429 || page.status === 503) &&
      /cf-chl|challenge-platform|_Incapsula_|sucuri|captcha|px-captcha|akamai/i.test(page.body.slice(0, 20000))) return true;
  return false;
}

export async function fetchPage(rawUrl: string, opts: { render?: boolean } = {}): Promise<FetchedResource> {
  const url = await assertPublicUrl(rawUrl);
  let page = await safeFetch(url.toString());
  if (page.status === 0) throw new Error(`Couldn't load ${url.hostname}: ${page.error ?? "unknown error"}`);
  if (!/html/i.test(page.headers["content-type"] ?? "text/html"))
    throw new Error(`That URL returned ${page.headers["content-type"]}, not an HTML page.`);
  if (opts.render) page = await renderWithBrowser(page);
  if (isChallenge(page))
    throw new BotBlockedError(`${url.hostname} showed a bot-protection challenge instead of the page. Allow our crawler (user-agent "${BOT_NAME}") in your firewall/CDN, or try again later.`);
  return page;
}

/** Checks from the free page tools that the main audit doesn't already cover. */
const EXTRA: { from: "agent" | "preview" | "a11y"; title: string; id: string; category: Category; group: string; weight: 1 | 2 | 3 }[] = [
  { from: "agent", title: "Page landmarks", id: "agent-landmarks", category: "geo", group: "AI agents", weight: 2 },
  { from: "agent", title: "Form labels", id: "agent-form-labels", category: "geo", group: "AI agents", weight: 2 },
  { from: "agent", title: "Button names", id: "agent-button-names", category: "geo", group: "AI agents", weight: 1 },
  { from: "agent", title: "Link text", id: "agent-link-text", category: "geo", group: "AI agents", weight: 1 },
  { from: "a11y", title: "Zoom allowed", id: "a11y-zoom", category: "seo", group: "Accessibility (WCAG)", weight: 2 },
  { from: "a11y", title: "Main landmark and skip link", id: "a11y-landmarks", category: "seo", group: "Accessibility (WCAG)", weight: 1 },
  { from: "a11y", title: "Frame titles", id: "a11y-frames", category: "seo", group: "Accessibility (WCAG)", weight: 1 },
  { from: "a11y", title: "ARIA and keyboard order", id: "a11y-aria", category: "seo", group: "Accessibility (WCAG)", weight: 1 },
  { from: "a11y", title: "Media", id: "a11y-media", category: "seo", group: "Accessibility (WCAG)", weight: 1 },
  { from: "preview", title: "Share image", id: "share-image", category: "seo", group: "Social & rich results", weight: 1 },
];

export function extraChecks(html: string, pageUrl: string): Check[] {
  let agent: ToolCheck[] = [];
  let preview: ToolCheck[] = [];
  let a11y: ToolCheck[] = [];
  try {
    a11y = a11yReport(html).checks;
    agent = agentReadiness(html).checks;
    preview = linkPreview(html, pageUrl).checks;
  } catch {
    return [];
  }
  const out: Check[] = [];
  for (const e of EXTRA) {
    const c = (e.from === "agent" ? agent : e.from === "a11y" ? a11y : preview).find((x) => x.title === e.title);
    if (c) out.push({ id: e.id, category: e.category, group: e.group, title: e.title, status: c.status, detail: c.detail, fix: c.fix, weight: e.weight });
  }
  return out;
}

/**
 * Images and logos named in the schema that don't exist. Only a clear 404 or 410 counts: a 403 or
 * timeout is usually our crawler being turned away. Returns a check only when something is broken.
 */
export async function brokenSchemaImages(page: FetchedResource): Promise<Check[]> {
  try {
    const urls = schemaImageUrls(jsonLdBlocks(page.body), page.url);
    const results = await Promise.all(urls.map((u) => safeFetch(u, { timeoutMs: 6000, accept: "image/*,*/*;q=0.8", headersOnly: true })));
    const missing = results.map((r, i) => ({ url: urls[i], status: r.status })).filter((r) => r.status === 404 || r.status === 410);
    if (!missing.length) return [];
    return [{
      id: "schema-images", category: "seo", group: "Social & rich results", title: "Schema images exist", status: "warn", weight: 1,
      detail: `Structured data points to images that don't exist: ${missing.map((m) => `${m.url} (${m.status})`).join(", ")}.`,
      fix: "Upload the missing files or point the schema at images that exist, so the page stays eligible for image-based results.",
    }];
  } catch {
    return [];
  }
}

export function auditFetched(requestedUrl: string, page: FetchedResource, ctx: SiteContext, networkChecks: Check[] = []): AuditResult {
  return analyze({
    extraChecks: [...extraChecks(page.body, page.url), ...networkChecks],
    requestedUrl,
    page,
    robots: ctx.robots,
    sitemap: ctx.sitemap,
    llms: ctx.llms,
    llmsFull: ctx.llmsFull,
  });
}

/** Full single-page audit (used by the quick check). */
export async function runAudit(rawUrl: string, opts: { render?: boolean } = {}): Promise<AuditResult> {
  const page = await fetchPage(rawUrl, opts);
  if (page.status >= 400) throw new Error(httpErrorMessage(page.status));
  const [ctx, networkChecks] = await Promise.all([loadSiteContext(new URL(page.url).origin), brokenSchemaImages(page)]);
  return auditFetched(page.url, page, ctx, networkChecks);
}
