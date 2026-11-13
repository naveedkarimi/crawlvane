import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db, readJson } from "./store";
import { AI_SOURCES, buildAiRegex, matchesAi } from "./gen/aiReferrers";

/**
 * Google Search Console and GA4, read-only, per team. The team connects one Google account; its
 * refresh token is stored encrypted (AES-256-GCM, key from TOKEN_ENCRYPTION_KEY). Search data is
 * fetched when someone looks at it and isn't stored.
 */
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/analytics.readonly"];

export class GoogleError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const googleConfigured = () => !!(process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() && process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() && process.env.TOKEN_ENCRYPTION_KEY?.trim());

// ---------- Token encryption ----------
function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) throw new GoogleError("Google connections aren't set up yet.", 503);
  // Any length of secret works: it's hashed to the 32 bytes AES-256 needs.
  return createHash("sha256").update(raw).digest();
}
export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}
export function decrypt(blob: string): string {
  const [v, iv, tag, data] = blob.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unknown token format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

// ---------- OAuth ----------
export function authUrl(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenRequest(params: Record<string, string>): Promise<{ access_token: string; refresh_token?: string; id_token?: string; scope?: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!.trim(), client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!.trim(), ...params }),
    signal: AbortSignal.timeout(15000),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok) throw new GoogleError(j.error === "invalid_grant" ? "Google access was removed. Connect again." : "Google didn't accept the request.", res.status === 400 ? 401 : 502);
  return j as never;
}

/** The email in Google's ID token (signed by Google; we only read it, we don't trust it for sign-in). */
const emailFromIdToken = (t?: string) => {
  try {
    return t ? (JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).email as string) ?? "" : "";
  } catch {
    return "";
  }
};

export async function finishConnect(orgId: string, code: string, redirectUri: string): Promise<void> {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
  if (!t.refresh_token) throw new GoogleError("Google didn't give lasting access. Remove the app in your Google account's security settings, then connect again.", 400);
  const granted = (t.scope ?? "").split(" ");
  if (!granted.includes(SCOPES[2]) && !granted.includes(SCOPES[3])) throw new GoogleError("Allow access to Search Console or Analytics to connect.", 400);
  const { error } = await db().from("google_connections").upsert({ org_id: orgId, email: emailFromIdToken(t.id_token), refresh_token: encrypt(t.refresh_token), scopes: t.scope ?? "" });
  if (error) throw new Error(`Database write failed: ${error.message}`);
}

export async function connection(orgId: string): Promise<{ email: string; scopes: string } | null> {
  const { data } = await db().from("google_connections").select("email, scopes").eq("org_id", orgId).maybeSingle();
  return data ? { email: (data.email as string) || "", scopes: (data.scopes as string) || "" } : null;
}

export async function disconnect(orgId: string): Promise<void> {
  const { data } = await db().from("google_connections").select("refresh_token").eq("org_id", orgId).maybeSingle();
  if (data?.refresh_token) {
    // Revoke at Google too, so access really ends; ignore failures (the token may already be gone).
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(data.refresh_token as string))}`, { method: "POST", signal: AbortSignal.timeout(8000) }).catch(() => {});
  }
  await db().from("google_connections").delete().eq("org_id", orgId);
  await db().from("sites").update({ gsc_property: null, ga4_property: null }).eq("org_id", orgId);
}

async function accessToken(orgId: string): Promise<string> {
  const { data } = await db().from("google_connections").select("refresh_token").eq("org_id", orgId).maybeSingle();
  if (!data?.refresh_token) throw new GoogleError("Connect Google first.", 409);
  return (await tokenRequest({ refresh_token: decrypt(data.refresh_token as string), grant_type: "refresh_token" })).access_token;
}

async function gapi<T>(token: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new GoogleError(res.status === 403 ? "This Google account can't see that property." : `Google said: ${j.error?.message ?? res.status}`, res.status === 403 ? 403 : 502);
  return j as T;
}

// ---------- Properties ----------
export interface Properties { gsc: { url: string; permission: string }[]; ga4: { id: string; name: string; account: string }[] }

export async function listProperties(orgId: string): Promise<Properties> {
  const token = await accessToken(orgId);
  const [gsc, ga4] = await Promise.all([
    gapi<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(token, "https://www.googleapis.com/webmasters/v3/sites").catch(() => ({ siteEntry: [] })),
    gapi<{ accountSummaries?: { displayName: string; propertySummaries?: { property: string; displayName: string }[] }[] }>(token, "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200").catch(() => ({ accountSummaries: [] })),
  ]);
  return {
    gsc: (gsc.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser").map((s) => ({ url: s.siteUrl, permission: s.permissionLevel })),
    ga4: (ga4.accountSummaries ?? []).flatMap((a) => (a.propertySummaries ?? []).map((p) => ({ id: p.property, name: p.displayName, account: a.displayName }))),
  };
}

export const isGscProperty = (p: unknown): p is string => typeof p === "string" && /^(https?:\/\/[^\s]{3,300}\/|sc-domain:[a-z0-9.-]{3,253})$/i.test(p);
export const isGa4Property = (p: unknown): p is string => typeof p === "string" && /^properties\/\d{1,20}$/.test(p);

export async function setSiteProperties(orgId: string, siteId: string, gsc: string | null, ga4: string | null): Promise<void> {
  if (gsc && !isGscProperty(gsc)) throw new GoogleError("Unknown Search Console property.");
  if (ga4 && !isGa4Property(ga4)) throw new GoogleError("Unknown GA4 property.");
  const { data, error } = await db().from("sites").update({ gsc_property: gsc, ga4_property: ga4 }).eq("org_id", orgId).eq("id", siteId).select("id");
  if (error) throw new Error(`Database write failed: ${error.message}`);
  if (!data?.length) throw new GoogleError("Site not found.", 404);
}

// ---------- Data ----------
export interface SearchData {
  days: number;
  gsc: {
    clicks: number; impressions: number; ctr: number; position: number;
    queries: { query: string; clicks: number; impressions: number; position: number }[];
    pages: { page: string; clicks: number; impressions: number }[];
    /** Pages with many impressions but few clicks: titles and descriptions worth rewriting. */
    lowCtrPages: { page: string; impressions: number; ctr: number; position: number }[];
    /** Searches on page 1's edge or page 2 (positions 8 to 20): the closest wins. */
    nearlyThere: { query: string; impressions: number; position: number }[];
    countries: { country: string; clicks: number; impressions: number }[];
    devices: { device: string; clicks: number; impressions: number }[];
  } | null;
  ga4: {
    sessions: number; aiSessions: number; sources: { source: string; sessions: number }[];
    /** Top landing pages, with failed checks from the site's latest full report when there is one. */
    landingPages: { page: string; sessions: number; engaged: number; failedChecks: number | null }[];
  } | null;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function siteSearchData(orgId: string, siteId: string, days = 28): Promise<SearchData> {
  const { data: site } = await db().from("sites").select("gsc_property, ga4_property").eq("org_id", orgId).eq("id", siteId).maybeSingle();
  if (!site) throw new GoogleError("Site not found.", 404);
  if (!site.gsc_property && !site.ga4_property) return { days, gsc: null, ga4: null };
  const token = await accessToken(orgId);
  // Search Console data lags about 2 days.
  const end = new Date(Date.now() - 2 * 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const range = { startDate: ymd(start), endDate: ymd(end) };

  let gsc: SearchData["gsc"] = null;
  if (site.gsc_property) {
    const q = (dimensions: string[], rowLimit: number) =>
      gapi<{ rows?: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }[] }>(token, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gsc_property as string)}/searchAnalytics/query`, { ...range, dimensions, rowLimit, dataState: "final" });
    const [total, queries, pages, manyQueries, manyPages, countries, devices] = await Promise.all([
      q([], 1), q(["query"], 10), q(["page"], 10), q(["query"], 250), q(["page"], 250), q(["country"], 5), q(["device"], 3),
    ]);
    const t = total.rows?.[0];
    gsc = {
      clicks: t?.clicks ?? 0, impressions: t?.impressions ?? 0, ctr: t?.ctr ?? 0, position: t?.position ?? 0,
      queries: (queries.rows ?? []).map((r) => ({ query: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions, position: r.position })),
      pages: (pages.rows ?? []).map((r) => ({ page: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions })),
      ...searchOpportunities(manyPages.rows ?? [], manyQueries.rows ?? []),
      countries: (countries.rows ?? []).map((r) => ({ country: (r.keys?.[0] ?? "").toUpperCase(), clicks: r.clicks, impressions: r.impressions })),
      devices: (devices.rows ?? []).map((r) => ({ device: (r.keys?.[0] ?? "").toLowerCase(), clicks: r.clicks, impressions: r.impressions })),
    };
  }

  let ga4: SearchData["ga4"] = null;
  if (site.ga4_property) {
    const report = await gapi<{ rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] }>(token, `https://analyticsdata.googleapis.com/v1beta/${site.ga4_property}:runReport`, {
      dateRanges: [range], dimensions: [{ name: "sessionSource" }], metrics: [{ name: "sessions" }], limit: 500,
    });
    const regex = buildAiRegex(AI_SOURCES.flatMap((s) => s.hosts));
    const rows = (report.rows ?? []).map((r) => ({ source: r.dimensionValues[0]?.value ?? "", sessions: Number(r.metricValues[0]?.value) || 0 }));
    const ai = rows.filter((r) => matchesAi(regex, r.source)).sort((a, b) => b.sessions - a.sessions);
    const landing = await gapi<{ rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] }>(token, `https://analyticsdata.googleapis.com/v1beta/${site.ga4_property}:runReport`, {
      dateRanges: [range], dimensions: [{ name: "landingPage" }], metrics: [{ name: "sessions" }, { name: "engagedSessions" }], limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }).catch(() => ({ rows: [] }));
    const fails = await latestReportFails(orgId, siteId);
    ga4 = {
      sessions: rows.reduce((n, r) => n + r.sessions, 0), aiSessions: ai.reduce((n, r) => n + r.sessions, 0), sources: ai.slice(0, 10),
      landingPages: (landing.rows ?? []).map((r) => {
        const page = r.dimensionValues[0]?.value || "/";
        return { page, sessions: Number(r.metricValues[0]?.value) || 0, engaged: Number(r.metricValues[1]?.value) || 0, failedChecks: fails ? (fails.get(page.split("?")[0].replace(/\/+$/, "") || "/") ?? null) : null };
      }),
    };
  }
  return { days, gsc, ga4 };
}

type GscRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

/** Opportunities from Search Console rows. Thresholds are fixed so results are repeatable. */
export function searchOpportunities(pages: GscRow[], queries: GscRow[]): { lowCtrPages: NonNullable<SearchData["gsc"]>["lowCtrPages"]; nearlyThere: NonNullable<SearchData["gsc"]>["nearlyThere"] } {
  return {
    // 100+ impressions, on page 1 (position 10 or better), but under 2% clicked.
    lowCtrPages: pages.filter((r) => r.impressions >= 100 && r.position <= 10 && r.ctr < 0.02)
      .sort((a, b) => b.impressions - a.impressions).slice(0, 10)
      .map((r) => ({ page: r.keys?.[0] ?? "", impressions: r.impressions, ctr: r.ctr, position: r.position })),
    // Positions 8 to 20 with 50+ impressions: small gains move these onto page 1 or up it.
    nearlyThere: queries.filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 50)
      .sort((a, b) => b.impressions - a.impressions).slice(0, 10)
      .map((r) => ({ query: r.keys?.[0] ?? "", impressions: r.impressions, position: r.position })),
  };
}

/** Failed checks per page path from the site's latest full report, or null when there's none. */
async function latestReportFails(orgId: string, siteId: string): Promise<Map<string, number> | null> {
  const { data: link } = await db().from("org_reports").select("report_id").eq("org_id", orgId).eq("site_id", siteId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!link) return null;
  const report = await readJson<{ site?: { pages?: { url: string; fails: string[] }[] } }>("reports", link.report_id as string).catch(() => null);
  if (!report?.site?.pages) return null;
  const m = new Map<string, number>();
  for (const p of report.site.pages) {
    try {
      m.set(new URL(p.url).pathname.replace(/\/+$/, "") || "/", p.fails.length);
    } catch { /* skip bad URLs */ }
  }
  return m;
}
