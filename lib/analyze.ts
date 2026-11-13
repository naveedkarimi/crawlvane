import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AuditResult, Check, Category, FetchedResource, Status, AppFiles } from "./types";
import { botAccess, parseRobots, type ParsedRobots } from "./robots";
import { reviewSchema } from "./schemaValidate";

export interface AnalyzeInput {
  requestedUrl: string;
  page: FetchedResource;
  robots: FetchedResource | null;
  sitemap: { url: string; found: boolean; urlCount: number; isIndex: boolean; error?: string } | null;
  llms: FetchedResource | null;
  llmsFull: FetchedResource | null;
  /** Checks computed elsewhere (agent readiness, share image) that should count towards the scores. */
  extraChecks?: Check[];
  /** Universal Links and Android App Links files, when the site context fetched them. */
  appFiles?: AppFiles;
}

// Headings that read as questions even without a "?" ("How to…", "What is…")
export const QUESTION_START =
  /^(how|why)\s|^(what|when|where|who|which)\s+(is|are|was|were|does|do|did|can|should|will|makes|happens|to)\b/i;

/** Words of readable text in an HTML document, counted like the page itself (main, article or body). */
export function htmlWords(html: string): number {
  const $c = cheerio.load(html || "");
  $c("script,style,noscript,template,svg,iframe").remove();
  const main = $c("main").length ? $c("main").first() : $c("article").length ? $c("article").first() : $c("body");
  return words(main.text().replace(/\s+/g, " ").trim() || $c("body").text().replace(/\s+/g, " ").trim());
}

export const words = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

function fleschReadingEase(text: string): number | null {
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => words(s) > 2);
  const ws = text.match(/[A-Za-z]+/g) || [];
  if (sentences.length < 3 || ws.length < 100) return null;
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return 206.835 - 1.015 * (ws.length / sentences.length) - 84.6 * (syl / ws.length);
}

/**
 * Text of a node with a space between every text node, so "<span>Full Stack</span><span>Engineer</span>"
 * reads "Full Stack Engineer" (cheerio's .text() would give "Full StackEngineer"). Used for display only.
 */
type TextNode = { type: string; data?: string; children?: TextNode[] };
export function spacedText(node: unknown): string {
  const out: string[] = [];
  const walk = (n: TextNode) => {
    if (n.type === "text") out.push(n.data ?? "");
    else if (n.type === "tag" || n.type === "root") n.children?.forEach(walk);
  };
  if (node) walk(node as TextNode);
  return out.join(" ").replace(/\s+/g, " ").replace(/\s+([,.;:!?])(?=\s|$)/g, "$1").trim();
}

/**
 * Text of the block that follows a heading: its next sibling paragraph, list, table or div.
 * Accordions (<details><summary><h3>Q</h3></summary><p>A</p>) and wrapped headings have no
 * following sibling, so look after the wrapper (up to 2 levels).
 */
export function answerAfter($: cheerio.CheerioAPI, heading: AnyNode): string {
  let el = $(heading);
  let next = el.nextAll("p,ul,ol,div,dl,table").first();
  for (let up = 0; !next.length && up < 2; up++) {
    el = el.parent();
    next = el.nextAll("p,ul,ol,div,dl,table").first();
  }
  return next.text().replace(/\s+/g, " ").trim();
}

/** Collect @type values from any JSON-LD, including @graph and nested objects. */
function collectSchema(nodes: unknown[]): { types: Set<string>; objects: Record<string, unknown>[] } {
  const types = new Set<string>();
  const objects: Record<string, unknown>[] = [];
  const walk = (n: unknown, depth: number) => {
    if (depth > 8 || n == null) return;
    if (Array.isArray(n)) return n.forEach((x) => walk(x, depth + 1));
    if (typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    const t = o["@type"];
    if (t) {
      (Array.isArray(t) ? t : [t]).forEach((x) => typeof x === "string" && types.add(x));
      objects.push(o);
    }
    for (const v of Object.values(o)) if (typeof v === "object") walk(v, depth + 1);
  };
  nodes.forEach((n) => walk(n, 0));
  return { types, objects };
}

export function analyze(input: AnalyzeInput): AuditResult {
  const { page } = input;
  const checks: Check[] = [];
  const add = (
    category: Category,
    group: string,
    id: string,
    title: string,
    status: Status,
    detail: string,
    fix?: string,
    weight: 1 | 2 | 3 = 2,
  ) => checks.push({ id, category, group, title, status, detail, fix: status === "pass" ? undefined : fix, weight });

  const finalUrl = new URL(page.url);
  const $ = cheerio.load(page.body || "");
  const head = $("head");

  // ---------- Text extraction ----------
  const $content = cheerio.load(page.body || "");
  $content("script,style,noscript,template,svg,iframe").remove();
  const mainEl = $content("main").length ? $content("main").first() : $content("article").length ? $content("article").first() : $content("body");
  const bodyText = $content("body").text().replace(/\s+/g, " ").trim();
  const mainText = mainEl.text().replace(/\s+/g, " ").trim();
  const wordCount = words(mainText || bodyText);
  // With JavaScript rendering on, also count the raw HTML: that's what most AI crawlers get.
  const rawWordCount = page.rendered && page.rawBody !== undefined ? htmlWords(page.rawBody) : undefined;

  // ---------- Head data ----------
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description" i]').attr("content")?.trim() ?? "";
  const metaRobots = ($('meta[name="robots" i]').attr("content") ?? "").toLowerCase();
  const xRobots = (page.headers["x-robots-tag"] ?? "").toLowerCase();
  const canonicalRaw = $('link[rel="canonical" i]').attr("href")?.trim() ?? "";
  const lang = $("html").attr("lang")?.trim() ?? "";
  const viewport = $('meta[name="viewport" i]').attr("content") ?? "";
  const charset = $("meta[charset]").length > 0 || /charset=/i.test($('meta[http-equiv="content-type" i]').attr("content") ?? "") || /charset=/i.test(page.headers["content-type"] ?? "");
  const og = (p: string) => $(`meta[property="og:${p}"]`).attr("content")?.trim() ?? "";
  const twitterCard = $('meta[name="twitter:card" i]').attr("content") ?? "";
  const favicon = $('link[rel~="icon" i]').length > 0;
  const h1 = $("h1").map((_, e) => $(e).text().replace(/\s+/g, " ").trim()).get().filter(Boolean);

  // ---------- JSON-LD ----------
  const ldBlocks: unknown[] = [];
  let ldErrors = 0;
  $('script[type="application/ld+json" i]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      ldBlocks.push(JSON.parse(raw));
    } catch {
      ldErrors++;
    }
  });
  const { types: schemaTypeSet, objects: schemaObjects } = collectSchema(ldBlocks);
  const microdataTypes = $("[itemtype]").map((_, e) => ($(e).attr("itemtype") ?? "").split("/").pop() ?? "").get();
  microdataTypes.forEach((t) => t && schemaTypeSet.add(t));
  const schemaTypes = [...schemaTypeSet];
  const hasType = (...t: string[]) => t.some((x) => schemaTypeSet.has(x));
  const findSchema = (...t: string[]) =>
    schemaObjects.find((o) => {
      const ty = o["@type"];
      return (Array.isArray(ty) ? ty : [ty]).some((x) => t.includes(String(x)));
    });

  // ---------- Links & images ----------
  let internalLinks = 0;
  let externalLinks = 0;
  let nofollowInternal = 0;
  const externalHosts = new Set<string>();
  let contentExternal = 0;
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const u = new URL(href, finalUrl);
      const sameSite = u.hostname.replace(/^www\./, "") === finalUrl.hostname.replace(/^www\./, "");
      if (sameSite) {
        internalLinks++;
        if (/nofollow/i.test($(a).attr("rel") ?? "")) nofollowInternal++;
      } else {
        externalLinks++;
        externalHosts.add(u.hostname);
        if ($(a).closest("nav,header,footer").length === 0) contentExternal++;
      }
    } catch {
      /* ignore bad hrefs */
    }
  });
  const imgs = $("img");
  const images = imgs.length;
  const imagesMissingAlt = imgs.filter((_, i) => $(i).attr("alt") === undefined).length;
  const imagesNoDims = imgs.filter((_, i) => !$(i).attr("width") || !$(i).attr("height")).length;
  const lazyImgs = imgs.filter((_, i) => $(i).attr("loading") === "lazy").length;

  // ---------- Headings ----------
  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_, e) => ({ level: Number(e.tagName.slice(1)), text: $(e).text().replace(/\s+/g, " ").trim(), el: e }))
    .get();
  let skipped = 0;
  for (let i = 1; i < headings.length; i++) if (headings[i].level - headings[i - 1].level > 1) skipped++;
  const questionHeads = headings.filter((h) => h.level >= 2 && (h.text.endsWith("?") || QUESTION_START.test(h.text)));

  // Does a concise answer follow each question heading?
  let answeredQuestions = 0;
  for (const q of questionHeads) {
    const n = words(answerAfter($, q.el));
    if (n >= 8 && n <= 90) answeredQuestions++;
  }

  // ---------- Paragraphs ----------
  const paras = mainEl.find("p").map((_, p) => $content(p).text().replace(/\s+/g, " ").trim()).get().filter((t) => words(t) >= 5);
  const paraWords = paras.map(words);
  const avgPara = paraWords.length ? paraWords.reduce((a, b) => a + b, 0) / paraWords.length : 0;
  const longParas = paraWords.filter((n) => n > 150).length;
  const firstPara = paras[0] ?? "";
  const lists = mainEl.find("ul,ol").filter((_, l) => $content(l).closest("nav,header,footer").length === 0).length;
  const tables = mainEl.find("table").length;
  const dataPoints = (mainText.match(/\b\d[\d,.]*\s?(%|percent|million|billion|k\b|x\b|\$)|\$\s?\d[\d,.]*|\b(19|20)\d{2}\b/gi) || []).length;
  // Readability on real paragraphs only (nav/menus have no sentence punctuation and skew the score)
  const readingEase = fleschReadingEase(paras.map((p) => (/[.!?]$/.test(p) ? p : p + ".")).join(" "));

  // ---------- Scripts / rendering ----------
  const scripts = $("script[src]").length;
  // nomodule scripts are legacy polyfills that modern browsers never download, so they can't block rendering
  const blockingHead = head.find("script[src]").filter((_, s) => !$(s).is("[async],[defer],[type=module],[nomodule]")).length;
  const rawTextRatio = page.bytes ? bodyText.length / page.bytes : 0;
  const jsShell =
    wordCount < 80 && ($("#root,#__next,#app,[data-reactroot],#___gatsby,app-root").length > 0 || scripts > 3);

  // ---------- Dates & authorship ----------
  // Article types plus WebPage and its schema.org subtypes (FAQPage, AboutPage, ...)
  const article = findSchema(
    "Article", "BlogPosting", "NewsArticle", "TechArticle",
    "WebPage", "FAQPage", "QAPage", "AboutPage", "ContactPage", "CollectionPage", "ItemPage", "ProfilePage",
  );
  const dateModified =
    (article?.dateModified as string) ||
    $('meta[property="article:modified_time"]').attr("content") ||
    (article?.datePublished as string) ||
    $('meta[property="article:published_time"]').attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    "";
  const dm = dateModified ? new Date(dateModified) : null;
  const ageDays = dm && !isNaN(dm.getTime()) ? (Date.now() - dm.getTime()) / 86400000 : null;
  const hasAuthor =
    !!article?.author ||
    $('meta[name="author" i]').length > 0 ||
    $('[rel~="author"]').length > 0 ||
    $('[itemprop="author"],.author,.byline,[class*="author"]').length > 0;
  const org = findSchema("Organization", "Person", "LocalBusiness", "Corporation", "ProfessionalService");
  const sameAs = org?.sameAs ? (Array.isArray(org.sameAs) ? org.sameAs.length : 1) : 0;

  const trustLinks = $("a[href]")
    .map((_, a) => (($(a).attr("href") ?? "") + " " + $(a).text()).toLowerCase())
    .get();
  const hasAbout = trustLinks.some((t) => /about/.test(t));
  const hasContact = trustLinks.some((t) => /contact/.test(t));

  // =============== SEO CHECKS ===============
  const G = { crawl: "Crawl & index", meta: "Titles & meta", content: "Content & structure", tech: "Technical & speed", social: "Social & rich results" };

  add("seo", G.crawl, "https", "HTTPS", finalUrl.protocol === "https:" ? "pass" : "fail",
    finalUrl.protocol === "https:" ? "Page is served over HTTPS." : "Page is served over plain HTTP.",
    "Serve the site over HTTPS and 301-redirect all HTTP URLs.", 3);

  add("seo", G.crawl, "status", "HTTP status", page.status === 200 ? "pass" : "fail",
    `Final response: ${page.status}.`, "The audited URL should return 200 OK.", 3);

  const hops = page.redirects.length;
  add("seo", G.crawl, "redirects", "Redirect chain", hops === 0 ? "pass" : hops === 1 ? "info" : "warn",
    hops === 0 ? "No redirects." : `${hops} redirect(s): ${page.redirects.join(" → ")} → ${page.url}`,
    "Link directly to the final URL and collapse chains to a single 301.", 1);

  const noindex = /noindex|none/.test(metaRobots) || /noindex|none/.test(xRobots);
  add("seo", G.crawl, "indexable", "Indexable", noindex ? "fail" : "pass",
    noindex ? `Blocked by ${metaRobots.includes("noindex") ? `meta robots "${metaRobots}"` : `X-Robots-Tag "${xRobots}"`}.` : "No noindex directive found.",
    "Remove noindex from the meta robots tag / X-Robots-Tag header if this page should rank.", 3);

  let canonStatus: Status = "warn";
  let canonDetail = "No canonical tag.";
  if (canonicalRaw) {
    try {
      const c = new URL(canonicalRaw, finalUrl);
      const norm = (u: URL) => (u.origin + u.pathname).replace(/\/$/, "");
      if (norm(c) === norm(finalUrl)) {
        canonStatus = "pass";
        canonDetail = `Self-referencing canonical: ${c}`;
      } else {
        canonStatus = "info";
        canonDetail = `Canonical points elsewhere: ${c}. Fine if intentional (e.g. duplicate page).`;
      }
    } catch {
      canonStatus = "fail";
      canonDetail = `Invalid canonical URL: ${canonicalRaw}`;
    }
  }
  add("seo", G.crawl, "canonical", "Canonical URL", canonStatus, canonDetail,
    'Add <link rel="canonical" href="https://…full URL…"> pointing to the preferred version of this page.', 2);

  const robotsFound = !!input.robots?.ok && !/<html/i.test(input.robots.body.slice(0, 500));
  let robots: ParsedRobots | null = robotsFound ? parseRobots(input.robots!.body) : null;
  add("seo", G.crawl, "robots-txt", "robots.txt", robotsFound ? "pass" : "warn",
    robotsFound ? `Found (${input.robots!.body.split("\n").length} lines).` : "No robots.txt at the site root.",
    "Add /robots.txt with crawl rules and a Sitemap: line.", 1);

  if (robots) {
    const googleBlocked = !botAccess(robots, finalUrl.pathname).find((b) => b.bot === "Googlebot")!.allowed;
    if (googleBlocked)
      add("seo", G.crawl, "robots-google", "Googlebot allowed", "fail", "robots.txt disallows Googlebot from this URL.",
        "Remove the Disallow rule that matches this path for Googlebot / *.", 3);
  }

  const sm = input.sitemap;
  add("seo", G.crawl, "sitemap", "XML sitemap", sm?.found ? (sm.urlCount > 0 ? "pass" : "warn") : "warn",
    sm?.found ? `${sm.url} — ${sm.isIndex ? `sitemap index with ${sm.urlCount} child sitemaps` : `${sm.urlCount} URLs`}.` : `No sitemap found${sm?.error ? ` (${sm.error})` : ""}.`,
    "Publish /sitemap.xml listing your canonical URLs and reference it in robots.txt; submit it in Search Console and Bing Webmaster Tools.", 2);
  if (robots && robots.sitemaps.length === 0 && sm?.found)
    add("seo", G.crawl, "sitemap-in-robots", "Sitemap declared in robots.txt", "warn", "robots.txt has no Sitemap: line.",
      `Add "Sitemap: ${sm.url}" to robots.txt.`, 1);

  const tl = title.length;
  add("seo", G.meta, "title", "Title tag", !title ? "fail" : tl < 15 || tl > 65 ? "warn" : "pass",
    title ? `"${title}" (${tl} chars)` : "Missing <title>.",
    "Write a unique, descriptive title of roughly 30–60 characters with the main topic near the start.", 3);

  const dl = metaDescription.length;
  add("seo", G.meta, "meta-description", "Meta description", !metaDescription ? "warn" : dl < 70 || dl > 165 ? "warn" : "pass",
    metaDescription ? `${dl} chars: "${metaDescription.slice(0, 170)}"` : "No meta description.",
    "Add a 120–160 character summary that answers why someone should click.", 2);

  add("seo", G.meta, "h1", "Single H1", h1.length === 1 ? "pass" : h1.length === 0 ? "fail" : "warn",
    h1.length === 0 ? "No <h1> on the page." : h1.length === 1 ? `"${h1[0].slice(0, 120)}"` : `${h1.length} H1s: ${h1.slice(0, 3).map((h) => `"${h.slice(0, 50)}"`).join(", ")}`,
    "Use exactly one H1 that states the page's main topic.", 2);

  add("seo", G.meta, "lang", "Language declared", lang ? "pass" : "warn", lang ? `<html lang="${lang}">` : "No lang attribute on <html>.",
    'Add lang to <html>, e.g. <html lang="en">.', 1);


  add("seo", G.content, "word-count", "Content depth", wordCount >= 300 ? "pass" : wordCount >= 120 ? "warn" : "fail",
    `${wordCount} words of visible text in the main content.`,
    "Thin pages rarely rank or get cited. Expand with substantive, original content that fully answers the topic.", 2);

  add("seo", G.content, "heading-order", "Heading hierarchy", skipped === 0 && headings.length > 1 ? "pass" : headings.length <= 1 ? "warn" : "warn",
    headings.length <= 1 ? "Page has almost no subheadings." : skipped ? `${skipped} skipped heading level(s) (e.g. H2 → H4).` : `${headings.length} headings in logical order.`,
    "Structure content with H2/H3 subheadings in order, without skipping levels.", 1);

  add("seo", G.content, "alt-text", "Image alt text", images === 0 || imagesMissingAlt === 0 ? "pass" : imagesMissingAlt / images > 0.3 ? "fail" : "warn",
    images === 0 ? "No images." : `${images - imagesMissingAlt}/${images} images have an alt attribute.`,
    'Add descriptive alt text to meaningful images (alt="" for purely decorative ones).', 2);

  add("seo", G.content, "internal-links", "Internal links", internalLinks >= 5 ? "pass" : "warn",
    `${internalLinks} internal, ${externalLinks} external links.${nofollowInternal ? ` ${nofollowInternal} internal links are nofollow.` : ""}`,
    "Link to related pages on your site with descriptive anchor text so crawlers can discover and understand them.", 1);

  add("seo", G.tech, "viewport", "Mobile viewport", /width=device-width/.test(viewport) ? "pass" : "fail",
    viewport ? `viewport: "${viewport}"` : "No viewport meta tag.",
    '<meta name="viewport" content="width=device-width, initial-scale=1"> — Google indexes the mobile version.', 3);

  add("seo", G.tech, "charset", "Character encoding", charset ? "pass" : "warn", charset ? "Charset declared." : "No charset declared.",
    '<meta charset="utf-8"> as the first element in <head>.', 1);

  add("seo", G.tech, "ttfb", "Server response time", page.ms < 800 ? "pass" : page.ms < 1800 ? "warn" : "fail",
    `HTML downloaded in ${page.ms} ms (from our server, incl. redirects).`,
    "Use caching/CDN and reduce server work. Run the PageSpeed test below for Core Web Vitals.", 2);

  const kb = Math.round(page.bytes / 1024);
  add("seo", G.tech, "html-size", "HTML size", kb < 500 ? "pass" : kb < 1500 ? "warn" : "fail", `${kb} KB of HTML.`,
    "Trim inline scripts/styles and large embedded data from the HTML.", 1);

  const enc = page.headers["content-encoding"] ?? "";
  add("seo", G.tech, "compression", "Compression", /gzip|br|zstd|deflate/.test(enc) ? "pass" : "warn",
    enc ? `content-encoding: ${enc}` : "No compression header seen (some CDNs strip it for proxies).",
    "Enable Brotli or gzip on your server/CDN.", 1);

  add("seo", G.tech, "render-blocking", "Render-blocking scripts", blockingHead === 0 ? "pass" : blockingHead <= 2 ? "warn" : "fail",
    `${blockingHead} synchronous <script src> in <head>.`, "Add defer/async to scripts in <head> or move them to the end of <body>.", 1);

  add("seo", G.tech, "img-dims", "Image dimensions (CLS)", images === 0 || imagesNoDims / images < 0.3 ? "pass" : "warn",
    images === 0 ? "No images." : `${imagesNoDims}/${images} images lack width/height. ${lazyImgs} use loading="lazy".`,
    "Set width and height on images to prevent layout shift; lazy-load below-the-fold images.", 1);

  if (finalUrl.protocol === "https:")
    add("seo", G.tech, "hsts", "HSTS header", page.headers["strict-transport-security"] ? "pass" : "info",
      page.headers["strict-transport-security"] ? "Strict-Transport-Security set." : "No HSTS header.",
      "Add Strict-Transport-Security: max-age=31536000; includeSubDomains.", 1);

  const ogOk = og("title") && og("description") && og("image");
  add("seo", G.social, "open-graph", "Open Graph tags", ogOk ? "pass" : og("title") || og("image") ? "warn" : "warn",
    `og:title ${og("title") ? "✓" : "✗"} · og:description ${og("description") ? "✓" : "✗"} · og:image ${og("image") ? "✓" : "✗"}`,
    "Add og:title, og:description and a 1200×630 og:image so shares (and some AI previews) look right.", 1);

  add("seo", G.social, "twitter-card", "Twitter/X card", twitterCard ? "pass" : "info", twitterCard ? `twitter:card = ${twitterCard}` : "No twitter:card.",
    '<meta name="twitter:card" content="summary_large_image">', 1);

  add("seo", G.social, "favicon", "Favicon", favicon ? "pass" : "warn", favicon ? "Favicon linked." : "No <link rel=icon>.",
    "Add a favicon — it shows in Google mobile results and AI citations.", 1);

  add("seo", G.social, "structured-data", "Structured data", ldErrors ? "fail" : schemaTypes.length ? "pass" : "warn",
    ldErrors ? `${ldErrors} JSON-LD block(s) fail to parse.` : schemaTypes.length ? `Types: ${schemaTypes.join(", ")}` : "No JSON-LD or microdata found.",
    "Add JSON-LD that matches visible content (Organization/Person, WebSite, Article, Product, FAQPage…). Fix invalid JSON.", 2);

  if (ldBlocks.length) {
    const { issues, retired } = reviewSchema(ldBlocks, page.url);
    const retiredNote = retired.length ? `Google no longer shows rich results for ${retired.join(", ")}; the markup is harmless and can stay.` : "";
    const shown = issues.slice(0, 5).join(" ") + (issues.length > 5 ? ` And ${issues.length - 5} more.` : "");
    add("seo", G.social, "schema-valid", "Structured data quality", issues.length ? "warn" : retired.length ? "info" : "pass",
      [issues.length ? shown : retired.length ? "" : "JSON-LD has the properties Google requires, with no template text or relative URLs.", retiredNote].filter(Boolean).join(" "),
      issues.length ? "Fill in the missing properties, replace template text with real values and use full https:// URLs, then confirm with Google's Rich Results Test." : undefined, 1);
  }

  // ---------- International (hreflang) ----------
  const alternates = $('link[rel="alternate" i][hreflang]')
    .map((_, e) => ({ lang: ($(e).attr("hreflang") ?? "").trim(), href: ($(e).attr("href") ?? "").trim() }))
    .get();
  if (alternates.length) {
    const LANG = /^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i;
    const badCodes = alternates.filter((a) => !LANG.test(a.lang) || /^[a-z]{2}[_-]uk$/i.test(a.lang)).map((a) => a.lang);
    const relative = alternates.filter((a) => !/^https?:\/\//i.test(a.href));
    const norm = (u: string) => {
      try {
        const x = new URL(u, finalUrl);
        return (x.origin + x.pathname).replace(/\/$/, "") + x.search;
      } catch {
        return u;
      }
    };
    const selfUrls = new Set([norm(page.url), canonicalRaw ? norm(canonicalRaw) : ""]);
    const hasSelf = alternates.some((a) => selfUrls.has(norm(a.href)));
    const dupLangs = alternates.length - new Set(alternates.map((a) => a.lang.toLowerCase())).size;
    const hasDefault = alternates.some((a) => a.lang.toLowerCase() === "x-default");
    const problems = [
      badCodes.length && `invalid codes: ${[...new Set(badCodes)].slice(0, 4).join(", ")} (use ISO 639-1 language and ISO 3166-1 region, e.g. en-GB, not en-UK)`,
      relative.length && `${relative.length} relative URL${relative.length === 1 ? "" : "s"}`,
      !hasSelf && "this page doesn't list itself",
      dupLangs > 0 && `${dupLangs} duplicate language code${dupLangs === 1 ? "" : "s"}`,
    ].filter(Boolean) as string[];
    add("seo", G.crawl, "hreflang", "hreflang tags", badCodes.length || !hasSelf ? "fail" : problems.length ? "warn" : hasDefault ? "pass" : "info",
      problems.length
        ? `${alternates.length} language versions; ${problems.join("; ")}.`
        : `${alternates.length} language versions, including this page${hasDefault ? " and x-default" : ". No x-default (optional: the page for everyone else)"}.`,
      "Every language version should list all versions including itself, with absolute URLs and valid codes, and each one must link back. Add x-default for visitors whose language you don't cover.", 2);
  }

  // ---------- Local business ----------
  const LOCAL = ["LocalBusiness", "Restaurant", "Dentist", "Store", "AutoRepair", "Bakery", "BeautySalon", "CafeOrCoffeeShop", "HairSalon", "Hotel", "LegalService", "Attorney", "MedicalBusiness", "Physician", "Plumber", "Electrician", "RealEstateAgent", "HomeAndConstructionBusiness", "FoodEstablishment", "HealthAndBeautyBusiness", "ProfessionalService", "AccountingService", "ChildCare", "SportsActivityLocation", "LodgingBusiness"];
  const local = findSchema(...LOCAL);
  if (local) {
    const addr = (local.address ?? {}) as Record<string, unknown>;
    const missing = [
      !local.name && "name",
      !(typeof local.address === "string" || (addr.streetAddress && addr.addressLocality)) && "street address and town",
      !local.telephone && "telephone",
      !(local.openingHoursSpecification || local.openingHours) && "opening hours",
    ].filter(Boolean) as string[];
    const phoneDigits = String(local.telephone ?? "").replace(/\D/g, "").slice(-9);
    const phoneOnPage = phoneDigits.length >= 7 && bodyText.replace(/\D/g, "").includes(phoneDigits);
    add("seo", G.social, "local-business", "Local business details", missing.length ? "warn" : phoneOnPage || !local.telephone ? "pass" : "warn",
      missing.length
        ? `LocalBusiness schema is missing: ${missing.join(", ")}.`
        : phoneOnPage
          ? "Name, address, phone and opening hours are in the schema, and the phone number matches the page."
          : "The schema has full details, but its phone number doesn't appear on the page.",
      "Give the LocalBusiness schema your name, full address, phone and opening hours exactly as they appear on the page and on your Google Business Profile.", 1);
  }

  // =============== AEO CHECKS ===============
  const A = { answers: "Direct answers", format: "Extractable format", trust: "Answer trust" };

  add("aeo", A.answers, "question-headings", "Question-style headings", questionHeads.length >= 3 ? "pass" : questionHeads.length >= 1 ? "warn" : "fail",
    `${questionHeads.length} H2–H6 headings phrased as questions${questionHeads.length ? `, e.g. "${questionHeads[0].text.slice(0, 80)}"` : ""}.`,
    "Phrase key subheadings as the questions people actually ask (\"How much does X cost?\") so answer engines can match them.", 2);

  if (questionHeads.length)
    add("aeo", A.answers, "concise-answers", "Concise answer under each question",
      answeredQuestions / questionHeads.length >= 0.7 ? "pass" : answeredQuestions > 0 ? "warn" : "fail",
      `${answeredQuestions}/${questionHeads.length} question headings are followed by a 8–90 word answer block.`,
      "Put a direct 1–3 sentence answer (≈40–60 words) immediately under each question heading, then elaborate.", 3);

  const fpw = words(firstPara);
  add("aeo", A.answers, "lead-summary", "Answer-first opening", fpw >= 20 && fpw <= 120 ? "pass" : fpw ? "warn" : "fail",
    firstPara ? `First paragraph: ${fpw} words — "${firstPara.slice(0, 140)}${firstPara.length > 140 ? "…" : ""}"` : "No opening paragraph found in main content.",
    "Open with a 2–4 sentence summary that directly answers the page's main question (a TL;DR).", 2);

  // Reported, not scored: Google stopped showing HowTo rich results in 2023 and FAQ rich results on 2026-05-07.
  add("aeo", A.answers, "faq-schema", "FAQ / Q&A markup", "info",
    hasType("FAQPage", "QAPage", "HowTo")
      ? "FAQ, Q&A or HowTo markup found. Reported, not scored: Google no longer shows FAQ or HowTo rich results, but the markup is safe to keep."
      : "No FAQPage, QAPage or HowTo markup. Reported, not scored: Google no longer shows FAQ or HowTo rich results. QAPage is still supported for pages where visitors post answers.",
    undefined, 1);

  add("aeo", A.format, "lists-tables", "Lists & tables", lists + tables >= 2 ? "pass" : lists + tables === 1 ? "warn" : "warn",
    `${lists} content lists, ${tables} tables.`,
    "Use bulleted steps, numbered lists and comparison tables — answer engines lift these directly.", 2);

  add("aeo", A.format, "paragraph-length", "Scannable paragraphs", paras.length === 0 ? "warn" : avgPara <= 80 && longParas === 0 ? "pass" : "warn",
    paras.length ? `Average paragraph ${Math.round(avgPara)} words; ${longParas} over 150 words.` : "No paragraphs detected.",
    "Keep paragraphs to one idea (~40–80 words) so individual passages can be quoted out of context.", 1);

  if (readingEase !== null)
    add("aeo", A.format, "readability", "Readability", readingEase >= 50 ? "pass" : readingEase >= 30 ? "warn" : "fail",
      `Flesch reading ease ≈ ${Math.round(readingEase)} (60+ is plain English).`,
      "Shorter sentences and plain words make answers easier to extract and summarise.", 1);

  add("aeo", A.format, "server-rendered", "Content in initial HTML", jsShell ? "fail" : wordCount >= 120 ? "pass" : "warn",
    jsShell ? `Only ${wordCount} words in raw HTML — content appears to be rendered by JavaScript.` : `${wordCount} words present without running JavaScript (text/HTML ratio ${(rawTextRatio * 100).toFixed(0)}%).`,
    "Most AI crawlers don't execute JavaScript. Use server-side rendering or static generation so the full text is in the HTML.", 3);

  add("aeo", A.trust, "author", "Visible author / byline", hasAuthor ? "pass" : "warn",
    hasAuthor ? "Author signal found (schema, meta or byline)." : "No author signal found.",
    "Show who wrote the content with a byline linked to an author page, and add author to Article schema.", 1);

  add("aeo", A.trust, "date", "Publish / update date", ageDays === null ? "warn" : ageDays <= 365 ? "pass" : "warn",
    ageDays === null ? "No machine-readable date found." : `Last dated ${Math.round(ageDays)} days ago (${dateModified.slice(0, 10)}).`,
    "Expose datePublished/dateModified in schema and a visible \"Updated\" date; refresh content at least yearly.", 1);

  // =============== GEO / LLM CHECKS ===============
  const L = { access: "AI crawler access", llms: "LLM files", entity: "Entity & citations" };
  const bots = botAccess(robots, finalUrl.pathname + finalUrl.search);
  const blocked = (p: string) => bots.filter((b) => b.purpose === p && !b.allowed).map((b) => b.bot);
  const bSearch = blocked("search");
  const bUser = blocked("user-fetch");
  const bTrain = blocked("training");

  add("geo", L.access, "ai-search-bots", "AI search crawlers allowed", bSearch.length === 0 ? "pass" : bSearch.length <= 2 ? "warn" : "fail",
    bSearch.length ? `Blocked: ${bSearch.join(", ")}.` : "OAI-SearchBot, Claude-SearchBot, PerplexityBot and other AI search bots can crawl this URL.",
    "Allow AI *search* crawlers in robots.txt if you want to be cited in ChatGPT, Claude, Perplexity etc. answers.", 3);

  add("geo", L.access, "ai-user-bots", "User-triggered AI fetchers allowed", bUser.length === 0 ? "pass" : "warn",
    bUser.length ? `Blocked: ${bUser.join(", ")}.` : "ChatGPT-User, Claude-User and similar can fetch the page when a user asks about it.",
    "Allow user-agent fetchers (ChatGPT-User, Claude-User, Perplexity-User) so assistants can read your page when users share or request it.", 2);

  add("geo", L.access, "ai-training-bots", "AI training crawlers", "info",
    bTrain.length ? `Blocked for training: ${bTrain.join(", ")}. This is a valid business choice and does not by itself stop AI search citations.` : "All listed training crawlers are allowed (GPTBot, ClaudeBot, Google-Extended, CCBot…).",
    undefined, 1);

  add("geo", L.access, "bing-access", "Bing access (feeds Copilot & partners)",
    bots.find((b) => b.bot === "Bingbot")!.allowed ? "pass" : "fail",
    bots.find((b) => b.bot === "Bingbot")!.allowed ? "Bingbot allowed." : "Bingbot is blocked.",
    "Allow Bingbot — Bing's index powers Copilot and is used by several AI answer engines.", 2);

  const llmsOk = !!input.llms?.ok && !/<html|<!doctype/i.test(input.llms.body.slice(0, 300));
  const llmsHasTitle = llmsOk && /^\s*#\s+\S/m.test(input.llms!.body);
  const llmsLinks = llmsOk ? (input.llms!.body.match(/\]\((https?:\/\/|\/)[^)]+\)/g) || []).length : 0;
  // Reported, not scored: Google's AI optimization guide says Google Search doesn't use these files.
  const NOT_SCORED = "Reported, not scored: Google Search doesn't use this file, though other AI tools may.";
  add("geo", L.llms, "llms-txt", "/llms.txt", "info",
    !llmsOk ? `No /llms.txt found. ${NOT_SCORED}` : `Found: ${llmsHasTitle ? "has H1 title" : "missing '# Title' line"}, ${llmsLinks} markdown links. ${NOT_SCORED}`,
    llmsOk && !(llmsHasTitle && llmsLinks > 0) ? "Start the file with '# Site name', then list your key pages as markdown links under '## Sections'." : undefined, 1);

  const llmsFullOk = !!input.llmsFull?.ok && !/<html|<!doctype/i.test(input.llmsFull.body.slice(0, 300));
  add("geo", L.llms, "llms-full", "/llms-full.txt", "info",
    llmsFullOk ? `Found (${Math.round(input.llmsFull!.bytes / 1024)} KB). Reported, not scored.` : "Not found (optional). Reported, not scored.",
    undefined, 1);

  const mdAlt = $('link[rel="alternate" i][type="text/markdown" i]').length > 0;
  add("geo", L.llms, "markdown-alt", "Markdown version of page", "info",
    mdAlt ? "Page advertises a text/markdown alternate. Reported, not scored." : "No markdown alternate link (optional). Reported, not scored.",
    undefined, 1);

  add("geo", L.entity, "entity-schema", "Organization / Person entity", org ? (sameAs >= 2 ? "pass" : "warn") : "fail",
    org ? `${String(org["@type"])} "${String(org.name ?? "")}" with ${sameAs} sameAs profile link(s).` : "No Organization or Person schema.",
    "Add Organization (or Person) JSON-LD with name, url, logo, description and sameAs links to LinkedIn, X, GitHub, Wikipedia/Wikidata, Crunchbase etc. This helps LLMs resolve who you are.", 3);

  const siteName = og("site_name") || (findSchema("WebSite")?.name as string) || "";
  add("geo", L.entity, "brand-consistency", "Consistent brand name", siteName && (title.toLowerCase().includes(siteName.toLowerCase()) || String(org?.name ?? "").toLowerCase() === siteName.toLowerCase()) ? "pass" : siteName ? "warn" : "warn",
    siteName ? `Site name "${siteName}"; org name "${String(org?.name ?? "—")}"; title "${title.slice(0, 60)}".` : "No og:site_name or WebSite schema name.",
    "Use one exact brand name across title, og:site_name, WebSite and Organization schema, and your external profiles.", 1);

  add("geo", L.entity, "citations", "Cites sources", contentExternal >= 2 ? "pass" : contentExternal === 1 ? "warn" : "warn",
    `${contentExternal} outbound links in body content (${externalHosts.size} distinct external domains overall).`,
    "Link to primary sources, studies and docs that back your claims — pages that cite evidence are more likely to be trusted and quoted.", 2);

  add("geo", L.entity, "data-points", "Specific facts & numbers", dataPoints >= 5 ? "pass" : dataPoints >= 1 ? "warn" : "warn",
    `${dataPoints} statistics, prices, percentages or years in the main content.`,
    "Include concrete, original data (numbers, prices, dates, benchmarks). Generative engines prefer quotable specifics over generic prose.", 2);

  add("geo", L.entity, "trust-pages", "About & contact pages linked", hasAbout && hasContact ? "pass" : "warn",
    `About ${hasAbout ? "✓" : "✗"} · Contact ${hasContact ? "✓" : "✗"}`,
    "Link About and Contact pages site-wide so people and models can verify who stands behind the content.", 1);

  const noai = /noai|noimageai/.test(metaRobots) || /noai|noimageai/.test(xRobots);
  if (noai) add("geo", L.access, "noai", "noai directive", "info", "Page sets a noai/noimageai directive (honoured by few crawlers).");
  if (/nosnippet/.test(metaRobots) || /nosnippet/.test(xRobots))
    add("geo", L.access, "nosnippet", "nosnippet", "warn", "nosnippet stops Google (incl. AI Overviews) from quoting this page.",
      "Remove nosnippet (or use data-nosnippet on specific sections) if you want to be quoted.", 2);

  // ---- Mobile app (only when the page links to an app or sets a Smart App Banner) ----
  const appleIds = new Set<string>();
  const playIds = new Set<string>();
  $("a[href]").each((_, a) => {
    const h = $(a).attr("href") ?? "";
    const ap = h.match(/(?:apps|itunes)\.apple\.com\/.*?id(\d{5,12})/i);
    if (ap) appleIds.add(ap[1]);
    const gp = h.match(/play\.google\.com\/store\/apps\/details\?(?:[^#]*&)?id=([\w.]+)/i);
    if (gp) playIds.add(gp[1]);
  });
  const smartBanner = $('meta[name="apple-itunes-app" i]').attr("content") ?? "";
  if (appleIds.size || playIds.size || smartBanner) {
    const LA = "Mobile app";
    const json = (r: FetchedResource | null | undefined) => {
      if (!r?.ok) return null;
      try {
        return JSON.parse(r.body) as unknown;
      } catch {
        return null;
      }
    };
    if (appleIds.size || smartBanner) {
      const appId = [...appleIds][0] ?? smartBanner.match(/app-id=(\d+)/)?.[1] ?? "YOUR_APP_ID";
      add("seo", LA, "app-smart-banner", "iPhone Smart App Banner", smartBanner ? "pass" : "warn",
        smartBanner ? "A Smart App Banner is set, so iPhone visitors see an Open or Get bar." : "The page links to the App Store but has no Smart App Banner, so iPhone visitors don't see an Open or Get bar.",
        `Add <meta name="apple-itunes-app" content="app-id=${appId}"> to the <head>.`, 1);
      if (input.appFiles) {
        const j = json(input.appFiles.aasa) as Record<string, unknown> | null;
        const ok = !!j && typeof j === "object" && !!(j.applinks || j.webcredentials || j.appclips);
        add("seo", LA, "app-aasa", "iOS Universal Links file", ok ? "pass" : "warn",
          ok ? "/.well-known/apple-app-site-association is valid." : "No valid apple-app-site-association file, so links to your site open in Safari instead of your app.",
          "Publish /.well-known/apple-app-site-association as JSON with an applinks section for your app, served without redirects.", 1);
      }
    }
    if (playIds.size && input.appFiles) {
      const j = json(input.appFiles.assetlinks);
      const ok = Array.isArray(j) && j.some((x) => (x as { target?: { namespace?: string } })?.target?.namespace === "android_app");
      add("seo", LA, "app-assetlinks", "Android App Links file", ok ? "pass" : "warn",
        ok ? "/.well-known/assetlinks.json is valid." : "No valid assetlinks.json, so links to your site open in the browser instead of your Android app.",
        "Publish /.well-known/assetlinks.json with your package name and signing certificate fingerprint.", 1);
    }
    const appSchema = schemaTypeSet.has("MobileApplication") || schemaTypeSet.has("SoftwareApplication");
    add("seo", LA, "app-schema", "App structured data", appSchema ? "pass" : "warn",
      appSchema ? "MobileApplication or SoftwareApplication schema found." : "The page promotes an app but has no app structured data.",
      "Add MobileApplication JSON-LD with name, operatingSystem, applicationCategory, offers and aggregateRating, using your real store rating.", 1);
  }

  if (input.extraChecks) checks.push(...input.extraChecks.map((c) => ({ ...c, fix: c.status === "pass" ? undefined : c.fix })));

  // ---------- Scoring ----------
  const score = (cat?: Category) => {
    const cs = checks.filter((c) => c.status !== "info" && (!cat || c.category === cat));
    const total = cs.reduce((n, c) => n + c.weight, 0);
    if (!total) return 0;
    const got = cs.reduce((n, c) => n + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
    return Math.round((got / total) * 100);
  };
  // Blockers cap the score: nothing else matters if the page can't be indexed or read.
  const failed = (id: string) => checks.some((c) => c.id === id && c.status === "fail");
  const indexBlocked = failed("indexable") || failed("status") || failed("robots-google");
  const unreadable = failed("server-rendered");
  let seo = score("seo");
  let aeo = score("aeo");
  let geo = score("geo");
  if (indexBlocked) seo = Math.min(seo, 25);
  if (unreadable) {
    aeo = Math.min(aeo, 30);
    geo = Math.min(geo, 40);
  }
  if (failed("ai-search-bots")) geo = Math.min(geo, 35);

  return {
    url: input.requestedUrl,
    auditedAt: new Date().toISOString(),
    scores: { overall: Math.round(seo * 0.45 + aeo * 0.25 + geo * 0.3), seo, aeo, geo },
    checks,
    facts: {
      finalUrl: page.url,
      status: page.status,
      responseMs: page.ms,
      htmlBytes: page.bytes,
      redirects: page.redirects,
      title,
      metaDescription,
      canonical: canonicalRaw,
      h1,
      lang,
      wordCount,
      schemaTypes,
      internalLinks,
      externalLinks,
      images,
      imagesMissingAlt,
      questionHeadings: questionHeads.length,
      robotsTxtFound: robotsFound,
      sitemapUrls: sm?.found ? sm.urlCount : null,
      llmsTxtFound: llmsOk,
      bots,
      outline: headings.slice(0, 15).map((h) => ({ level: h.level, text: spacedText(h.el).slice(0, 140) })),
      textExcerpt: (spacedText(mainEl.get(0)) || bodyText).slice(0, 900),
      rendered: !!page.rendered,
      ...(rawWordCount !== undefined ? { rawWordCount } : {}),
    },
  };
}
