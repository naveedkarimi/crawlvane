/**
 * Free tools that look at a site's HTTP layer: redirects and canonical, the XML sitemap,
 * and security headers. The pure parts (analyzeHeaders, parseSitemapXml, redirect verdicts)
 * are tested in scripts/test-tools.mts.
 */
import * as cheerio from "cheerio";
import { parseRobots } from "../robots";
import { assertPublicUrl, guardedFetch, readLimited, safeFetch, USER_AGENT } from "../safeFetch";
import type { ToolCheck } from "./pageTools";

// ---------------------------------------------------------------- redirects

export interface Hop { url: string; status: number; location?: string; ms: number }
export interface Trace { start: string; hops: Hop[]; final: string; finalStatus: number; loop: boolean; error?: string; body?: string; headers?: Record<string, string> }

const MAX_HOPS = 10;

/** Follow redirects one hop at a time, keeping each status code. */
export async function trace(start: string, opts: { keepBody?: boolean } = {}): Promise<Trace> {
  const hops: Hop[] = [];
  const seen = new Set<string>();
  let current = start;
  try {
    for (let i = 0; i < MAX_HOPS; i++) {
      const url = await assertPublicUrl(current);
      const key = url.toString();
      if (seen.has(key)) return { start, hops, final: key, finalStatus: 0, loop: true };
      seen.add(key);
      const t = Date.now();
      const res = await guardedFetch(url, { redirect: "manual", signal: AbortSignal.timeout(10000), headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*;q=0.8" } });
      const location = res.headers.get("location") ?? undefined;
      hops.push({ url: key, status: res.status, location, ms: Date.now() - t });
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel().catch(() => {});
        current = new URL(location, url).toString();
        continue;
      }
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      let body: string | undefined;
      if (opts.keepBody) body = (await readLimited(res)).body;
      else await res.body?.cancel().catch(() => {});
      return { start, hops, final: key, finalStatus: res.status, loop: false, body, headers };
    }
    return { start, hops, final: current, finalStatus: 0, loop: false, error: `More than ${MAX_HOPS} redirects` };
  } catch (e) {
    return { start, hops, final: current, finalStatus: 0, loop: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const TEMPORARY = new Set([302, 303, 307]);

/** Verdicts for one traced URL plus its http/https/www variants. */
export function redirectChecks(main: Trace, variants: Trace[], canonical: string, canonicalStatus: number | null): ToolCheck[] {
  const checks: ToolCheck[] = [];
  const redirects = main.hops.filter((h) => h.status >= 300 && h.status < 400);
  if (main.loop) checks.push({ status: "fail", title: "Redirect loop", detail: "The URL redirects back to a page it already visited, so it never loads.", fix: "Fix the redirect rules so each old URL points straight at the final page." });
  else if (main.error && !main.hops.length) checks.push({ status: "fail", title: "Page loads", detail: main.error, fix: "Check the address and that the server is up." });
  else
    checks.push(
      redirects.length === 0
        ? { status: "pass", title: "Redirect chain", detail: "No redirects. The URL loads directly." }
        : redirects.length === 1
          ? { status: "pass", title: "Redirect chain", detail: "One redirect to the final page." }
          : { status: "warn", title: "Redirect chain", detail: `${redirects.length} redirects before the page loads. Each hop adds delay, and crawlers may give up on long chains.`, fix: "Point the first URL straight at the final page, and update internal links to the final URL." },
    );
  const temp = redirects.filter((h) => TEMPORARY.has(h.status));
  if (temp.length)
    checks.push({ status: "warn", title: "Temporary redirects", detail: `${temp.map((h) => `${h.status} from ${h.url}`).join("; ")}. A temporary redirect tells search engines the move may be undone, so they can keep the old URL.`, fix: "If the move is permanent, use 301 (or 308)." });

  if (!main.loop && main.finalStatus)
    checks.push(
      main.finalStatus === 200
        ? { status: "pass", title: "Final status", detail: "The final page returns 200 OK." }
        : { status: main.finalStatus >= 400 ? "fail" : "warn", title: "Final status", detail: `The final page returns ${main.finalStatus}.`, fix: "Make the final URL return 200, or redirect to a page that does." },
    );

  const finalUrl = main.final;
  if (canonical) {
    const same = canonical.replace(/\/$/, "") === finalUrl.replace(/\/$/, "");
    if (same) checks.push({ status: "pass", title: "Canonical", detail: "Points to this page." });
    else if (canonicalStatus !== null && canonicalStatus !== 200)
      checks.push({ status: "fail", title: "Canonical", detail: `Points to ${canonical}, which returns ${canonicalStatus || "an error"}.`, fix: "Point the canonical at a URL that loads with 200 and no redirect." });
    else checks.push({ status: "warn", title: "Canonical", detail: `Points to a different URL: ${canonical}. Search engines may index that URL instead of this one.`, fix: "If this page should rank, make its canonical point to itself." });
  } else if (main.finalStatus === 200)
    checks.push({ status: "warn", title: "Canonical", detail: "No canonical tag.", fix: `Add <link rel="canonical" href="${finalUrl}">.` });

  const endpoints = variants.filter((v) => v.finalStatus === 200).map((v) => new URL(v.final).origin);
  const origins = [...new Set(endpoints)];
  const http = variants.find((v) => v.start.startsWith("http://") && !/^http:\/\/www\./.test(v.start));
  if (http) {
    const hops = http.hops.filter((h) => h.status >= 300 && h.status < 400);
    checks.push(
      http.final.startsWith("https://")
        ? hops.some((h) => TEMPORARY.has(h.status))
          ? { status: "warn", title: "HTTP to HTTPS", detail: "The http:// address moves to https:// but with a temporary redirect.", fix: "Use a 301 redirect from http to https." }
          : { status: "pass", title: "HTTP to HTTPS", detail: "The http:// address redirects to https://." }
        : http.finalStatus === 200
          ? { status: "fail", title: "HTTP to HTTPS", detail: "The http:// address loads without moving to https://, so two copies of the site exist.", fix: "Redirect every http:// URL to https:// with a 301." }
          : { status: "info", title: "HTTP to HTTPS", detail: "The http:// address didn't load." },
    );
  }
  if (origins.length > 1)
    checks.push({ status: "warn", title: "www and non-www", detail: `The site loads on ${origins.join(" and ")}. Search engines may treat them as separate sites.`, fix: "Pick one host and 301-redirect the other to it." });
  else if (origins.length === 1 && variants.length > 1) checks.push({ status: "pass", title: "www and non-www", detail: `All versions end on ${origins[0]}.` });
  return checks;
}

export async function redirectReport(rawUrl: string) {
  const url = await assertPublicUrl(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname + url.search;
  const variantUrls = [`http://${host}${path}`, `https://${host}${path}`, `http://www.${host}${path}`, `https://www.${host}${path}`];
  const [main, ...variants] = await Promise.all([trace(url.toString(), { keepBody: true }), ...variantUrls.map((u) => trace(u))]);
  let canonical = "";
  let canonicalStatus: number | null = null;
  if (main.body) {
    const href = cheerio.load(main.body)('link[rel="canonical" i]').attr("href")?.trim();
    if (href) {
      try {
        canonical = new URL(href, main.final).toString();
      } catch {
        canonical = href;
      }
      if (canonical.replace(/\/$/, "") !== main.final.replace(/\/$/, "")) {
        const c = await trace(canonical);
        canonicalStatus = c.hops.length > 1 ? c.hops[0].status : c.finalStatus;
      }
    }
  }
  const checks = redirectChecks(main, variants, canonical, canonicalStatus);
  const strip = ({ body: _b, headers: _h, ...t }: Trace) => t;
  return { url: url.toString(), main: strip(main), variants: variants.map(strip), canonical, checks };
}

// ---------------------------------------------------------------- sitemap

export interface SitemapEntry { loc: string; lastmod?: string }
export interface ParsedSitemap { kind: "urlset" | "sitemapindex" | "invalid"; entries: SitemapEntry[] }

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const unwrap = (s: string) => decode(s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim());

export function parseSitemapXml(xml: string): ParsedSitemap {
  const kind = /<sitemapindex[\s>]/i.test(xml) ? "sitemapindex" : /<urlset[\s>]/i.test(xml) ? "urlset" : "invalid";
  if (kind === "invalid") return { kind, entries: [] };
  const tag = kind === "urlset" ? "url" : "sitemap";
  const entries: SitemapEntry[] = [];
  for (const m of xml.matchAll(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi"))) {
    const loc = m[0].match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];
    if (!loc) continue;
    const lastmod = m[0].match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1];
    entries.push({ loc: unwrap(loc), lastmod: lastmod ? unwrap(lastmod) : undefined });
  }
  return { kind, entries };
}

const W3C_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

/** Checks on the page URLs listed in a sitemap (after child sitemaps are merged). */
export function sitemapChecks(origin: string, urls: SitemapEntry[], opts: { bytes: number; inRobots: boolean; now?: Date }): ToolCheck[] {
  const checks: ToolCheck[] = [];
  const host = new URL(origin).hostname.replace(/^www\./, "");
  checks.push(
    opts.inRobots
      ? { status: "pass", title: "Listed in robots.txt", detail: "robots.txt has a Sitemap: line, so every crawler can find it." }
      : { status: "warn", title: "Listed in robots.txt", detail: "robots.txt doesn't mention this sitemap. Google and Bing find it if you submit it, but other crawlers may not.", fix: `Add "Sitemap: ${origin}/sitemap.xml" to robots.txt.` },
  );
  checks.push(
    urls.length === 0
      ? { status: "fail", title: "URLs listed", detail: "The sitemap lists no page URLs.", fix: "List every page you want indexed." }
      : urls.length > 50000
        ? { status: "fail", title: "URLs listed", detail: `${urls.length.toLocaleString()} URLs in one file; the limit is 50,000.`, fix: "Split it into several sitemaps under a sitemap index." }
        : { status: "pass", title: "URLs listed", detail: `${urls.length.toLocaleString()} URLs.` },
  );
  if (opts.bytes > 50 * 1024 * 1024) checks.push({ status: "fail", title: "File size", detail: "Over 50 MB uncompressed, the limit for one sitemap.", fix: "Split it into several files." });

  const other = urls.filter((u) => {
    try {
      return new URL(u.loc).hostname.replace(/^www\./, "") !== host;
    } catch {
      return true;
    }
  });
  if (other.length) checks.push({ status: "fail", title: "URLs on another site", detail: `${other.length} URLs aren't on ${host} (or aren't valid), e.g. ${other[0].loc}. Search engines ignore them.`, fix: "Only list URLs on the same host as the sitemap." });
  const http = urls.filter((u) => u.loc.startsWith("http://"));
  if (http.length && origin.startsWith("https://")) checks.push({ status: "warn", title: "http:// URLs", detail: `${http.length} URLs use http:// on an https site, e.g. ${http[0].loc}.`, fix: "List the https:// version of every URL." });
  const dupes = urls.length - new Set(urls.map((u) => u.loc)).size;
  if (dupes) checks.push({ status: "warn", title: "Duplicate URLs", detail: `${dupes} URLs are listed more than once.`, fix: "List each URL once." });

  const withDate = urls.filter((u) => u.lastmod);
  const bad = withDate.filter((u) => !W3C_DATE.test(u.lastmod!));
  const now = (opts.now ?? new Date()).getTime();
  const future = withDate.filter((u) => W3C_DATE.test(u.lastmod!) && Date.parse(u.lastmod!) > now + 86400000);
  const allSame = withDate.length > 5 && new Set(withDate.map((u) => u.lastmod!.slice(0, 10))).size === 1;
  if (!urls.length) return checks;
  if (!withDate.length) checks.push({ status: "info", title: "lastmod dates", detail: "No lastmod dates. Optional, but accurate dates help Google and Bing recrawl changed pages sooner." });
  else if (bad.length) checks.push({ status: "warn", title: "lastmod dates", detail: `${bad.length} dates aren't in W3C format, e.g. "${bad[0].lastmod}".`, fix: "Use YYYY-MM-DD or a full timestamp like 2026-11-06T10:00:00Z." });
  else if (future.length) checks.push({ status: "warn", title: "lastmod dates", detail: `${future.length} dates are in the future.`, fix: "Use the date the page last really changed." });
  else if (allSame) checks.push({ status: "warn", title: "lastmod dates", detail: `Every URL has the same date (${withDate[0].lastmod!.slice(0, 10)}). Search engines stop trusting lastmod when it doesn't reflect real changes.`, fix: "Set lastmod from each page's own last edit, not the build date." });
  else checks.push({ status: "pass", title: "lastmod dates", detail: `${withDate.length === urls.length ? "Every URL" : `${withDate.length} of ${urls.length} URLs`} has a valid date.` });
  return checks;
}

export async function sitemapReport(rawUrl: string) {
  const url = await assertPublicUrl(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
  const xmlOpts = { timeoutMs: 10000, accept: "application/xml,text/xml,*/*" };
  const robots = await safeFetch(`${url.origin}/robots.txt`, { timeoutMs: 8000, accept: "text/plain,*/*" });
  const listed = robots.ok ? parseRobots(robots.body).sitemaps : [];
  const direct = /\.xml(\.gz)?$/i.test(url.pathname) || /sitemap/i.test(url.pathname) ? [url.toString()] : [];
  const candidates = [...new Set([...direct, ...listed.slice(0, 3), `${url.origin}/sitemap.xml`, `${url.origin}/sitemap_index.xml`])];

  for (const c of candidates) {
    const r = await safeFetch(c, xmlOpts);
    if (!r.ok) continue;
    const parsed = parseSitemapXml(r.body);
    if (parsed.kind === "invalid") continue;
    let bytes = r.bytes;
    const children: { loc: string; ok: boolean; count: number; error?: string }[] = [];
    let urls: SitemapEntry[] = parsed.kind === "urlset" ? parsed.entries : [];
    if (parsed.kind === "sitemapindex") {
      for (const child of parsed.entries.slice(0, 5)) {
        const cr = await safeFetch(child.loc, xmlOpts);
        const cp = cr.ok ? parseSitemapXml(cr.body) : null;
        bytes = Math.max(bytes, cr.bytes);
        children.push({ loc: child.loc, ok: !!cp && cp.kind === "urlset", count: cp?.entries.length ?? 0, error: cr.ok ? (cp?.kind === "urlset" ? undefined : "not a URL sitemap") : cr.error ?? `HTTP ${cr.status}` });
        if (cp?.kind === "urlset") urls.push(...cp.entries);
      }
    }
    const inRobots = listed.some((l) => l.replace(/\/$/, "") === r.url.replace(/\/$/, "") || l === c);
    const checks = sitemapChecks(url.origin, urls, { bytes, inRobots });
    if (parsed.kind === "sitemapindex") {
      const broken = children.filter((x) => !x.ok);
      checks.unshift(broken.length
        ? { status: "fail", title: "Child sitemaps", detail: `${broken.length} of ${children.length} child sitemaps we opened didn't load: ${broken[0].loc} (${broken[0].error}).`, fix: "Fix or remove broken entries in the sitemap index." }
        : { status: "pass", title: "Child sitemaps", detail: `Sitemap index with ${parsed.entries.length} sitemaps; the ${children.length} we opened all load.${parsed.entries.length > 5 ? " URL checks below cover those five." : ""}` });
    }
    // Spot-check a sample of listed pages: each should load with 200, no redirect.
    const sample = urls.length <= 10 ? urls : Array.from({ length: 10 }, (_, i) => urls[Math.floor((i * urls.length) / 10)]);
    const samples = await Promise.all(sample.map(async (u) => {
      const t = await trace(u.loc);
      const first = t.hops[0]?.status ?? 0;
      return { loc: u.loc, status: first, final: t.final };
    }));
    const notOk = samples.filter((s) => s.status !== 200);
    if (samples.length)
      checks.push(notOk.length
        ? { status: notOk.some((s) => s.status >= 400 || s.status === 0) ? "fail" : "warn", title: "Listed pages load", detail: `${notOk.length} of ${samples.length} sampled URLs don't return 200 directly (${notOk.slice(0, 2).map((s) => `${s.status || "error"} ${s.loc}`).join("; ")}).`, fix: "List only final URLs that return 200: remove redirected, missing and noindex pages." }
        : { status: "pass", title: "Listed pages load", detail: `All ${samples.length} sampled URLs return 200 with no redirect.` });
    return { url: r.url, found: true, kind: parsed.kind, total: urls.length, children, samples, checks, preview: urls.slice(0, 25) };
  }
  return {
    url: `${url.origin}/sitemap.xml`,
    found: false,
    checks: [{ status: "fail", title: "Sitemap found", detail: `No XML sitemap at ${listed.length ? listed.join(", ") + " or " : ""}/sitemap.xml.`, fix: "Most CMSs make one for you (WordPress, Shopify, Wix, Squarespace). Add it to robots.txt and submit it in Google Search Console and Bing Webmaster Tools." }] as ToolCheck[],
  };
}

// ---------------------------------------------------------------- security headers

export interface HeaderRow { name: string; value: string | null }

export function analyzeHeaders(h: Record<string, string>, finalUrl: string): { score: number; checks: ToolCheck[]; rows: HeaderRow[] } {
  const get = (k: string) => h[k.toLowerCase()] ?? null;
  const checks: ToolCheck[] = [];
  const https = finalUrl.startsWith("https://");
  const hsts = get("strict-transport-security");
  const maxAge = Number(hsts?.match(/max-age=(\d+)/i)?.[1] ?? 0);
  checks.push(!https
    ? { status: "fail", title: "HTTPS", detail: "The page isn't served over HTTPS.", fix: "Get a certificate (free from Let's Encrypt or your host) and redirect http to https." }
    : !hsts
      ? { status: "warn", title: "Strict-Transport-Security", detail: "Missing. Browsers may still try http:// first.", fix: "Strict-Transport-Security: max-age=31536000; includeSubDomains" }
      : maxAge < 15552000
        ? { status: "warn", title: "Strict-Transport-Security", detail: `max-age is ${maxAge} seconds (under 6 months).`, fix: "Raise max-age to 31536000 (one year)." }
        : { status: "pass", title: "Strict-Transport-Security", detail: hsts });
  const csp = get("content-security-policy");
  checks.push(csp
    ? { status: /unsafe-inline/.test(csp) && /script-src[^;]*unsafe-inline/.test(csp) ? "warn" : "pass", title: "Content-Security-Policy", detail: /script-src[^;]*unsafe-inline/.test(csp) ? "Set, but script-src allows 'unsafe-inline', which weakens it." : "Set." , fix: "Replace 'unsafe-inline' scripts with nonces or hashes." }
    : get("content-security-policy-report-only")
      ? { status: "info", title: "Content-Security-Policy", detail: "Only in report-only mode, so it isn't enforced yet." }
      : { status: "warn", title: "Content-Security-Policy", detail: "Missing. A CSP limits what an injected script can do.", fix: "Start with Content-Security-Policy-Report-Only, watch the reports, then enforce it." });
  checks.push(/nosniff/i.test(get("x-content-type-options") ?? "")
    ? { status: "pass", title: "X-Content-Type-Options", detail: "nosniff" }
    : { status: "warn", title: "X-Content-Type-Options", detail: "Missing.", fix: "X-Content-Type-Options: nosniff" });
  const xfo = get("x-frame-options");
  const fa = /frame-ancestors/i.test(csp ?? "");
  checks.push(xfo || fa
    ? { status: "pass", title: "Clickjacking protection", detail: fa ? "CSP frame-ancestors is set." : `X-Frame-Options: ${xfo}` }
    : { status: "warn", title: "Clickjacking protection", detail: "Other sites can show this page in a frame.", fix: "Content-Security-Policy: frame-ancestors 'self' (or X-Frame-Options: SAMEORIGIN)" });
  const rp = get("referrer-policy");
  checks.push(rp
    ? { status: /unsafe-url/i.test(rp) ? "warn" : "pass", title: "Referrer-Policy", detail: rp, fix: "Use strict-origin-when-cross-origin." }
    : { status: "info", title: "Referrer-Policy", detail: "Not set; browsers default to strict-origin-when-cross-origin, which is fine." });
  checks.push(get("permissions-policy")
    ? { status: "pass", title: "Permissions-Policy", detail: "Set." }
    : { status: "info", title: "Permissions-Policy", detail: "Not set. Optional: it switches off browser features you don't use, such as camera or geolocation." });
  const leaks = ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version"].map((k) => [k, get(k)] as const).filter(([, v]) => v && /\d/.test(v));
  checks.push(leaks.length
    ? { status: "warn", title: "Software versions", detail: `Headers reveal versions: ${leaks.map(([k, v]) => `${k}: ${v}`).join("; ")}. Attackers use this to look up known bugs.`, fix: "Hide version numbers in your server settings (e.g. server_tokens off in nginx, expose_php = Off in PHP)." }
    : { status: "pass", title: "Software versions", detail: "No version numbers in the headers." });
  const xr = get("x-robots-tag");
  if (xr && /noindex|none/i.test(xr)) checks.push({ status: "fail", title: "X-Robots-Tag", detail: `${xr}: this header removes the page from search results.`, fix: "Remove noindex from the X-Robots-Tag header if this page should be found." });

  const scored = checks.filter((c) => c.status !== "info");
  const score = Math.round((scored.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.4 : 0), 0) / Math.max(1, scored.length)) * 100);
  const rows = ["strict-transport-security", "content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy", "server", "x-powered-by", "x-robots-tag", "cache-control", "content-encoding"].map((name) => ({ name, value: get(name) }));
  return { score, checks, rows };
}

export async function headersReport(rawUrl: string) {
  const url = await assertPublicUrl(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
  const r = await safeFetch(url.toString(), { timeoutMs: 10000 });
  if (r.status === 0) throw new Error(`Couldn't load ${url.hostname}: ${r.error ?? "unknown error"}`);
  return { url: r.url, status: r.status, ...analyzeHeaders(r.headers, r.url) };
}
