import { fetchPage, loadSiteContext, auditFetched, httpErrorMessage } from "./audit";
import { generateFixes } from "./fixes";
import { buildLlmsForSite } from "./gen/llmsSite";
import type { GeneratedFix } from "./reportTypes";

/**
 * The fixes for one site, in a shape integrations can apply directly: the WordPress plugin, the
 * GitHub pull request and the Cloudflare Worker all use this.
 */
export interface FixBundle {
  url: string;
  origin: string;
  name: string;
  /** Full robots.txt, keeping the site's own rules and adding AI search access where it's blocked. */
  robotsTxt: string | null;
  /** llms.txt built from the homepage links and sitemap. */
  llmsTxt: string | null;
  /** <script type="application/ld+json"> blocks for the home page (Organization, WebSite). */
  schemaHtml: string | null;
  /** <title>, meta description and social tags, when the home page is missing them. */
  headTags: string | null;
  /** A sitemap, only when the site has none. */
  sitemapXml: string | null;
  fixes: GeneratedFix[];
}

export async function buildFixBundle(rawUrl: string): Promise<FixBundle> {
  const page = await fetchPage(rawUrl);
  if (page.status >= 400) throw new Error(httpErrorMessage(page.status));
  const origin = new URL(page.url).origin;
  const [ctx, llms] = await Promise.all([loadSiteContext(origin), buildLlmsForSite(origin + "/").catch(() => null)]);
  const home = auditFetched(page.url, page, ctx);
  const fixes = generateFixes(home, page.body, ctx, []).map((f) => (f.id === "llms" && llms?.generated ? { ...f, content: llms.generated } : f));
  const get = (id: string) => fixes.find((f) => f.id === id)?.content ?? null;
  return {
    url: home.url,
    origin,
    name: llms?.name || home.facts.title,
    robotsTxt: get("robots"),
    llmsTxt: llms?.generated ?? get("llms"),
    schemaHtml: get("schema"),
    headTags: get("head-tags"),
    sitemapXml: get("sitemap"),
    fixes,
  };
}
