/**
 * "Fix it for me" prices per type of fix, shown in reports as "From $X". Fill in your own amounts
 * (in whole US dollars); a type set to null shows "Get a quote" instead. Nothing is shown as a price
 * until you set it here, so reports never promise a number you haven't chosen.
 */
export type FixType = "access" | "structured" | "meta" | "content" | "speed" | "technical" | "llms";

export const FIX_PRICES: Record<FixType, number | null> = {
  access: null,     // robots.txt and AI crawler access
  structured: null, // schema / structured data
  meta: null,       // titles, descriptions, social previews, favicon
  content: null,    // answers, headings, FAQs, readability
  speed: null,      // speed and Core Web Vitals
  technical: null,  // HTTPS, redirects, canonical, sitemap, hreflang
  llms: null,       // llms.txt, llms-full.txt, Markdown versions
};

export const FIX_LABEL: Record<FixType, string> = {
  access: "Crawler access (robots.txt)",
  structured: "Structured data (schema)",
  meta: "Titles, descriptions and previews",
  content: "Answers and content structure",
  speed: "Speed and Core Web Vitals",
  technical: "Technical SEO",
  llms: "llms.txt and AI-ready pages",
};

const TYPES: [FixType, RegExp][] = [
  ["access", /^(robots-|ai-search-bots|ai-user-bots|ai-training-bots|bing-access|noai|nosnippet)/],
  ["llms", /^(llms-|markdown-alt)/],
  ["structured", /(schema|structured-data|local-business|entity)/],
  ["meta", /^(title|meta-description|open-graph|twitter-card|favicon|brand-consistency)$/],
  ["speed", /^(ttfb|compression|render-blocking|html-size|img-dims)$/],
  ["content", /^(h1|heading-order|question-headings|concise-answers|lead-summary|lists-tables|paragraph-length|readability|word-count|faq-schema|author|date|citations|data-points|trust-pages|alt-text|server-rendered)$/],
  ["technical", /./],
];

export const fixTypeOf = (checkId: string): FixType => TYPES.find(([, re]) => re.test(checkId))![0];

export interface PricedFix { type: FixType; label: string; issues: number; from: number | null }

/** The fix types a page's failed and warning checks need, most issues first, with any "from" price. */
export function pricedFixes(checks: { id: string; status: string }[], prices: Record<FixType, number | null> = FIX_PRICES): PricedFix[] {
  const counts = new Map<FixType, number>();
  for (const c of checks) if (c.status === "fail" || c.status === "warn") counts.set(fixTypeOf(c.id), (counts.get(fixTypeOf(c.id)) ?? 0) + 1);
  return [...counts.entries()].map(([type, issues]) => ({ type, label: FIX_LABEL[type], issues, from: prices[type] })).sort((a, b) => b.issues - a.issues);
}

export const anyFixPrice = (prices: Record<FixType, number | null> = FIX_PRICES) => Object.values(prices).some((p) => typeof p === "number" && p > 0);
