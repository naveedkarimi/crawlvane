/**
 * Google PageSpeed Insights: turn the raw API response into what the speed test shows.
 * Pure functions (no fetch) so they can be tested against saved Lighthouse output.
 * Handles Lighthouse 13 "insight" audits and the older "opportunity" audits.
 */

export type Strategy = "mobile" | "desktop";
export type Rating = "good" | "ok" | "bad" | "none";
export type Who = "Developer" | "Hosting" | "Content editor" | "Marketing";

export interface Metric {
  key: string;
  label: string;
  value: string;
  rating: Rating;
}

export interface Opportunity {
  id: string;
  /** Plain-English title. */
  title: string;
  /** Lighthouse's own title, to look it up in Google's full report. */
  googleTitle: string;
  /** Human estimate, e.g. "about 0.8 s" or "about 153 KiB". */
  savings: string | null;
  savingsMs: number;
  what: string;
  fix: string;
  who: Who;
}

export interface PsiResult {
  strategy: Strategy;
  url: string;
  testedAt: string;
  lighthouseVersion: string;
  /** Chrome's final screenshot (data URI), used by "What AI sees". */
  screenshot: string | null;
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
  lab: Metric[];
  field: { source: "page" | "origin" | null; overall: Rating; metrics: Metric[] };
  opportunities: Opportunity[];
  /** Link to Google's full report for this URL. */
  reportUrl: string;
}

type Audit = {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  numericValue?: number;
  metricSavings?: Record<string, number>;
  details?: { type?: string; overallSavingsMs?: number; overallSavingsBytes?: number; data?: string };
};

const METRIC_AUDITS = new Set([
  "first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time",
  "cumulative-layout-shift", "interactive", "max-potential-fid", "first-meaningful-paint",
]);

/** Plain-English explanations. Keys cover Lighthouse 13 insights and the older audit ids. */
const PLAIN: { label: string; ids: string[]; what: string; fix: string; who: Who }[] = [
  { label: "Files block the first paint", ids: ["render-blocking-insight", "render-blocking-resources"], who: "Developer",
    what: "Stylesheets and scripts stop the page from showing anything until they finish loading.",
    fix: "Load non-essential scripts with defer or async, inline the small CSS needed for the first screen, and load the rest later." },
  { label: "Too much JavaScript work", ids: ["mainthread-work-breakdown", "bootup-time"], who: "Developer",
    what: "The browser spends a long time running JavaScript, so the page feels frozen and taps respond slowly.",
    fix: "Ship less JavaScript: remove unused libraries, split code by page, and move heavy work off the first load." },
  { label: "Unused or old JavaScript", ids: ["unused-javascript", "legacy-javascript-insight", "legacy-javascript", "duplicated-javascript-insight", "duplicated-javascript"], who: "Developer",
    what: "The page downloads JavaScript it never uses, or old and duplicate code.",
    fix: "Remove unused packages, split bundles per page, and stop shipping old-browser polyfills to modern browsers." },
  { label: "Oversized CSS and scripts", ids: ["unused-css-rules", "unminified-css", "unminified-javascript"], who: "Developer",
    what: "Stylesheets and scripts are bigger than they need to be.",
    fix: "Remove unused CSS and minify CSS and JavaScript in your build." },
  { label: "Images are too large", ids: ["image-delivery-insight", "uses-optimized-images", "modern-image-formats", "uses-responsive-images", "offscreen-images", "efficient-animated-content"], who: "Content editor",
    what: "Images are larger than the screen needs.",
    fix: "Compress images, use WebP or AVIF, serve sizes that fit the screen, and lazy-load images below the first screen." },
  { label: "Short browser cache times", ids: ["cache-insight", "uses-long-cache-ttl"], who: "Hosting",
    what: "Browsers re-download files on every visit because cache times are short.",
    fix: "Set long cache headers (for example one year) on images, fonts, CSS and JavaScript that have versioned file names." },
  { label: "Slow or uncompressed server response", ids: ["document-latency-insight", "server-response-time", "uses-text-compression", "redirects"], who: "Hosting",
    what: "The server is slow to send the page, sends it uncompressed, or redirects first.",
    fix: "Turn on Brotli or gzip, add page caching or a CDN, remove extra redirects, and upgrade hosting if response time stays high." },
  { label: "Main content appears late", ids: ["lcp-discovery-insight", "lcp-breakdown-insight", "lcp-phases-insight", "largest-contentful-paint-element", "prioritize-lcp-image", "lcp-lazy-loaded"], who: "Developer",
    what: "The biggest image or heading on the first screen appears late.",
    fix: "Don't lazy-load the hero image, add fetchpriority=\"high\" to it, and preload it if it is set in CSS." },
  { label: "Invisible text while fonts load", ids: ["font-display-insight", "font-display"], who: "Developer",
    what: "Text stays invisible while web fonts load.",
    fix: "Use font-display: swap and preload the main font file." },
  { label: "Layout jumps while loading", ids: ["cls-culprits-insight", "layout-shifts", "unsized-images", "layout-shift-elements"], who: "Developer",
    what: "Things jump around while the page loads.",
    fix: "Set width and height on images, videos and ads, and reserve space for banners before they load." },
  { label: "Slow third-party scripts", ids: ["third-parties-insight", "third-party-summary", "third-party-facades"], who: "Marketing",
    what: "Third-party scripts such as chat widgets, ads, trackers and embeds slow the page.",
    fix: "Remove the ones you don't need, and load chat and video embeds only when someone clicks them." },
  { label: "Files load in a long chain", ids: ["network-dependency-tree-insight", "critical-request-chains", "uses-rel-preconnect"], who: "Developer",
    what: "Important files are found late because they depend on other files loading first.",
    fix: "Preconnect to key domains, preload critical files, and shorten chains of files that load other files." },
  { label: "Too many HTML elements", ids: ["dom-size-insight", "dom-size"], who: "Developer",
    what: "The page has a very large number of HTML elements, which slows rendering and interaction.",
    fix: "Simplify the markup, and load long lists or hidden sections only when needed." },
  { label: "Slow response to taps and clicks", ids: ["inp-breakdown-insight", "forced-reflow-insight", "long-tasks"], who: "Developer",
    what: "Clicks and taps take a long time to respond.",
    fix: "Break long JavaScript tasks into smaller pieces and avoid reading layout right after changing it." },
  { label: "Heavy page download", ids: ["total-byte-weight"], who: "Developer",
    what: "The page is heavy to download, which hurts visitors on mobile data.",
    fix: "Compress images, remove unused code, and avoid autoplaying video on the first screen." },
  { label: "Not set up for mobile", ids: ["viewport-insight", "viewport"], who: "Developer",
    what: "The page isn't set up for mobile screens, which can delay taps.",
    fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." },
];

const plainFor = (id: string) => PLAIN.find((p) => p.ids.includes(id));

/** First sentence of a Lighthouse description, without markdown links. */
function firstSentence(md = ""): string {
  const text = md.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "").trim();
  const m = text.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : text).slice(0, 220);
}

function kib(audit: Audit): number {
  const bytes = audit.details?.overallSavingsBytes;
  if (typeof bytes === "number" && bytes > 0) return bytes / 1024;
  const m = (audit.displayValue ?? "").replace(/,/g, "").match(/([\d.]+)\s*KiB/i);
  return m ? Number(m[1]) : 0;
}

function timeSavingsMs(audit: Audit): number {
  const ms = audit.metricSavings ?? {};
  const vals = ["LCP", "FCP", "TBT", "INP"].map((k) => (typeof ms[k] === "number" ? ms[k] : 0));
  return Math.max(0, ...vals, audit.details?.overallSavingsMs ?? 0);
}

const fmtSeconds = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 10) * 10} ms`);
const ratingFromScore = (score: number | null | undefined): Rating =>
  typeof score !== "number" ? "none" : score >= 0.9 ? "good" : score >= 0.5 ? "ok" : "bad";
const ratingFromCategory = (c?: string): Rating =>
  c === "FAST" ? "good" : c === "AVERAGE" ? "ok" : c === "SLOW" ? "bad" : "none";

/** The fixes worth showing: failing performance audits, biggest time savings first, then biggest byte savings. */
export function opportunitiesFrom(lr: { audits?: Record<string, Audit>; categories?: Record<string, { auditRefs?: { id: string }[] }> }, limit = 5): Opportunity[] {
  const audits = lr.audits ?? {};
  const refs = lr.categories?.performance?.auditRefs?.map((r) => r.id) ?? Object.keys(audits);
  const rows = refs
    .map((id) => ({ id, a: audits[id] }))
    .filter(({ id, a }) =>
      !!a && !METRIC_AUDITS.has(id) && typeof a.score === "number" && a.score < 0.9 &&
      (a.scoreDisplayMode === "metricSavings" || a.details?.type === "opportunity" || a.scoreDisplayMode === "numeric" || a.scoreDisplayMode === "binary"))
    .map(({ id, a }) => ({ id, a, ms: timeSavingsMs(a), kb: kib(a) }))
    // keep audits that save time or bytes, or that we can explain in plain English
    .filter((r) => r.ms >= 50 || r.kb >= 10 || (!!plainFor(r.id) && (r.a.score ?? 1) < 0.5))
    .sort((x, y) => y.ms - x.ms || y.kb - x.kb);

  // One item per fix: "unused JavaScript" and "legacy JavaScript" share a fix, keep the bigger one.
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const group = plainFor(r.id)?.label ?? r.id;
    if (seen.has(group)) return false;
    seen.add(group);
    return true;
  });

  return unique.slice(0, limit).map(({ id, a, ms, kb }) => {
    const p = plainFor(id);
    const googleTitle = (a.title ?? id).replace(/\u00a0/g, " ");
    return {
      id,
      title: p?.label ?? googleTitle,
      googleTitle,
      savings: ms >= 50 ? `about ${fmtSeconds(ms)}` : kb >= 10 ? `about ${Math.round(kb)} KiB` : null,
      savingsMs: Math.round(ms),
      what: p?.what ?? firstSentence(a.description),
      fix: p?.fix ?? "See Google's full report for the exact files involved.",
      who: p?.who ?? "Developer",
    };
  });
}

type CruxMetric = { percentile?: number; category?: string };
type Crux = { metrics?: Record<string, CruxMetric>; overall_category?: string };

function fieldFrom(page?: Crux, origin?: Crux): PsiResult["field"] {
  const hasData = (c?: Crux) => !!c?.metrics && Object.keys(c.metrics).length > 0;
  const src = hasData(page) ? page : hasData(origin) ? origin : undefined;
  if (!src) return { source: null, overall: "none", metrics: [] };
  const m = src.metrics ?? {};
  const out: Metric[] = [];
  const add = (key: string, label: string, apiKey: string, fmt: (v: number) => string) => {
    const x = m[apiKey];
    if (x && typeof x.percentile === "number") out.push({ key, label, value: fmt(x.percentile), rating: ratingFromCategory(x.category) });
  };
  add("LCP", "Largest Contentful Paint", "LARGEST_CONTENTFUL_PAINT_MS", (v) => fmtSeconds(v));
  add("INP", "Interaction to Next Paint", "INTERACTION_TO_NEXT_PAINT", (v) => `${v} ms`);
  add("CLS", "Cumulative Layout Shift", "CUMULATIVE_LAYOUT_SHIFT_SCORE", (v) => (v / 100).toFixed(2));
  add("FCP", "First Contentful Paint", "FIRST_CONTENTFUL_PAINT_MS", (v) => fmtSeconds(v));
  add("TTFB", "Time to First Byte", "EXPERIMENTAL_TIME_TO_FIRST_BYTE", (v) => fmtSeconds(v));
  return { source: src === page ? "page" : "origin", overall: ratingFromCategory(src.overall_category), metrics: out };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePsi(data: any, strategy: Strategy, url: string): PsiResult {
  const lr = data?.lighthouseResult ?? {};
  const audits: Record<string, Audit> = lr.audits ?? {};
  const cat = (k: string) => Math.round((lr.categories?.[k]?.score ?? 0) * 100);
  const metric = (id: string, key: string, label: string): Metric => ({
    key,
    label,
    value: audits[id]?.displayValue?.replace(/ /g, " ") ?? "n/a",
    rating: ratingFromScore(audits[id]?.score),
  });
  const shot = audits["final-screenshot"]?.details?.data;
  return {
    strategy,
    url,
    testedAt: new Date().toISOString(),
    lighthouseVersion: lr.lighthouseVersion ?? "",
    screenshot: typeof shot === "string" && shot.startsWith("data:image/") ? shot : null,
    scores: { performance: cat("performance"), accessibility: cat("accessibility"), bestPractices: cat("best-practices"), seo: cat("seo") },
    lab: [
      metric("largest-contentful-paint", "LCP", "Largest Contentful Paint"),
      metric("first-contentful-paint", "FCP", "First Contentful Paint"),
      metric("total-blocking-time", "TBT", "Total Blocking Time"),
      metric("cumulative-layout-shift", "CLS", "Cumulative Layout Shift"),
      metric("speed-index", "SI", "Speed Index"),
    ],
    field: fieldFrom(data?.loadingExperience, data?.originLoadingExperience),
    opportunities: opportunitiesFrom(lr).map((o) => ({ ...o, title: o.title.replace(/ /g, " ") })),
    reportUrl: `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}&form_factor=${strategy}`,
  };
}
