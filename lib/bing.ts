import { db } from "./store";
import { decrypt, encrypt } from "./google";

/**
 * Bing Webmaster Tools, read-only. A team owner pastes the API key from Bing Webmaster Tools
 * (Settings → API access). The key is stored encrypted with TOKEN_ENCRYPTION_KEY, like the Google
 * token. Search data is fetched when someone looks at it and isn't stored.
 * Bing's API wraps every answer in { d: … } and dates look like "/Date(1316156400000-0700)/".
 */
const BASE = "https://ssl.bing.com/webmaster/api.svc/json/";

export class BingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const bingConfigured = () => !!process.env.TOKEN_ENCRYPTION_KEY?.trim();
export const isBingKey = (k: unknown): k is string => typeof k === "string" && /^[A-Za-z0-9]{20,64}$/.test(k.trim());
export const isBingSiteUrl = (u: unknown): u is string => typeof u === "string" && /^https?:\/\/[^\s/]{3,253}(\/[^\s]{0,300})?$/i.test(u);

async function call<T>(apiKey: string, method: string, params: Record<string, string> = {}): Promise<T> {
  const u = new URL(BASE + method);
  u.searchParams.set("apikey", apiKey);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(u, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  } catch {
    // Never pass the error on: it could contain the URL, and the URL contains the key.
    throw new BingError("Couldn't reach Bing. Try again in a minute.", 502);
  }
  const j = (await res.json().catch(() => ({}))) as { d?: T; Message?: string };
  if (res.status === 401 || res.status === 403 || /api ?key|not authori[sz]ed|invalid.*key/i.test(j.Message ?? ""))
    throw new BingError("Bing didn't accept that API key. Copy it again from Bing Webmaster Tools → Settings → API access.", 400);
  if (!res.ok) throw new BingError(`Bing said: ${(j.Message ?? String(res.status)).slice(0, 200)}`, 502);
  return j.d as T;
}

// ---------- Connection ----------
export async function connectBing(orgId: string, rawKey: string): Promise<number> {
  const key = rawKey.trim();
  if (!isBingKey(key)) throw new BingError("That doesn't look like a Bing API key. It's a long string of letters and numbers.");
  const sites = await call<{ Url: string }[]>(key, "GetUserSites");
  const { error } = await db().from("bing_connections").upsert({ org_id: orgId, api_key: encrypt(key) });
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return sites?.length ?? 0;
}

export async function bingConnected(orgId: string): Promise<boolean> {
  const { data } = await db().from("bing_connections").select("org_id").eq("org_id", orgId).maybeSingle();
  return !!data;
}

export async function disconnectBing(orgId: string): Promise<void> {
  await db().from("bing_connections").delete().eq("org_id", orgId);
  await db().from("sites").update({ bing_site: null }).eq("org_id", orgId);
}

async function apiKey(orgId: string): Promise<string> {
  const { data } = await db().from("bing_connections").select("api_key").eq("org_id", orgId).maybeSingle();
  if (!data?.api_key) throw new BingError("Connect Bing first.", 409);
  return decrypt(data.api_key as string);
}

export async function listBingSites(orgId: string): Promise<{ url: string; verified: boolean }[]> {
  const sites = await call<{ Url: string; IsVerified?: boolean }[]>(await apiKey(orgId), "GetUserSites");
  return (sites ?? []).map((s) => ({ url: s.Url, verified: s.IsVerified !== false }));
}

export async function setBingSite(orgId: string, siteId: string, url: string | null): Promise<void> {
  if (url && !isBingSiteUrl(url)) throw new BingError("Unknown Bing site.");
  const { data, error } = await db().from("sites").update({ bing_site: url }).eq("org_id", orgId).eq("id", siteId).select("id");
  if (error) throw new Error(`Database write failed: ${error.message}`);
  if (!data?.length) throw new BingError("Site not found.", 404);
}

// ---------- Data ----------
export interface BingRow { Date: string; Clicks: number; Impressions: number; Query?: string; AvgImpressionPosition?: number }
export interface BingData {
  days: number;
  clicks: number;
  impressions: number;
  ctr: number;
  queries: { query: string; clicks: number; impressions: number; position: number | null }[];
  pages: { page: string; clicks: number; impressions: number }[];
}

/** "/Date(1316156400000-0700)/" → milliseconds, or NaN. */
export const bingDate = (d: string | undefined): number => {
  const m = /\/Date\((-?\d+)/.exec(d ?? "");
  return m ? Number(m[1]) : NaN;
};

/** Adds up Bing's weekly rows from `since` onwards. Positions are averaged by impressions. */
export function summariseBing(traffic: BingRow[], queries: BingRow[], pages: BingRow[], since: number, days: number): BingData {
  const recent = (rows: BingRow[]) => rows.filter((r) => bingDate(r.Date) >= since);
  const t = recent(traffic);
  const clicks = t.reduce((n, r) => n + (r.Clicks || 0), 0);
  const impressions = t.reduce((n, r) => n + (r.Impressions || 0), 0);
  const group = (rows: BingRow[]) => {
    const m = new Map<string, { clicks: number; impressions: number; posSum: number; posWeight: number }>();
    for (const r of recent(rows)) {
      const k = (r.Query ?? "").trim();
      if (!k) continue;
      const g = m.get(k) ?? { clicks: 0, impressions: 0, posSum: 0, posWeight: 0 };
      g.clicks += r.Clicks || 0;
      g.impressions += r.Impressions || 0;
      if (r.AvgImpressionPosition && r.AvgImpressionPosition > 0 && r.Impressions) {
        g.posSum += r.AvgImpressionPosition * r.Impressions;
        g.posWeight += r.Impressions;
      }
      m.set(k, g);
    }
    return [...m.entries()].sort((a, b) => b[1].clicks - a[1].clicks || b[1].impressions - a[1].impressions).slice(0, 10);
  };
  return {
    days,
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    queries: group(queries).map(([query, g]) => ({ query, clicks: g.clicks, impressions: g.impressions, position: g.posWeight ? g.posSum / g.posWeight : null })),
    pages: group(pages).map(([page, g]) => ({ page, clicks: g.clicks, impressions: g.impressions })),
  };
}

export async function bingSiteData(orgId: string, siteId: string, days = 28): Promise<BingData | null> {
  const { data: site } = await db().from("sites").select("bing_site").eq("org_id", orgId).eq("id", siteId).maybeSingle();
  if (!site) throw new BingError("Site not found.", 404);
  if (!site.bing_site) return null;
  const key = await apiKey(orgId);
  const siteUrl = { siteUrl: site.bing_site as string };
  const [traffic, queries, pages] = await Promise.all([
    call<BingRow[]>(key, "GetRankAndTrafficStats", siteUrl),
    call<BingRow[]>(key, "GetQueryStats", siteUrl),
    call<BingRow[]>(key, "GetPageStats", siteUrl),
  ]);
  return summariseBing(traffic ?? [], queries ?? [], pages ?? [], Date.now() - days * 86400000, days);
}

// ---------- Backlinks ----------
export interface LinkedPage { url: string; links: number }
export interface InboundLink { from: string; anchor: string }

/** Linking pages grouped by the site they're on, most links first. */
export function groupByDomain(links: InboundLink[]): { domain: string; links: number }[] {
  const m = new Map<string, number>();
  for (const l of links) {
    try {
      const d = new URL(l.from).hostname.replace(/^www\./, "").toLowerCase();
      m.set(d, (m.get(d) ?? 0) + 1);
    } catch { /* skip bad URLs */ }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([domain, links]) => ({ domain, links }));
}

async function linkedSite(orgId: string, siteId: string): Promise<{ key: string; site: string } | null> {
  const { data } = await db().from("sites").select("bing_site").eq("org_id", orgId).eq("id", siteId).maybeSingle();
  if (data === null) throw new BingError("Site not found.", 404);
  if (!data.bing_site) return null;
  return { key: await apiKey(orgId), site: data.bing_site as string };
}

/** The site's pages that other sites link to, with how many links each has (Bing's index). */
export async function bingLinkCounts(orgId: string, siteId: string, page = 0): Promise<{ pages: LinkedPage[]; totalPages: number } | null> {
  const s = await linkedSite(orgId, siteId);
  if (!s) return null;
  const r = await call<{ Links?: { Url: string; Count: number }[]; TotalPages?: number }>(s.key, "GetLinkCounts", { siteUrl: s.site, page: String(Math.max(0, Math.min(page, 50))) });
  return { pages: (r?.Links ?? []).map((l) => ({ url: l.Url, links: l.Count })).sort((a, b) => b.links - a.links), totalPages: r?.TotalPages ?? 1 };
}

/** Who links to one of the site's pages, with the anchor text, grouped by linking site too. */
export async function bingUrlLinks(orgId: string, siteId: string, url: string, page = 0): Promise<{ links: InboundLink[]; domains: { domain: string; links: number }[]; totalPages: number } | null> {
  const s = await linkedSite(orgId, siteId);
  if (!s) return null;
  // Only pages of this site: the target must be on the linked Bing site's host.
  let same = false;
  try {
    same = new URL(url).hostname.replace(/^www\./, "") === new URL(s.site).hostname.replace(/^www\./, "");
  } catch { /* not a URL */ }
  if (!same) throw new BingError("That page isn't on this site.");
  const r = await call<{ Details?: { Url: string; AnchorText: string }[]; TotalPages?: number }>(s.key, "GetUrlLinks", { siteUrl: s.site, link: url, page: String(Math.max(0, Math.min(page, 50))) });
  const links = (r?.Details ?? []).map((d) => ({ from: d.Url, anchor: (d.AnchorText ?? "").trim().slice(0, 200) }));
  return { links, domains: groupByDomain(links), totalPages: r?.TotalPages ?? 1 };
}
