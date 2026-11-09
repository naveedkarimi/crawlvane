import { normalizeUrl } from "./crawl";
import type { AuditResult } from "./types";

/**
 * Change detection for monitoring. A score can hold steady while a page quietly loses its
 * canonical, title or schema, so each run is compared field by field with the last one.
 * Pure functions: lib/monitor.ts does the crawling, storing and emailing.
 */
export interface PageSnapshot {
  status: number;
  /** False when the page didn't load, so the fields below say nothing about it. */
  hasContent: boolean;
  redirectedTo?: string;
  title: string;
  description: string;
  canonical: string;
  h1: string;
  noindex: boolean;
  robotsBlocked: boolean;
  openGraph: boolean;
  schemaTypes: string[];
}

export type Baseline = Record<string, PageSnapshot>;

export interface Change {
  url: string;
  severity: "critical" | "warning";
  rule: string;
  title: string;
  before: string;
  after: string;
}

const EMPTY = { title: "", description: "", canonical: "", h1: "", noindex: false, robotsBlocked: false, openGraph: false, schemaTypes: [] as string[] };
const clean = (s: string, max = 300) => s.replace(/\s+/g, " ").trim().slice(0, max);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/** A definite failure. 403, 429 and network errors are usually our crawler being turned away. */
const broken = (status: number) => status === 404 || status === 410 || status >= 500;

export function snapshotFromAudit(a: AuditResult, redirectedTo?: string): PageSnapshot {
  const failed = (id: string) => a.checks.some((c) => c.id === id && c.status === "fail");
  const hasContent = a.facts.status < 400;
  if (!hasContent) return { ...EMPTY, status: a.facts.status, hasContent, redirectedTo };
  return {
    status: a.facts.status,
    hasContent,
    redirectedTo,
    title: clean(a.facts.title),
    description: clean(a.facts.metaDescription),
    canonical: a.facts.canonical ? (normalizeUrl(a.facts.canonical, a.facts.finalUrl) ?? a.facts.canonical) : "",
    h1: clean(a.facts.h1[0] ?? ""),
    noindex: failed("indexable"),
    robotsBlocked: failed("robots-google"),
    openGraph: a.checks.some((c) => c.id === "open-graph" && c.status === "pass"),
    schemaTypes: [...a.facts.schemaTypes].sort(),
  };
}

type CrawlEntry = { audit?: AuditResult; status: number; redirectedTo?: string; blocked?: boolean };

/** A null entry means we couldn't tell this time (blocked or a network error): keep what we had. */
export function snapshotsFromCrawl(results: Map<string, CrawlEntry>): Record<string, PageSnapshot | null> {
  const out: Record<string, PageSnapshot | null> = {};
  for (const [url, r] of results) {
    if (r.audit) out[url] = snapshotFromAudit(r.audit, r.redirectedTo);
    else out[url] = r.blocked || !broken(r.status) ? null : { ...EMPTY, status: r.status, hasContent: false };
  }
  return out;
}

function diffPage(url: string, was: PageSnapshot, now: PageSnapshot): Change[] {
  const changes: Change[] = [];
  const add = (severity: Change["severity"], rule: string, title: string, before: string, after: string) =>
    changes.push({ url, severity, rule, title, before, after });

  if (broken(now.status) && !broken(was.status)) {
    add("critical", "page-error", "Page stopped loading", `HTTP ${was.status}`, `HTTP ${now.status}`);
    return changes;
  }
  if ((now.redirectedTo ?? "") !== (was.redirectedTo ?? "")) {
    if (now.redirectedTo) add("warning", "now-redirects", "Page now redirects", was.redirectedTo ?? url, now.redirectedTo);
    return changes;
  }
  if (!was.hasContent || !now.hasContent) return changes;

  if (now.noindex && !was.noindex) add("critical", "noindex-added", "Page was set to noindex", "indexable", "noindex");
  if (now.robotsBlocked && !was.robotsBlocked) add("critical", "robots-blocked", "robots.txt now blocks Googlebot", "allowed", "blocked");

  if (was.canonical && !now.canonical) add("critical", "canonical-removed", "Canonical tag removed", was.canonical, "(none)");
  else if (was.canonical && now.canonical !== was.canonical) add("critical", "canonical-changed", "Canonical URL changed", was.canonical, now.canonical);

  if (was.title && !now.title) add("critical", "title-removed", "Title removed", was.title, "(none)");
  else if (now.title && was.title && !same(was.title, now.title)) add("warning", "title-changed", "Title changed", was.title, now.title);

  if (was.h1 && !now.h1) add("critical", "h1-removed", "H1 removed", was.h1, "(none)");
  else if (now.h1 && was.h1 && !same(was.h1, now.h1)) add("warning", "h1-changed", "H1 changed", was.h1, now.h1);

  if (was.description && !now.description) add("warning", "description-removed", "Meta description removed", was.description, "(none)");
  else if (now.description && was.description && !same(was.description, now.description)) add("warning", "description-changed", "Meta description changed", was.description, now.description);

  const lostSchema = was.schemaTypes.filter((t) => !now.schemaTypes.includes(t));
  if (lostSchema.length) add("warning", "schema-removed", "Structured data removed", lostSchema.join(", "), now.schemaTypes.join(", ") || "(none)");
  if (was.openGraph && !now.openGraph) add("warning", "open-graph-removed", "Open Graph tags incomplete", "complete", "incomplete");
  return changes;
}

/** Changes on pages seen in both runs, most serious first. */
export function diffBaseline(baseline: Baseline, current: Record<string, PageSnapshot | null>): Change[] {
  const changes: Change[] = [];
  for (const [url, now] of Object.entries(current)) {
    const was = baseline[url];
    if (was && now) changes.push(...diffPage(url, was, now));
  }
  return changes.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}

/**
 * What the next run compares against. Each change is reported once, then becomes the new normal.
 * A failed page keeps its last good content, so a change made during an outage still shows up.
 */
export function nextBaseline(baseline: Baseline, current: Record<string, PageSnapshot | null>): Baseline {
  const next: Baseline = {};
  for (const [url, now] of Object.entries(current)) {
    const was = baseline[url];
    if (!now) {
      if (was) next[url] = was;
    } else if (was && !now.hasContent && was.hasContent) next[url] = { ...was, status: now.status, redirectedTo: now.redirectedTo };
    else next[url] = now;
  }
  return next;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Page titles come from the site being monitored, so everything is escaped for the HTML email. */
export function renderChanges(changes: Change[], limit = 10): { text: string[]; html: string } {
  const shown = changes.slice(0, limit);
  const more = changes.length - shown.length;
  const label = (c: Change) => (c.severity === "critical" ? "Important" : "Changed");
  const text = shown.map((c) => `• [${label(c)}] ${c.title}: ${c.url}\n  Was: ${c.before}\n  Now: ${c.after}`);
  if (more > 0) text.push(`...and ${more} more.`);
  const items = shown.map((c) => `<li><b>${esc(c.title)}</b> <a href="${esc(c.url)}">${esc(c.url)}</a><br>Was: ${esc(c.before)}<br>Now: ${esc(c.after)}</li>`);
  return { text, html: `<ul>${items.join("")}</ul>${more > 0 ? `<p>...and ${more} more.</p>` : ""}` };
}
