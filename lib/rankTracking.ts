import { db } from "./store";
import { gscQuery } from "./google";

/**
 * Keyword rank tracking from Google Search Console: the team picks keywords for a saved site that
 * is linked to a Search Console property, and once a week (or on "Check now") we store each
 * keyword's average position, clicks and impressions for the last 7 days. These are Google's own
 * numbers for the site, never estimates; a keyword the site doesn't appear for shows "Not ranking".
 */
export const KEYWORDS_PER_SITE = 50;
const DAY = 86400000;

export class RankError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const cleanKeyword = (k: unknown): string | null => {
  if (typeof k !== "string") return null;
  const s = k.trim().toLowerCase().replace(/\s+/g, " ");
  return s.length >= 2 && s.length <= 120 ? s : null;
};

export interface KeywordPoint { week: string; position: number | null; clicks: number; impressions: number }
export interface TrackedKeyword { id: string; keyword: string; points: KeywordPoint[]; latest: KeywordPoint | null; change: number | null }

/** Positions go down when they improve, so "change" is previous minus latest: positive is better. */
export function keywordTrend(points: KeywordPoint[]): { latest: KeywordPoint | null; change: number | null } {
  const sorted = [...points].sort((a, b) => a.week.localeCompare(b.week));
  const latest = sorted.at(-1) ?? null;
  const prev = sorted.at(-2);
  const change = latest?.position != null && prev?.position != null ? Math.round((prev.position - latest.position) * 10) / 10 : null;
  return { latest, change };
}

/** The Monday of a date's week (UTC), used as the week key. */
export function weekOf(d: Date): string {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

async function siteWithGsc(orgId: string, siteId: string): Promise<{ id: string; gsc: string | null }> {
  const { data } = await db().from("sites").select("id, gsc_property").eq("org_id", orgId).eq("id", siteId).maybeSingle();
  if (!data) throw new RankError("Site not found.", 404);
  return { id: data.id as string, gsc: (data.gsc_property as string | null) ?? null };
}

export async function listKeywords(orgId: string, siteId: string): Promise<{ gscLinked: boolean; keywords: TrackedKeyword[] }> {
  const site = await siteWithGsc(orgId, siteId);
  const { data: kws, error } = await db().from("tracked_keywords").select("id, keyword").eq("site_id", site.id).order("created_at");
  if (error) throw new Error(`Database read failed: ${error.message}`);
  if (!kws?.length) return { gscLinked: !!site.gsc, keywords: [] };
  const { data: pts } = await db().from("keyword_positions").select("keyword_id, week, position, clicks, impressions").in("keyword_id", kws.map((k) => k.id)).order("week", { ascending: false }).limit(2000);
  return {
    gscLinked: !!site.gsc,
    keywords: kws.map((k) => {
      const points = (pts ?? []).filter((p) => p.keyword_id === k.id).slice(0, 12).reverse().map((p) => ({ week: p.week as string, position: (p.position as number | null) ?? null, clicks: p.clicks as number, impressions: p.impressions as number }));
      return { id: k.id as string, keyword: k.keyword as string, points, ...keywordTrend(points) };
    }),
  };
}

export async function addKeywords(orgId: string, siteId: string, raw: unknown[]): Promise<number> {
  const site = await siteWithGsc(orgId, siteId);
  const words = [...new Set(raw.map(cleanKeyword).filter((k): k is string => !!k))];
  if (!words.length) throw new RankError("Add at least one keyword (2 to 120 characters).");
  const { count } = await db().from("tracked_keywords").select("id", { count: "exact", head: true }).eq("site_id", site.id);
  const room = KEYWORDS_PER_SITE - (count ?? 0);
  if (room <= 0) throw new RankError(`You can track up to ${KEYWORDS_PER_SITE} keywords per site.`);
  const rows = words.slice(0, room).map((keyword) => ({ org_id: orgId, site_id: site.id, keyword }));
  const { error } = await db().from("tracked_keywords").upsert(rows, { onConflict: "site_id,keyword", ignoreDuplicates: true });
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return rows.length;
}

export async function removeKeyword(orgId: string, id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await db().from("tracked_keywords").delete().eq("org_id", orgId).eq("id", id);
}

/** Keyword ideas: the site's top searches in Search Console over 28 days that aren't tracked yet. */
export async function suggestKeywords(orgId: string, siteId: string): Promise<{ keyword: string; impressions: number; position: number }[]> {
  const site = await siteWithGsc(orgId, siteId);
  if (!site.gsc) return [];
  const end = new Date(Date.now() - 2 * DAY), start = new Date(end.getTime() - 27 * DAY);
  const rows = await gscQuery(orgId, site.gsc, { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), dimensions: ["query"], rowLimit: 50, dataState: "final" });
  const { data: have } = await db().from("tracked_keywords").select("keyword").eq("site_id", site.id);
  const tracked = new Set((have ?? []).map((h) => h.keyword as string));
  return rows.map((r) => ({ keyword: (r.keys?.[0] ?? "").toLowerCase(), impressions: r.impressions, position: Math.round(r.position * 10) / 10 }))
    .filter((r) => r.keyword && !tracked.has(r.keyword)).sort((a, b) => b.impressions - a.impressions).slice(0, 15);
}

/** Last 7 days of Search Console data for every tracked keyword of one site, saved under this week. */
export async function refreshSite(orgId: string, siteId: string): Promise<number> {
  const site = await siteWithGsc(orgId, siteId);
  if (!site.gsc) throw new RankError("Link this site to a Search Console property first (Websites → Search Console and GA4).", 409);
  const { data: kws } = await db().from("tracked_keywords").select("id, keyword").eq("site_id", site.id);
  if (!kws?.length) return 0;
  // Search Console data lags about 2 days.
  const end = new Date(Date.now() - 2 * DAY), start = new Date(end.getTime() - 6 * DAY);
  const rows = await gscQuery(orgId, site.gsc, { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), dimensions: ["query"], rowLimit: 25000, dataState: "all" });
  const byQuery = new Map(rows.map((r) => [(r.keys?.[0] ?? "").toLowerCase(), r]));
  const week = weekOf(new Date());
  const points = kws.map((k) => {
    const r = byQuery.get(k.keyword as string);
    return { keyword_id: k.id, week, position: r ? Math.round(r.position * 10) / 10 : null, clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0 };
  });
  const { error } = await db().from("keyword_positions").upsert(points, { onConflict: "keyword_id,week" });
  if (error) throw new Error(`Database write failed: ${error.message}`);
  await db().from("sites").update({ ranks_checked_at: new Date().toISOString() }).eq("id", site.id);
  return points.length;
}

/** Weekly cron: sites with tracked keywords whose ranks weren't checked in the last 6 days. */
export async function runDueRankChecks(limit = 5): Promise<{ ran: number; errors: string[] }> {
  const cutoff = new Date(Date.now() - 6 * DAY).toISOString();
  const { data: kws } = await db().from("tracked_keywords").select("site_id, org_id").limit(5000);
  const sites = [...new Map((kws ?? []).map((k) => [k.site_id as string, k.org_id as string])).entries()];
  if (!sites.length) return { ran: 0, errors: [] };
  const { data: due } = await db().from("sites").select("id, ranks_checked_at").in("id", sites.map(([id]) => id)).or(`ranks_checked_at.is.null,ranks_checked_at.lt.${cutoff}`).limit(limit);
  let ran = 0;
  const errors: string[] = [];
  for (const s of due ?? []) {
    const org = sites.find(([id]) => id === s.id)?.[1];
    if (!org) continue;
    try {
      await refreshSite(org, s.id as string);
      ran++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { ran, errors };
}
