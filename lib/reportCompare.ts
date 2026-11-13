/**
 * Compare two full reports of the same site, and pick a report's top issues for its summary.
 * Pure: runs on the server and in the browser. Scores are compared as they are; nothing is recalculated.
 */
interface ReportLike {
  createdAt: string;
  site?: { scores: { overall: number; seo: number; aeo: number; geo: number }; issues: { id: string; title: string; status: string; weight: number; count: number; category: string }[]; pages: { url: string }[] };
}
export interface ReportDiff {
  from: string;
  to: string;
  scores: { overall: number; seo: number; aeo: number; geo: number };
  newIssues: { id: string; title: string; status: string; count: number }[];
  resolved: { id: string; title: string }[];
  worse: { id: string; title: string; before: number; after: number }[];
  better: { id: string; title: string; before: number; after: number }[];
  pagesAdded: number;
  pagesGone: number;
}

export function compareReports(older: ReportLike, newer: ReportLike): ReportDiff | null {
  if (!older.site || !newer.site) return null;
  const a = new Map(older.site.issues.map((i) => [i.id, i]));
  const b = new Map(newer.site.issues.map((i) => [i.id, i]));
  const diffScore = (k: "overall" | "seo" | "aeo" | "geo") => newer.site!.scores[k] - older.site!.scores[k];
  const urls = (r: ReportLike) => new Set(r.site!.pages.map((p) => p.url));
  const ua = urls(older), ub = urls(newer);
  return {
    from: older.createdAt,
    to: newer.createdAt,
    scores: { overall: diffScore("overall"), seo: diffScore("seo"), aeo: diffScore("aeo"), geo: diffScore("geo") },
    newIssues: [...b.values()].filter((i) => !a.has(i.id)).map((i) => ({ id: i.id, title: i.title, status: i.status, count: i.count })),
    resolved: [...a.values()].filter((i) => !b.has(i.id)).map((i) => ({ id: i.id, title: i.title })),
    worse: [...b.values()].flatMap((i) => (a.has(i.id) && i.count > a.get(i.id)!.count ? [{ id: i.id, title: i.title, before: a.get(i.id)!.count, after: i.count }] : [])),
    better: [...b.values()].flatMap((i) => (a.has(i.id) && i.count < a.get(i.id)!.count ? [{ id: i.id, title: i.title, before: a.get(i.id)!.count, after: i.count }] : [])),
    pagesAdded: [...ub].filter((u) => !ua.has(u)).length,
    pagesGone: [...ua].filter((u) => !ub.has(u)).length,
  };
}

/** The issues to lead a summary with: failures first, then the heaviest and most widespread. */
export function topIssues<T extends { status: string; weight: number; count: number }>(issues: T[], n = 3): T[] {
  return [...issues].sort((x, y) => (x.status === "fail" ? 0 : 1) - (y.status === "fail" ? 0 : 1) || y.weight * Math.log2(1 + y.count) - x.weight * Math.log2(1 + x.count)).slice(0, n);
}
