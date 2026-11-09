import { insertRow } from "./store";

/**
 * Product statistics: which websites and pages get checked, with which tool, and what
 * failed. Saves the domain and path only, never the query string, IP address, email or
 * anything else that links a check to a person (the privacy policy promises this).
 * Deleted after 12 months by /api/cron.
 */
interface SiteCheck {
  url: string;
  tool: string;
  scores?: Record<string, number>;
  checks?: { id: string; status: string }[];
}

interface SitePage {
  url: string;
  scores: Record<string, number> | object;
  fails: string[];
}

/** "https://www.Example.com/private?token=1" becomes "example.com". */
export function domainOf(url: string): string | null {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** "https://x.com/a/b?token=1#y" becomes "/a/b": never the query string or fragment. */
export function pathOf(url: string): string | null {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).pathname.slice(0, 500);
  } catch {
    return null;
  }
}

const failedIds = (checks: SiteCheck["checks"]) => (checks ?? []).filter((c) => c.status === "fail").map((c) => c.id);

export async function saveSiteCheck({ url, tool, scores, checks }: SiteCheck): Promise<void> {
  const domain = domainOf(url);
  if (!domain) return;
  await insertRow("site_checks", { domain, path: pathOf(url), tool, scores, failed_checks: failedIds(checks) });
}

/** One row for every page a full site report crawled, sent together. */
export async function saveSitePages(pages: SitePage[]): Promise<void> {
  const rows = pages.flatMap((p) => {
    const domain = domainOf(p.url);
    return domain ? [{ domain, path: pathOf(p.url), tool: "full-report", scores: p.scores, failed_checks: p.fails }] : [];
  });
  if (rows.length) await insertRow("site_checks", rows);
}

/** These save in the background: statistics must never slow down or break a check. */
export function recordSiteCheck(check: SiteCheck): void {
  saveSiteCheck(check).catch((e) => console.error("Saving a site check failed:", e));
}

export function recordSitePages(pages: SitePage[]): void {
  saveSitePages(pages).catch((e) => console.error("Saving site pages failed:", e));
}
