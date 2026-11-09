import * as cheerio from "cheerio";

/**
 * Checks JSON-LD beyond "does it parse": properties Google requires for a rich result,
 * template text left in by mistake, relative URLs and types that no longer earn a rich result.
 * Rules are limited to what Google documents as required, so a page isn't marked down for
 * leaving out something optional. Pure, apart from parsing HTML: no network.
 */
type Obj = Record<string, unknown>;

export interface SchemaReview {
  /** Top-level JSON-LD items looked at. */
  checked: number;
  issues: string[];
  /** Types on the page that Google no longer shows as rich results. */
  retired: string[];
}

/** Sources: Google's changelog (FAQ, 2026; HowTo, 2023) and "Simplifying search results" (June 2025). */
const RETIRED = new Set(["FAQPage", "HowTo", "SpecialAnnouncement", "ClaimReview"]);

const URL_KEYS = new Set(["url", "logo", "image", "sameAs", "item", "thumbnailUrl", "contentUrl", "embedUrl"]);
const IMAGE_KEYS = new Set(["image", "logo", "thumbnailUrl"]);
const LONG_TEXT_KEYS = new Set(["articleBody", "text", "reviewBody", "@context", "@type"]);

const PLACEHOLDERS = [
  /^\s*[[<{]\s*[A-Za-z][\w\s-]{1,40}[\]>}]\s*$/, // [Business Name], <name>, {title}
  /\{\{[^}]+\}\}|%%[a-z_]+%%|\$\{[^}]+\}/i, // template tags that were never filled in
  /lorem ipsum/i,
  /^(your|my)[\s_-]+(company|business|brand|name|site|website|logo|phone|email|title|url)\b/i,
  /^(todo|tbd|placeholder|insert .{1,30} here|x{3,})$/i,
  /\b(555[-.\s]?555[-.\s]?5555|123[-.\s]?456[-.\s]?7890)\b/,
];
const EXAMPLE_URL = /^https?:\/\/(www\.)?(example\.(com|org|net)|yourdomain\.com|yoursite\.com|your-site\.com)(\/|$|#|\?)/i;
const RELATIVE_URL = /^(\/|\.\.?\/|[\w-]+\.(png|jpe?g|webp|svg|gif|avif)$)/i;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const typesOf = (o: Obj) => list(o["@type"]).filter((t): t is string => typeof t === "string");
const has = (o: Obj, key: string) => {
  const v = o[key];
  return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
};

/** Items at the top level of each block: array entries and @graph members. */
function rootNodes(blocks: unknown[]): { nodes: Obj[]; contextless: number } {
  const nodes: Obj[] = [];
  let contextless = 0;
  for (const block of blocks.flatMap(list)) {
    if (!isObj(block)) continue;
    if (!/schema\.org/i.test(JSON.stringify(block["@context"] ?? ""))) contextless++;
    if (block["@type"]) nodes.push(block);
    nodes.push(...list(block["@graph"]).filter(isObj));
  }
  return { nodes, contextless };
}

function ratingGaps(o: Obj): string[] {
  const gaps = has(o, "ratingValue") ? [] : ["ratingValue"];
  if (!has(o, "ratingCount") && !has(o, "reviewCount")) gaps.push("ratingCount or reviewCount");
  return gaps;
}

function offerGaps(o: Obj): string[] {
  if (typesOf(o).includes("AggregateOffer")) return ["lowPrice", "priceCurrency"].filter((k) => !has(o, k));
  return has(o, "price") || has(o, "priceSpecification") ? [] : ["price"];
}

function requiredGaps(node: Obj): string[] {
  const types = typesOf(node);
  const need = (...keys: string[]) => keys.filter((k) => !has(node, k));
  const gaps: string[] = [];
  if (types.includes("Product")) {
    gaps.push(...need("name"));
    if (!has(node, "offers") && !has(node, "review") && !has(node, "aggregateRating")) gaps.push("offers, review or aggregateRating");
    for (const offer of list(node.offers).filter(isObj)) gaps.push(...offerGaps(offer).map((g) => `offers.${g}`));
    for (const rating of list(node.aggregateRating).filter(isObj)) gaps.push(...ratingGaps(rating).map((g) => `aggregateRating.${g}`));
  }
  if (types.includes("AggregateRating")) gaps.push(...ratingGaps(node), ...need("itemReviewed"));
  if (types.includes("Review")) gaps.push(...need("author", "reviewRating", "itemReviewed"));
  if (types.includes("BreadcrumbList")) {
    const items = list(node.itemListElement).filter(isObj);
    if (!items.length) gaps.push("itemListElement");
    items.forEach((li, i) => {
      const inner = isObj(li.item) ? li.item : {};
      if (!has(li, "position")) gaps.push(`position on item ${i + 1}`);
      if (!has(li, "name") && !has(inner, "name")) gaps.push(`name on item ${i + 1}`);
      if (i < items.length - 1 && !has(li, "item")) gaps.push(`item on item ${i + 1}`);
    });
  }
  if (types.some((t) => /Event$/.test(t))) gaps.push(...need("name", "startDate", "location"));
  if (types.includes("JobPosting")) {
    gaps.push(...need("title", "description", "datePosted", "hiringOrganization"));
    if (!has(node, "jobLocation") && !has(node, "jobLocationType")) gaps.push("jobLocation");
  }
  if (types.includes("VideoObject")) gaps.push(...need("name", "thumbnailUrl", "uploadDate"));
  if (types.includes("Recipe")) gaps.push(...need("name", "image"));
  return [...new Set(gaps)];
}

function walkStrings(v: unknown, key: string, visit: (value: string, key: string) => void, depth = 0) {
  if (depth > 10 || v === null || v === undefined) return;
  if (typeof v === "string") return visit(v, key);
  if (Array.isArray(v)) return v.forEach((x) => walkStrings(x, key, visit, depth + 1));
  if (isObj(v)) for (const [k, x] of Object.entries(v)) if (!LONG_TEXT_KEYS.has(k)) walkStrings(x, k, visit, depth + 1);
}

const short = (s: string) => (s.length > 60 ? `${s.slice(0, 57)}...` : s);

export function reviewSchema(blocks: unknown[], pageUrl: string): SchemaReview {
  const { nodes, contextless } = rootNodes(blocks);
  const issues: string[] = [];
  const pageHost = new URL(pageUrl).hostname.replace(/^www\./, "");
  if (contextless) issues.push(`${contextless} JSON-LD block${contextless === 1 ? " has" : "s have"} no schema.org @context, so it can't be read as Schema.org.`);

  for (const node of nodes) {
    const gaps = requiredGaps(node);
    if (!gaps.length) continue;
    const name = typeof node.name === "string" && node.name ? ` "${short(node.name)}"` : "";
    issues.push(`${typesOf(node)[0]}${name} is missing ${gaps.join(", ")}.`);
  }

  const placeholders = new Set<string>();
  const relative = new Set<string>();
  walkStrings(blocks, "", (value, key) => {
    const v = value.trim();
    if (!v) return;
    if (PLACEHOLDERS.some((re) => re.test(v))) placeholders.add(v);
    const isUrlKey = URL_KEYS.has(key);
    if ((isUrlKey || key === "@id") && EXAMPLE_URL.test(v) && !["example.com", "example.org", "example.net"].includes(pageHost)) placeholders.add(v);
    if (isUrlKey && RELATIVE_URL.test(v)) relative.add(v);
  });
  if (placeholders.size) issues.push(`Template text left in: ${[...placeholders].slice(0, 3).map((p) => `"${short(p)}"`).join(", ")}.`);
  if (relative.size) issues.push(`Relative URLs, which should be full https:// addresses: ${[...relative].slice(0, 3).map(short).join(", ")}.`);

  const retired = [...new Set(nodes.flatMap(typesOf).filter((t) => RETIRED.has(t)))];
  return { checked: nodes.length, issues, retired };
}

/** JSON-LD blocks that parse. Broken ones are reported separately by the analyzer. */
export function jsonLdBlocks(html: string): unknown[] {
  const $ = cheerio.load(html);
  const out: unknown[] = [];
  $('script[type="application/ld+json" i]').each((_, el) => {
    try {
      out.push(JSON.parse($(el).contents().text()));
    } catch {
      /* reported as a parse failure by the analyzer */
    }
  });
  return out;
}

/** Image and logo addresses named in the schema, as absolute URLs, for a does-it-exist check. */
export function schemaImageUrls(blocks: unknown[], pageUrl: string, limit = 4): string[] {
  const found = new Set<string>();
  const add = (value: unknown) => {
    if (found.size >= limit) return;
    if (isObj(value)) return [value.url, value.contentUrl].forEach(add);
    if (Array.isArray(value)) return value.forEach(add);
    if (typeof value !== "string" || !value.trim() || /^data:/i.test(value)) return;
    try {
      const u = new URL(value.trim(), pageUrl);
      if (/^https?:$/.test(u.protocol)) found.add(u.toString());
    } catch {
      /* not a URL */
    }
  };
  const walk = (v: unknown, depth: number) => {
    if (depth > 8) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (!isObj(v)) return;
    for (const [k, x] of Object.entries(v)) {
      if (IMAGE_KEYS.has(k)) add(x);
      else if (typeof x === "object") walk(x, depth + 1);
    }
  };
  walk(blocks, 0);
  return [...found];
}
