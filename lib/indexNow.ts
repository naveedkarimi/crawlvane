import { randomBytes } from "node:crypto";
import { db, readJson } from "./store";
import { safeFetch } from "./safeFetch";

/**
 * IndexNow: tell Bing, Yandex, Seznam, Naver and other engines the moment pages change, instead of
 * waiting for them to crawl. The site proves it's yours with a small text file (KEY.txt at the root,
 * containing the key). We make the key, check the file through the private-network guard, then
 * send the URLs to api.indexnow.org, which shares them with every engine that takes part.
 * Google doesn't use IndexNow.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const MAX_URLS = 1000;

export class IndexNowError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const isIndexNowKey = (k: unknown): k is string => typeof k === "string" && /^[A-Za-z0-9-]{8,128}$/.test(k);
export const makeIndexNowKey = (): string => randomBytes(16).toString("hex");
export const keyFileUrl = (siteUrl: string, key: string): string => `${new URL(siteUrl).origin}/${key}.txt`;

/** Keeps http(s) URLs on the site's own host, without fragments or duplicates, up to MAX_URLS. */
export function cleanUrls(siteUrl: string, raw: string[]): { urls: string[]; rejected: number } {
  const host = new URL(siteUrl).host.toLowerCase();
  const seen = new Set<string>();
  let rejected = 0;
  for (const r of raw) {
    const s = r.trim();
    if (!s) continue;
    try {
      const u = new URL(s);
      if (!/^https?:$/.test(u.protocol) || u.host.toLowerCase() !== host) { rejected++; continue; }
      u.hash = "";
      seen.add(u.toString());
    } catch {
      rejected++;
    }
  }
  const urls = [...seen];
  return { urls: urls.slice(0, MAX_URLS), rejected: rejected + Math.max(0, urls.length - MAX_URLS) };
}

/** What each IndexNow answer means, in plain words. */
export function indexNowResult(status: number): { ok: boolean; message: string } {
  if (status === 200 || status === 202) return { ok: true, message: "Sent. Search engines that use IndexNow will pick these pages up soon." };
  if (status === 403) return { ok: false, message: "IndexNow couldn't confirm your key file. Check it's still online, then try again." };
  if (status === 422) return { ok: false, message: "IndexNow refused these URLs: they must all be on the same site as the key file." };
  if (status === 429) return { ok: false, message: "IndexNow says too many requests. Try again later." };
  if (status === 400) return { ok: false, message: "IndexNow didn't accept the request." };
  return { ok: false, message: `IndexNow answered with ${status || "no response"}. Try again later.` };
}

/** Is the key file online, on the same host, with exactly the key inside? */
export async function keyFileOnline(siteUrl: string, key: string): Promise<boolean> {
  const r = await safeFetch(keyFileUrl(siteUrl, key), { accept: "text/plain,*/*;q=0.5", timeoutMs: 10000 });
  if (!r.ok) return false;
  try {
    if (new URL(r.url).host.toLowerCase() !== new URL(siteUrl).host.toLowerCase()) return false;
  } catch {
    return false;
  }
  return r.body.trim() === key;
}

/** Sends URLs for one host. Used for customers' sites and for this site's own pages. */
export async function sendIndexNow(siteUrl: string, key: string, urls: string[], keyLocation = keyFileUrl(siteUrl, key)): Promise<{ ok: boolean; status: number; message: string }> {
  if (!urls.length) return { ok: false, status: 0, message: "There are no pages to send." };
  let status = 0;
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(siteUrl).host, key, keyLocation, urlList: urls }),
      signal: AbortSignal.timeout(20000),
    });
    status = res.status;
    await res.body?.cancel().catch(() => {});
  } catch {
    status = 0;
  }
  return { status, ...indexNowResult(status) };
}

// ---------- Per saved site ----------
interface SiteRow { id: string; url: string; indexnow_key: string | null; indexnow_verified_at: string | null; indexnow_sent_at: string | null }

async function siteRow(orgId: string, siteId: string): Promise<SiteRow> {
  const { data } = await db().from("sites").select("id, url, indexnow_key, indexnow_verified_at, indexnow_sent_at").eq("org_id", orgId).eq("id", siteId).maybeSingle();
  if (!data) throw new IndexNowError("Site not found.", 404);
  return data as SiteRow;
}

/** The pages to send by default: indexable pages that returned 200 in the site's latest full report. */
export async function reportPages(orgId: string, siteId: string): Promise<string[]> {
  const { data: link } = await db().from("org_reports").select("report_id").eq("org_id", orgId).eq("site_id", siteId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!link) return [];
  const report = await readJson<{ site?: { pages?: { url: string; status: number; noindex?: boolean }[] } }>("reports", link.report_id as string).catch(() => null);
  return (report?.site?.pages ?? []).filter((p) => p.status === 200 && !p.noindex).map((p) => p.url);
}

export interface IndexNowStatus { key: string | null; keyUrl: string | null; verifiedAt: string | null; sentAt: string | null; reportPages: number }

export async function indexNowStatus(orgId: string, siteId: string): Promise<IndexNowStatus> {
  const s = await siteRow(orgId, siteId);
  return {
    key: s.indexnow_key,
    keyUrl: s.indexnow_key ? keyFileUrl(s.url, s.indexnow_key) : null,
    verifiedAt: s.indexnow_verified_at,
    sentAt: s.indexnow_sent_at,
    reportPages: (await reportPages(orgId, siteId)).length,
  };
}

/** Makes the site's key (once) and returns where the file must go. */
export async function setUpIndexNow(orgId: string, siteId: string): Promise<IndexNowStatus> {
  const s = await siteRow(orgId, siteId);
  if (!s.indexnow_key) {
    const { error } = await db().from("sites").update({ indexnow_key: makeIndexNowKey(), indexnow_verified_at: null }).eq("org_id", orgId).eq("id", siteId).is("indexnow_key", null);
    if (error) throw new Error(`Database write failed: ${error.message}`);
  }
  return indexNowStatus(orgId, siteId);
}

export async function verifyIndexNow(orgId: string, siteId: string): Promise<boolean> {
  const s = await siteRow(orgId, siteId);
  if (!s.indexnow_key) throw new IndexNowError("Set up IndexNow first.", 409);
  const ok = await keyFileOnline(s.url, s.indexnow_key);
  await db().from("sites").update({ indexnow_verified_at: ok ? new Date().toISOString() : null }).eq("org_id", orgId).eq("id", siteId);
  return ok;
}

/** Sends the given URLs, or the latest report's pages when none are given. Checks the key file first. */
export async function submitSite(orgId: string, siteId: string, given: string[] | undefined): Promise<{ ok: boolean; message: string; sent: number; rejected: number }> {
  const s = await siteRow(orgId, siteId);
  if (!s.indexnow_key) throw new IndexNowError("Set up IndexNow first.", 409);
  if (!(await keyFileOnline(s.url, s.indexnow_key))) {
    await db().from("sites").update({ indexnow_verified_at: null }).eq("org_id", orgId).eq("id", siteId);
    throw new IndexNowError(`The key file isn't at ${keyFileUrl(s.url, s.indexnow_key)} yet, or it holds something else.`, 409);
  }
  const { urls, rejected } = cleanUrls(s.url, given?.length ? given : await reportPages(orgId, siteId));
  if (!urls.length) throw new IndexNowError(given?.length ? "None of those URLs are on this site." : "Run a full site report first, or paste the URLs to send.");
  const r = await sendIndexNow(s.url, s.indexnow_key, urls);
  if (r.ok) await db().from("sites").update({ indexnow_verified_at: new Date().toISOString(), indexnow_sent_at: new Date().toISOString() }).eq("org_id", orgId).eq("id", siteId);
  return { ok: r.ok, message: r.message, sent: r.ok ? urls.length : 0, rejected };
}
