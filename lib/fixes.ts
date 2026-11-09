import * as cheerio from "cheerio";
import { botAccess, parseRobots } from "./robots";
import type { SiteContext } from "./audit";
import type { AuditResult } from "./types";
import type { GeneratedFix, PageSummary } from "./reportTypes";
import { buildLlmsTxt, UTILITY_PATH } from "./gen/llms";

const SOCIAL = /(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|github\.com|tiktok\.com|wikipedia\.org|wikidata\.org|crunchbase\.com|pinterest\.com|threads\.net|bsky\.app|medium\.com)/i;

/** Keep profile/home URLs only — not posts, commits, issues, videos etc. */
export function isProfileUrl(u: string): boolean {
  try {
    const url = new URL(u);
    const segs = url.pathname.split("/").filter(Boolean);
    if (/github\.com$/.test(url.hostname)) return segs.length === 1;
    if (/(wikipedia|wikidata)\.org$/.test(url.hostname)) return segs[0] === "wiki" && segs.length === 2;
    if (/linkedin\.com$/.test(url.hostname)) return segs.length === 2 && ["company", "in", "school", "showcase"].includes(segs[0]);
    if (/youtube\.com$/.test(url.hostname)) return segs.length >= 1 && segs.length <= 2 && /^(@|c$|channel$|user$)/.test(segs[0]);
    if (/crunchbase\.com$/.test(url.hostname)) return segs.length === 2;
    if (/(facebook|instagram|x|twitter|tiktok|pinterest|threads|medium)\.(com|net)$/.test(url.hostname.replace(/^www\./, "")))
      return segs.length === 1 && !/^(sharer|share|intent|home|meta|watch|p|explore|hashtag|login)$/i.test(segs[0]);
    if (/bsky\.app$/.test(url.hostname)) return segs[0] === "profile" && segs.length === 2;
    return segs.length <= 2;
  } catch {
    return false;
  }
}

/** Best guess at the business name: og:site_name, else the shortest part of the title, else the host. */
export function siteName($: cheerio.CheerioAPI, title: string, url: string): string {
  const og = $('meta[property="og:site_name"]').attr("content")?.trim();
  if (og) return og;
  const t = title;
  const parts = t.split(/\s[|\-–—·:]\s/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts.sort((a, b) => a.length - b.length)[0];
  return new URL(url).hostname.replace(/^www\./, "");
}

export function generateFixes(home: AuditResult, homeHtml: string, ctx: SiteContext, pages: PageSummary[]): GeneratedFix[] {
  const fixes: GeneratedFix[] = [];
  const $ = cheerio.load(homeHtml);
  const origin = ctx.origin;
  const name = siteName($, home.facts.title, home.facts.finalUrl);
  const description = home.facts.metaDescription || $('meta[property="og:description"]').attr("content") || "";

  // ---------- robots.txt ----------
  const existing = ctx.robots?.ok && !/<html/i.test(ctx.robots.body.slice(0, 500)) ? ctx.robots.body.trim() : "";
  const robots = existing ? parseRobots(existing) : null;
  const access = botAccess(robots, "/");
  const blockedWanted = access.filter((b) => !b.allowed && (b.purpose === "search" || b.purpose === "user-fetch" || b.purpose === "classic-search"));
  const lines: string[] = [];
  if (existing) {
    lines.push(existing, "");
  } else {
    lines.push("User-agent: *", "Allow: /", "Disallow: /wp-admin/", "Allow: /wp-admin/admin-ajax.php", "");
  }
  if (blockedWanted.length) {
    lines.push("# Allow AI search & answer engines to read and cite this site", "# (training crawlers like GPTBot/ClaudeBot/CCBot are a separate choice)");
    for (const b of blockedWanted) lines.push(`User-agent: ${b.bot}`, "Allow: /", "");
  }
  const hasSitemapLine = robots?.sitemaps.length;
  if (!hasSitemapLine) lines.push(`Sitemap: ${ctx.sitemap.found ? ctx.sitemap.url : origin + "/sitemap.xml"}`);
  fixes.push({
    id: "robots",
    title: !existing ? "New robots.txt" : blockedWanted.length || !hasSitemapLine ? "Updated robots.txt" : "robots.txt — no change needed",
    filename: "robots.txt",
    language: "text",
    description: blockedWanted.length || !hasSitemapLine
      ? `Keeps your current rules and ${blockedWanted.length ? `unblocks ${blockedWanted.map((b) => b.bot).join(", ")}` : "adds"}${!hasSitemapLine ? " a Sitemap line" : ""}. Upload to your site root (public_html/robots.txt).`
      : "Your robots.txt already allows search and AI answer engines and lists a sitemap — no change needed.",
    content: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n",
  });

  // ---------- llms.txt ----------
  const ok = pages.filter((p) => p.status === 200 && !p.noindex && p.title && !UTILITY_PATH.test(new URL(p.url).pathname + "/")).slice(0, 80);
  const clean = (s: string) => s.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim();
  const llmsContent = buildLlmsTxt({ name, summary: description, homeUrl: home.facts.finalUrl, pages: ok });
  fixes.push({
    id: "llms",
    title: home.facts.llmsTxtFound ? "Suggested llms.txt (you already have one — compare)" : "New llms.txt",
    filename: "llms.txt",
    language: "markdown",
    description: "A markdown map of your key pages for LLM tools, built from the pages we crawled. Edit the summary line, remove pages you don't want featured, and upload to your site root. Optional, unofficial convention.",
    content: llmsContent,
  });

  // ---------- Organization + WebSite schema ----------
  const sameAs = [
    ...new Set(
      $("a[href]")
        .map((_, a) => $(a).attr("href") ?? "")
        .get()
        .filter((h) => /^https?:\/\//.test(h) && SOCIAL.test(h) && !/share|intent|sharer|\/search/i.test(h))
        .map((h) => h.split(/[?#]/)[0].replace(/\/$/, ""))
        .filter(isProfileUrl),
    ),
  ].slice(0, 10);
  const logo =
    $('link[rel="apple-touch-icon"]').attr("href") ||
    $('img[class*="logo" i], img[alt*="logo" i], header img').first().attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    "";
  const abs = (u: string) => (u ? new URL(u, origin).toString() : "");
  const email = $('a[href^="mailto:"]').first().attr("href")?.replace("mailto:", "").split("?")[0];
  const phone = $('a[href^="tel:"]').first().attr("href")?.replace("tel:", "");
  const org: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name,
    url: origin + "/",
    ...(logo ? { logo: abs(logo) } : { logo: `${origin}/logo.png  <-- replace with your logo URL` }),
    ...(description ? { description: clean(description) } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { telephone: phone } : {}),
    sameAs: sameAs.length ? sameAs : ["https://www.linkedin.com/company/REPLACE", "https://x.com/REPLACE"],
  };
  const website = {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name,
    url: origin + "/",
    publisher: { "@id": `${origin}/#organization` },
  };
  const schema = { "@context": "https://schema.org", "@graph": [org, website] };
  fixes.push({
    id: "schema",
    title: "Organization + WebSite structured data",
    language: "html",
    description: `Paste into the <head> of every page (WordPress: a header-scripts plugin, or your SEO plugin's schema settings). Check the values${sameAs.length ? "" : " and replace the REPLACE placeholders with your real profiles"}, then test at validator.schema.org.`,
    content: `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`,
  });

  // ---------- sitemap.xml if missing ----------
  if (!ctx.sitemap.found && ok.length) {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...ok.map((p) => `  <url><loc>${p.url.replace(/&/g, "&amp;")}</loc></url>`),
      "</urlset>",
    ].join("\n");
    fixes.push({
      id: "sitemap",
      title: "Starter sitemap.xml",
      filename: "sitemap.xml",
      language: "text",
      description: `No sitemap was found. This lists the ${ok.length} indexable pages we crawled. Better long-term: let your CMS generate it automatically (WordPress does at /wp-sitemap.xml).`,
      content: xml + "\n",
    });
  }

  // ---------- Meta tags for the homepage if weak ----------
  const needsMeta = home.checks.some((c) => ["title", "meta-description", "open-graph", "twitter-card", "canonical", "viewport", "lang"].includes(c.id) && c.status !== "pass" && c.status !== "info");
  if (needsMeta) {
    const t = home.facts.title || `${name} — REPLACE with what you do`;
    const d = description || "REPLACE with a 120–160 character summary of the page.";
    fixes.push({
      id: "head-tags",
      title: "Homepage <head> tags",
      language: "html",
      description: "A complete set of head tags for the homepage. Rewrite the title/description text if they were flagged — the AI fix plan suggests wording.",
      content: [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${t}</title>`,
        `<meta name="description" content="${d.replace(/"/g, "&quot;")}">`,
        `<link rel="canonical" href="${home.facts.finalUrl}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${name}">`,
        `<meta property="og:title" content="${t.replace(/"/g, "&quot;")}">`,
        `<meta property="og:description" content="${d.replace(/"/g, "&quot;")}">`,
        `<meta property="og:url" content="${home.facts.finalUrl}">`,
        `<meta property="og:image" content="${abs($('meta[property="og:image"]').attr("content") ?? "") || origin + "/og-image.jpg  <-- 1200x630"}">`,
        '<meta name="twitter:card" content="summary_large_image">',
      ].join("\n"),
    });
  }

  return fixes;
}
