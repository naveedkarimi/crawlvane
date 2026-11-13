import type { PageSummary } from "./reportTypes";

/**
 * Extra diagnostics for a full-site report, from data the crawl already collects. None of this
 * changes the report's scores or its issue list: it's a separate, explanatory section.
 *  - Coverage: what happened to every URL found (crawled, failed, blocked, skipped, not reached).
 *  - Page groups: pages sharing a title, description, H1 or exactly the same main text.
 *  - Likely soft 404s: pages that return 200 but read like an error page.
 *  - URL variants: the same page reached with and without a trailing slash, or in other letter case.
 *  - Links to the wrong pages: internal links pointing at noindex pages or at non-canonical URLs.
 *  - Links in and out per page (written onto each PageSummary).
 * Runs on the server and in tests; no imports with side effects.
 */
export type Outcome = "ok" | "redirected" | "failed" | "blocked" | "skipped" | "not-reached";
export interface CoverageRow { url: string; outcome: Outcome; reason: string; depth: number | null }
export interface PageGroup { kind: "title" | "description" | "h1" | "content"; value: string; urls: string[] }
export interface SiteDiagnostics {
  coverage: { discovered: number; ok: number; redirected: number; failed: number; blocked: number; skipped: number; notReached: number; rows: CoverageRow[] };
  groups: PageGroup[];
  soft404: { url: string; reason: string }[];
  urlVariants: { urls: string[]; reason: string }[];
  badLinkTargets: { url: string; reason: string; from: string[] }[];
}

export interface DiagnoseInput {
  seen: { url: string; depth: number }[];
  skipped: string[];
  results: { url: string; status: number; error?: string; blocked?: boolean; redirectedTo?: string; depth: number }[];
  pages: PageSummary[];
  inlinks: Map<string, Set<string>>;
}

const MAX_ROWS = 2000;
const SOFT_404 = /\b(404|not found|page (?:doesn't|does not|can't be|cannot be) (?:exist|found)|no longer (?:available|exists)|nothing (?:was )?found|page missing)\b/i;

const key = (u: string) => {
  try {
    const x = new URL(u);
    return `${x.origin.toLowerCase()}${x.pathname.toLowerCase().replace(/\/+$/, "") || "/"}${x.search}`;
  } catch {
    return u.toLowerCase();
  }
};
const sameUrl = (a: string, b: string) => {
  try {
    const x = new URL(a), y = new URL(b);
    return x.origin === y.origin && (x.pathname.replace(/\/+$/, "") || "/") === (y.pathname.replace(/\/+$/, "") || "/") && x.search === y.search;
  } catch {
    return a === b;
  }
};

export function diagnose(input: DiagnoseInput): SiteDiagnostics {
  const { pages, inlinks } = input;

  // ---------- Coverage ----------
  const byUrl = new Map(input.results.map((r) => [r.url, r]));
  const skipped = new Set(input.skipped);
  const rows: CoverageRow[] = input.seen.map(({ url, depth }) => {
    const d = depth === 9 ? null : depth; // 9 marks "found only in the sitemap"
    const r = byUrl.get(url);
    if (skipped.has(url)) return { url, outcome: "skipped", reason: "Not a web page (a file such as a PDF or feed)", depth: d };
    if (!r) return { url, outcome: "not-reached", reason: "Found, but the crawl reached its page limit first", depth: d };
    if (r.blocked) return { url, outcome: "blocked", reason: "A firewall or bot protection challenged the crawler", depth: d };
    if (r.status >= 400 || r.status === 0) return { url, outcome: "failed", reason: r.status ? `Returned HTTP ${r.status}` : r.error || "Couldn't load", depth: d };
    if (r.redirectedTo) return { url, outcome: "redirected", reason: `Redirects to ${r.redirectedTo}`, depth: d };
    return { url, outcome: "ok", reason: "Crawled and audited", depth: d };
  });
  const count = (o: Outcome) => rows.filter((r) => r.outcome === o).length;
  const coverage = { discovered: rows.length, ok: count("ok"), redirected: count("redirected"), failed: count("failed"), blocked: count("blocked"), skipped: count("skipped"), notReached: count("not-reached"), rows: rows.slice(0, MAX_ROWS) };

  // ---------- Page groups ----------
  const live = pages.filter((p) => p.status === 200 && !p.noindex);
  const groups: PageGroup[] = [];
  const groupBy = (kind: PageGroup["kind"], pick: (p: PageSummary) => string | undefined, label: (p: PageSummary) => string) => {
    const m = new Map<string, PageSummary[]>();
    for (const p of live) {
      const v = pick(p)?.trim().toLowerCase();
      if (v) m.set(v, [...(m.get(v) ?? []), p]);
    }
    for (const list of m.values()) if (list.length > 1) groups.push({ kind, value: label(list[0]), urls: list.map((p) => p.url) });
  };
  groupBy("content", (p) => p.textKey, (p) => `Same main text (${p.wordCount} words)`);
  groupBy("title", (p) => p.title, (p) => p.title);
  groupBy("h1", (p) => p.h1, (p) => p.h1);
  groupBy("description", (p) => p.description, (p) => p.description);
  groups.sort((a, b) => (a.kind === "content" ? -1 : 0) - (b.kind === "content" ? -1 : 0) || b.urls.length - a.urls.length);

  // ---------- Likely soft 404s ----------
  const soft404 = pages
    .filter((p) => p.status === 200)
    .flatMap((p) => {
      const hit = SOFT_404.exec(`${p.title} ${p.h1}`);
      if (hit) return [{ url: p.url, reason: `Returns 200, but its title or heading says "${hit[0]}"` }];
      if (p.wordCount > 0 && p.wordCount < 30 && !p.noindex && p.depth > 0) return [{ url: p.url, reason: `Returns 200 with only ${p.wordCount} words of text` }];
      return [];
    });

  // ---------- URL variants ----------
  const variants = new Map<string, Set<string>>();
  for (const { url } of input.seen) {
    const k = key(url);
    if (!variants.has(k)) variants.set(k, new Set());
    variants.get(k)!.add(url);
  }
  const urlVariants = [...variants.values()]
    .filter((set) => set.size > 1)
    .map((set) => {
      const urls = [...set];
      const slash = urls.some((u) => /\/$/.test(new URL(u).pathname)) && urls.some((u) => !/\/$/.test(new URL(u).pathname) && new URL(u).pathname !== "/");
      return { urls, reason: slash ? "Linked both with and without a trailing slash" : "Linked with different letter case" };
    });

  // ---------- Links to the wrong pages ----------
  const badLinkTargets: SiteDiagnostics["badLinkTargets"] = [];
  for (const p of pages) {
    const from = [...(inlinks.get(p.url) ?? [])].filter((f) => f !== p.url);
    if (!from.length || p.status !== 200) continue;
    if (p.noindex) badLinkTargets.push({ url: p.url, reason: "This page is noindex, but other pages link to it", from: from.slice(0, 5) });
    else if (p.canonical && !sameUrl(p.canonical, p.url)) badLinkTargets.push({ url: p.url, reason: `Its canonical is ${p.canonical}; link there instead`, from: from.slice(0, 5) });
  }

  // ---------- Links in and out ----------
  const out = new Map<string, number>();
  for (const sources of inlinks.values()) for (const s of sources) out.set(s, (out.get(s) ?? 0) + 1);
  for (const p of pages) p.outlinks = out.get(p.url) ?? 0;

  return { coverage, groups: groups.slice(0, 100), soft404: soft404.slice(0, 200), urlVariants: urlVariants.slice(0, 200), badLinkTargets: badLinkTargets.slice(0, 200) };
}

/** CSV of the coverage rows, for the report's export button. */
export function coverageCsv(d: SiteDiagnostics): string {
  const cell = (v: unknown) => {
    let s = String(v ?? "").replace(/\r?\n/g, " ");
    if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
    return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [["URL", "Outcome", "Reason", "Click depth"], ...d.coverage.rows.map((r) => [r.url, r.outcome, r.reason, r.depth ?? "sitemap only"])].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
