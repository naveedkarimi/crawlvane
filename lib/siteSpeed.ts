import { parsePsi, type PsiResult, type Rating } from "./pagespeed";
import type { PageSummary } from "./reportTypes";

/**
 * Speed across a site's most important pages, not just the homepage. After the crawl, a full report
 * tests the top pages (homepage first, then the shallowest pages with the most internal links) with
 * Google PageSpeed on mobile, two at a time. Runs only when PAGESPEED_API_KEY is set: without a key
 * Google's shared quota runs out quickly and the results would be mostly errors.
 */
export const SPEED_PAGES = 5;

export interface PageSpeed {
  url: string;
  performance: number | null;
  rating: Rating;
  lcp: string | null;
  cls: string | null;
  tbt: string | null;
  /** Real-visitor data from Chrome, when Google has enough of it. */
  field: Rating;
  reportUrl: string;
  error?: string;
}

export interface SiteSpeed {
  strategy: "mobile";
  testedAt: string;
  pages: PageSpeed[];
  /** Average performance score of the pages that tested, 0 to 100. */
  average: number | null;
  /** Fixes PageSpeed suggested on more than one page: fixing them once usually helps them all. */
  shared: { title: string; pages: number; who: string }[];
}

export const speedEnabled = () => !!process.env.PAGESPEED_API_KEY?.trim();

export const ratingFor = (score: number | null): Rating => (score === null ? "none" : score >= 90 ? "good" : score >= 50 ? "ok" : "bad");

/** Homepage first, then indexable 200 pages by click depth and internal links. */
export function pickSpeedPages(pages: PageSummary[], homeUrl: string, n = SPEED_PAGES): string[] {
  const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/+$/, "");
  const picked = [homeUrl];
  const candidates = pages
    .filter((p) => p.status === 200 && !p.noindex && !p.error)
    .sort((a, b) => a.depth - b.depth || b.inlinks - a.inlinks || a.url.length - b.url.length);
  for (const p of candidates) {
    if (picked.length >= n) break;
    if (!picked.some((u) => norm(u) === norm(p.url))) picked.push(p.url);
  }
  return picked.slice(0, n);
}

export function pageSpeedFrom(r: PsiResult): PageSpeed {
  const lab = (k: string) => r.lab.find((m) => m.key === k)?.value ?? null;
  return { url: r.url, performance: r.scores.performance, rating: ratingFor(r.scores.performance), lcp: lab("LCP"), cls: lab("CLS"), tbt: lab("TBT"), field: r.field.overall, reportUrl: r.reportUrl };
}

/** Totals for the table: the average, and the suggestions that came up on several pages. */
export function summariseSpeed(results: { page: PageSpeed; psi?: PsiResult }[]): Omit<SiteSpeed, "strategy" | "testedAt"> {
  const ok = results.filter((r) => r.page.performance !== null);
  const counts = new Map<string, { pages: number; who: string }>();
  for (const r of results) {
    for (const o of r.psi?.opportunities ?? []) {
      const c = counts.get(o.title) ?? { pages: 0, who: o.who };
      c.pages++;
      counts.set(o.title, c);
    }
  }
  return {
    pages: results.map((r) => r.page),
    average: ok.length ? Math.round(ok.reduce((n, r) => n + (r.page.performance ?? 0), 0) / ok.length) : null,
    shared: [...counts.entries()].filter(([, c]) => c.pages > 1).sort((a, b) => b[1].pages - a[1].pages).slice(0, 5).map(([title, c]) => ({ title, pages: c.pages, who: c.who })),
  };
}

async function testOne(url: string): Promise<{ page: PageSpeed; psi?: PsiResult }> {
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", "mobile");
  api.searchParams.append("category", "performance");
  api.searchParams.set("key", process.env.PAGESPEED_API_KEY?.trim() ?? "");
  const fail = (error: string) => ({ page: { url, performance: null, rating: "none" as Rating, lcp: null, cls: null, tbt: null, field: "none" as Rating, reportUrl: `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}&form_factor=mobile`, error } });
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(58000) });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.lighthouseResult) return fail(res.status === 429 ? "Google's speed test quota ran out. Try again later." : "Google couldn't test this page.");
    const psi = parsePsi(data, "mobile", url);
    return { page: pageSpeedFrom(psi), psi };
  } catch {
    return fail("Google's speed test timed out.");
  }
}

/** Tests the pages two at a time and reports progress after each one. */
export async function siteSpeed(urls: string[], onProgress?: (done: number, total: number) => Promise<void> | void): Promise<SiteSpeed> {
  const results: { page: PageSpeed; psi?: PsiResult }[] = new Array(urls.length);
  let next = 0, done = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      results[i] = await testOne(urls[i]);
      done++;
      await onProgress?.(done, urls.length);
    }
  };
  await Promise.all([worker(), worker()]);
  return { strategy: "mobile", testedAt: new Date().toISOString(), ...summariseSpeed(results) };
}
