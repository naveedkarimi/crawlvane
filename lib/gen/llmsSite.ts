import * as cheerio from "cheerio";
import { fetchPage, loadSiteContext } from "../audit";
import { extractInternalLinks } from "../crawl";
import { siteName } from "../fixes";
import { safeFetch } from "../safeFetch";
import { buildLlmsTxt, UTILITY_PATH, validateLlmsTxt, type LlmsCheck, type LlmsPage } from "./llms";

export interface LlmsToolResult {
  origin: string;
  name: string;
  summary: string;
  pages: LlmsPage[];
  generated: string;
  existing: { found: boolean; url: string; body: string; checks: LlmsCheck[] };
}

const MAX_PAGES = 24;
const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|xml|txt|json|css|js)$/i;

function meta(html: string, url: string): LlmsPage | null {
  const $ = cheerio.load(html);
  const robots = ($('meta[name="robots" i]').attr("content") ?? "").toLowerCase();
  if (robots.includes("noindex")) return null;
  const title = ($("title").first().text() || $("h1").first().text()).replace(/\s+/g, " ").trim();
  if (!title) return null;
  const description = ($('meta[name="description" i]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "").trim();
  return { url, title, description };
}

/** Pick a site's key pages (homepage links first, then the sitemap), read their titles and build an llms.txt. */
export async function buildLlmsForSite(rawUrl: string): Promise<LlmsToolResult> {
  const home = await fetchPage(rawUrl);
  const origin = new URL(home.url).origin;
  const ctx = await loadSiteContext(origin);
  const $ = cheerio.load(home.body);
  const homeMeta = meta(home.body, home.url);
  const name = siteName($, homeMeta?.title ?? "", home.url);
  const summary = homeMeta?.description ?? "";

  const ok = (u: string) => {
    const p = new URL(u);
    return p.origin === origin && !SKIP_EXT.test(p.pathname) && !UTILITY_PATH.test(p.pathname + "/") && !p.search && p.toString() !== home.url;
  };
  // Homepage links are in navigation order, which is a good proxy for importance.
  const fromHome = extractInternalLinks(home.body, home.url).filter(ok);
  const fromSitemap = ctx.sitemap.urls.filter(ok).sort((a, b) => a.split("/").length - b.split("/").length || a.length - b.length);
  const candidates = [...new Set([...fromHome, ...fromSitemap])].slice(0, MAX_PAGES);

  const pages: LlmsPage[] = homeMeta ? [{ ...homeMeta, url: home.url }] : [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < candidates.length) {
        const u = candidates[next++];
        const r = await safeFetch(u, { timeoutMs: 6000 });
        if (r.status !== 200 || !/html/i.test(r.headers["content-type"] ?? "")) continue;
        const m = meta(r.body, r.url);
        if (m && !pages.some((p) => p.url === m.url)) pages.push(m);
      }
    }),
  );
  // Keep a stable order: homepage, then the order we found the links in.
  const order = [home.url, ...candidates];
  pages.sort((a, b) => (order.indexOf(a.url) + 1 || 999) - (order.indexOf(b.url) + 1 || 999));

  const llms = ctx.llms;
  const found = !!llms?.ok && !/^\s*<(!doctype|html)/i.test(llms.body);
  return {
    origin,
    name,
    summary,
    pages,
    generated: buildLlmsTxt({ name, summary, homeUrl: home.url, pages }),
    existing: {
      found,
      url: `${origin}/llms.txt`,
      body: found ? llms!.body.slice(0, 50_000) : "",
      checks: found ? validateLlmsTxt(llms!.body, origin) : [],
    },
  };
}
