import { safeFetch } from "./safeFetch";
import type { Status } from "./types";

/**
 * App Store and Google Play listing checks ("SEO for apps").
 * Apple: the public iTunes lookup and search services and the customer reviews feed (no key).
 * Google Play: SerpApi (SERPAPI_KEY). Google has no public listing API, and reading Play pages
 * directly risks breaking its terms, so Play needs the provider.
 */
export type Store = "apple" | "google";

export class AppStoreError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface AppRef {
  store: Store;
  id?: string;
  term?: string;
}

export interface AppListing {
  store: Store;
  id: string;
  url: string;
  country: string;
  title: string;
  developer: string;
  icon?: string;
  rating: number | null;
  ratingCount: number | null;
  /** Apple only: rating of the current version. */
  currentVersionRating?: number | null;
  currentVersionRatingCount?: number | null;
  installs?: string | null;
  price?: string | null;
  category?: string | null;
  contentRating?: string | null;
  /** Apple subtitle. null when it couldn't be read. */
  subtitle?: string | null;
  description: string;
  /** False when the source only gives the start of the description (Google Play via SerpApi). */
  descriptionComplete: boolean;
  screenshots: number;
  tabletScreenshots?: number | null;
  supportsTablet?: boolean;
  hasVideo: boolean | null;
  languages: number | null;
  lastUpdated: string | null;
  releaseNotes: string | null;
  dataSafety?: boolean | null;
  histogram?: { stars: number; count: number }[];
}

export interface AppReview {
  rating: number;
  title?: string;
  text: string;
  date?: string;
  version?: string;
}

/** Work out the store and app from a link, an App Store id, a Play package name or a search term. */
export function parseAppInput(raw: string, prefer: Store = "apple"): AppRef | string {
  const s = raw.trim();
  if (!s) return "Enter an App Store or Google Play link, or the app's name.";
  if (s.length > 300) return "That's too long. Paste the store link or the app's name.";
  const apple = s.match(/(?:apps|itunes)\.apple\.com\/.*?id(\d{5,12})/i);
  if (apple) return { store: "apple", id: apple[1] };
  const play = s.match(/play\.google\.com\/store\/apps\/details\?(?:[^#]*&)?id=([\w.]+)/i);
  if (play) return { store: "google", id: play[1] };
  if (/^(?:id)?\d{5,12}$/i.test(s)) return { store: "apple", id: s.replace(/^id/i, "") };
  if (/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(s) && !/\s/.test(s)) return { store: "google", id: s };
  if (/^https?:\/\//i.test(s)) return "That link isn't an App Store or Google Play app page.";
  return { store: prefer, term: s };
}

// ---------- Cache: same app, store and country within an hour ----------
const HOUR = 3600_000;
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < HOUR) return hit.value as T;
  const value = await make();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return value;
}

async function getJson(url: string, timeoutMs = 12000): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } }).catch(() => null);
  if (!res) throw new AppStoreError("The store didn't answer in time. Try again in a minute.", 504);
  if (!res.ok) throw new AppStoreError(`The store answered with HTTP ${res.status}. Try again later.`, 502);
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

// ---------- Apple ----------
type AppleResult = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/** Exported for tests. */
export function normalizeApple(r: AppleResult, country: string, subtitle: string | null): AppListing {
  const devices = arr(r.supportedDevices).map(String);
  return {
    store: "apple",
    id: String(r.trackId),
    url: str(r.trackViewUrl).split("?")[0] || `https://apps.apple.com/${country}/app/id${r.trackId}`,
    country,
    title: str(r.trackName),
    developer: str(r.sellerName) || str(r.artistName),
    icon: str(r.artworkUrl100) || undefined,
    rating: num(r.averageUserRating),
    ratingCount: num(r.userRatingCount),
    currentVersionRating: num(r.averageUserRatingForCurrentVersion),
    currentVersionRatingCount: num(r.userRatingCountForCurrentVersion),
    price: str(r.formattedPrice) || null,
    category: str(r.primaryGenreName) || null,
    contentRating: str(r.contentAdvisoryRating) || null,
    subtitle,
    description: str(r.description),
    descriptionComplete: true,
    screenshots: arr(r.screenshotUrls).length,
    tabletScreenshots: arr(r.ipadScreenshotUrls).length,
    supportsTablet: devices.some((d) => /^ipad/i.test(d)),
    hasVideo: null,
    languages: arr(r.languageCodesISO2A).length || null,
    lastUpdated: str(r.currentVersionReleaseDate) || null,
    releaseNotes: str(r.releaseNotes) || null,
  };
}

/**
 * The app's own subtitle is the first "subtitle" element after the page's main heading. The page
 * also lists subtitles of similar apps further down, so never take the first match on the page.
 * Returns null when the heading can't be found (markup changed), "" when the app has no subtitle.
 * Exported for tests.
 */
export function parseAppleSubtitle(html: string): string | null {
  const h1 = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
  if (!h1 || h1.index === undefined) return null;
  const after = html.slice(h1.index + h1[0].length, h1.index + h1[0].length + 1500);
  const m = after.match(/<[a-z0-9]+[^>]*class="[^"]*\bsubtitle\b[^"]*"[^>]*>\s*([^<]{1,80}?)\s*</i);
  return m ? m[1].replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim() : "";
}

/** The lookup service doesn't include the subtitle, so read it from the public App Store page. */
async function appleSubtitle(id: string, country: string): Promise<string | null> {
  try {
    const page = await safeFetch(`https://apps.apple.com/${country}/app/id${id}`, { timeoutMs: 8000 });
    return page.ok ? parseAppleSubtitle(page.body) : null;
  } catch {
    return null;
  }
}

async function appleLookup(ref: AppRef, country: string): Promise<AppListing> {
  const q = ref.id
    ? `https://itunes.apple.com/lookup?id=${encodeURIComponent(ref.id)}&country=${country}&entity=software`
    : `https://itunes.apple.com/search?term=${encodeURIComponent(ref.term ?? "")}&country=${country}&entity=software&limit=1`;
  const data = await getJson(q);
  const r = arr(data.results).find((x) => (x as AppleResult)?.kind === "software" || (x as AppleResult)?.trackId) as AppleResult | undefined;
  if (!r) throw new AppStoreError(ref.id ? "That app isn't in the App Store for this country." : "No App Store app matched that name in this country.", 404);
  const subtitle = await appleSubtitle(String(r.trackId), country);
  return normalizeApple(r, country, subtitle);
}

export async function appleReviews(id: string, country: string, pages = 2): Promise<AppReview[]> {
  const out: AppReview[] = [];
  for (let p = 1; p <= pages; p++) {
    const data = await getJson(`https://itunes.apple.com/${country}/rss/customerreviews/page=${p}/id=${encodeURIComponent(id)}/sortby=mostrecent/json`).catch(() => null);
    const feed = (data?.feed ?? {}) as Record<string, unknown>;
    const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
    const label = (o: unknown, k: string) => str(((o as Record<string, unknown>)?.[k] as Record<string, unknown>)?.label);
    for (const e of entries) {
      const rating = Number(label(e, "im:rating"));
      if (!rating) continue;
      out.push({ rating, title: label(e, "title"), text: label(e, "content"), date: label(e, "updated"), version: label(e, "im:version") });
    }
    if (entries.length < 50) break;
  }
  return out;
}

// ---------- Google Play (SerpApi) ----------
function serpKey(): string {
  const key = process.env.SERPAPI_KEY?.trim();
  if (!key) throw new AppStoreError("Google Play checks aren't switched on yet. The site owner needs to add a SERPAPI_KEY.", 503);
  return key;
}

async function serp(params: Record<string, string>): Promise<Record<string, unknown>> {
  const u = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("api_key", serpKey());
  const data = await getJson(u.toString(), 30000);
  if (typeof data.error === "string") {
    if (/hasn't returned any results|not found|no results/i.test(data.error)) throw new AppStoreError("That app isn't on Google Play for this country.", 404);
    throw new AppStoreError("Google Play data isn't available right now. Try again later.", 502);
  }
  return data;
}

/** Exported for tests. */
export function normalizeGoogle(d: Record<string, unknown>, id: string, country: string): AppListing {
  const info = (d.product_info ?? {}) as Record<string, unknown>;
  const about = (d.about_this_app ?? {}) as Record<string, unknown>;
  const media = (d.media ?? {}) as Record<string, unknown>;
  const updated = str(about.updated_on) || str(d.updated_on);
  const t = updated ? Date.parse(updated) : NaN;
  const authors = arr(info.authors) as Record<string, unknown>[];
  const cats = arr(d.categories) as Record<string, unknown>[];
  return {
    store: "google",
    id,
    url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}&gl=${country}`,
    country,
    title: str(info.title),
    developer: str(authors[0]?.name) || str(about.offered_by),
    icon: str(info.thumbnail) || undefined,
    rating: num(info.rating),
    ratingCount: num(info.reviews),
    installs: str(info.downloads) || str(about.downloads) || null,
    category: str(cats[0]?.name) || null,
    contentRating: str((info.content_rating as Record<string, unknown>)?.text) || str(about.content_rating) || null,
    description: str(about.snippet),
    descriptionComplete: false,
    screenshots: arr(media.images).length,
    hasVideo: !!str((media.video as Record<string, unknown>)?.link),
    languages: null,
    lastUpdated: Number.isFinite(t) ? new Date(t).toISOString() : null,
    releaseNotes: str((d.what_s_new as Record<string, unknown>)?.snippet) || null,
    dataSafety: arr(d.data_safety).length > 0,
    histogram: (arr(d.ratings) as Record<string, unknown>[]).map((r) => ({ stars: Number(r.stars), count: Number(r.count) })).filter((r) => r.stars),
  };
}

async function googleLookup(ref: AppRef, country: string): Promise<AppListing> {
  let id = ref.id;
  if (!id) {
    const s = await serp({ engine: "google_play", store: "apps", q: ref.term ?? "", gl: country, hl: "en" });
    for (const group of arr(s.organic_results) as Record<string, unknown>[]) {
      const item = (arr(group.items) as Record<string, unknown>[]).find((i) => str(i.product_id));
      if (item) {
        id = str(item.product_id);
        break;
      }
    }
    if (!id) throw new AppStoreError("No Google Play app matched that name in this country.", 404);
  }
  const d = await serp({ engine: "google_play_product", store: "apps", product_id: id, gl: country, hl: "en" });
  const listing = normalizeGoogle(d, id, country);
  if (!listing.title) throw new AppStoreError("That app isn't on Google Play for this country.", 404);
  return listing;
}

export async function googleReviews(id: string, country: string): Promise<AppReview[]> {
  const d = await serp({ engine: "google_play_product", store: "apps", product_id: id, gl: country, hl: "en", all_reviews: "true", sort_by: "2", num: "100" });
  return (arr(d.reviews) as Record<string, unknown>[])
    .map((r) => ({ rating: Number(r.rating), text: str(r.snippet), date: str(r.iso_date) || str(r.date) }))
    .filter((r) => r.rating && r.text);
}

export function lookupApp(ref: AppRef, country: string): Promise<AppListing> {
  const key = `${ref.store}:${ref.id ?? "q=" + (ref.term ?? "").toLowerCase()}:${country}`;
  return cached(key, () => (ref.store === "apple" ? appleLookup(ref, country) : googleLookup(ref, country)));
}

export function fetchReviews(l: AppListing): Promise<AppReview[]> {
  return cached(`reviews:${l.store}:${l.id}:${l.country}`, () => (l.store === "apple" ? appleReviews(l.id, l.country) : googleReviews(l.id, l.country)));
}

// ---------- Scoring ----------
export interface AppCheck {
  id: string;
  group: string;
  title: string;
  status: Status;
  detail: string;
  fix?: string;
  weight: 1 | 2 | 3;
}

const GENERIC_NOTES = /^(bug fixes( and (performance |stability )?improvements)?|minor (bug fixes|improvements)|performance improvements|we update the app regularly.*)[.!]?$/i;

export function scoreListing(l: AppListing, now = Date.now()): { score: number; checks: AppCheck[] } {
  const checks: AppCheck[] = [];
  const add = (group: string, id: string, title: string, status: Status, detail: string, fix?: string, weight: 1 | 2 | 3 = 2) =>
    checks.push({ id, group, title, status, detail, fix: status === "pass" || status === "info" ? undefined : fix, weight });
  const apple = l.store === "apple";
  const G = { search: "Search visibility", page: "Store page", ratings: "Ratings", fresh: "Freshness", reach: "Reach and trust" };

  // Search visibility
  const tl = l.title.length;
  add(G.search, "title", "App name", tl >= 15 ? "pass" : "warn",
    `"${l.title}" uses ${tl} of 30 characters.`,
    "Add one short phrase people search for after your brand, for example \"Brand: Photo Editor\". Keep it readable.", 3);
  if (apple) {
    if (l.subtitle === null) add(G.search, "subtitle", "Subtitle", "info", "We couldn't read the subtitle for this app.");
    else
      add(G.search, "subtitle", "Subtitle", !l.subtitle ? "fail" : l.subtitle.length >= 15 ? "pass" : "warn",
        l.subtitle ? `"${l.subtitle}" uses ${l.subtitle.length} of 30 characters.` : "No subtitle. Apple shows it under your name and uses it in search.",
        "Write a 30-character subtitle that says what the app does, using words people search for. Don't repeat words from the name.", 3);
  }
  const firstPara = l.description.split(/\n\s*\n|\n/).map((s) => s.trim()).find(Boolean) ?? "";
  add(G.search, "description-opening", "Opening of the description", firstPara.length >= 40 && firstPara.length <= 255 ? "pass" : "warn",
    firstPara
      ? `The first paragraph is ${firstPara.length} characters. Only the first few lines show before "more".`
      : "The description has no clear opening paragraph.",
    "Start with one or two sentences that say what the app does and who it's for, under about 250 characters.", 2);
  if (apple)
    add(G.search, "keywords-note", "Keywords field", "info",
      "Apple ranks apps on the name, subtitle and a hidden 100-character keywords field set in App Store Connect, not on the description. We can't see that field.");
  else
    add(G.search, "description-keywords", "Description and search", "info",
      "Google Play uses the full description for search, so use the phrases people search for naturally and early. Our data source shows only the start of the description.");

  // Store page
  const max = apple ? 10 : 8;
  add(G.page, "screenshots", "Screenshots", l.screenshots >= 5 ? "pass" : l.screenshots >= 3 ? "warn" : "fail",
    `${l.screenshots} of up to ${max} phone screenshots.`,
    "Use at least 5 screenshots. The first three show in search results, so make each one sell a single benefit with a short caption.", 3);
  if (apple && l.supportsTablet)
    add(G.page, "tablet-screenshots", "iPad screenshots", l.tabletScreenshots ? "pass" : "warn",
      l.tabletScreenshots ? `${l.tabletScreenshots} iPad screenshots.` : "The app runs on iPad but has no iPad screenshots.",
      "Add iPad screenshots so the listing looks right on iPad and in iPad search.", 1);
  if (l.hasVideo === null)
    add(G.page, "video", "Preview video", "info", "Apple's data doesn't say whether there's an app preview. A preview of up to 30 seconds can lift installs.");
  else
    add(G.page, "video", "Promo video", l.hasVideo ? "pass" : "warn",
      l.hasVideo ? "The listing has a video." : "No promo video.",
      "Add a short video that shows the app in use in the first few seconds.", 1);

  // Ratings
  const r = l.rating;
  add(G.ratings, "rating", "Average rating", r === null ? "fail" : r >= 4.5 ? "pass" : r >= 4 ? "warn" : "fail",
    r === null ? "No ratings yet." : `${r.toFixed(1)} out of 5.`,
    "Fix the issues people mention most in reviews, then ask happy users for a rating at a good moment.", 3);
  const c = l.ratingCount ?? 0;
  add(G.ratings, "rating-count", "Number of ratings", c >= 1000 ? "pass" : c >= 100 ? "warn" : "fail",
    `${c.toLocaleString("en-US")} ${apple ? "ratings" : "reviews"}.`,
    apple
      ? "Use Apple's in-app rating prompt after a success moment, such as finishing a task, not on first launch."
      : "Use Google Play's In-App Review API after a success moment, such as finishing a task, not on first launch.", 2);
  if (apple && l.currentVersionRating && (l.currentVersionRatingCount ?? 0) >= 20 && r !== null) {
    const drop = r - l.currentVersionRating;
    add(G.ratings, "current-version", "Rating of the latest version", drop > 0.3 ? "warn" : "pass",
      `${l.currentVersionRating.toFixed(1)} for the latest version, ${r.toFixed(1)} overall.`,
      "The latest version is rated lower. Read recent reviews for a new bug or a change people dislike.", 2);
  }

  // Freshness
  if (l.lastUpdated) {
    const days = Math.floor((now - Date.parse(l.lastUpdated)) / 86400000);
    add(G.fresh, "updated", "Last update", days <= 90 ? "pass" : days <= 180 ? "warn" : "fail",
      `Updated ${days} days ago.`,
      "Ship an update at least every few months. Stores and users see long gaps as a sign the app is abandoned.", 2);
  } else add(G.fresh, "updated", "Last update", "info", "We couldn't read the last update date.");
  const notes = (l.releaseNotes ?? "").trim();
  add(G.fresh, "release-notes", apple ? "Release notes" : "What's new", !notes ? "warn" : GENERIC_NOTES.test(notes) ? "warn" : "pass",
    !notes ? "No release notes." : GENERIC_NOTES.test(notes) ? `"${notes.slice(0, 80)}" doesn't tell people what changed.` : "The release notes describe the update.",
    "Say what's new or fixed in plain words. People read release notes before updating, and they show you're active.", 1);

  // Reach and trust
  if (l.languages !== null)
    add(G.reach, "languages", "Languages", l.languages >= 5 ? "pass" : "warn",
      `Available in ${l.languages} language${l.languages === 1 ? "" : "s"}.`,
      "Translate the name, subtitle and screenshots for your biggest markets. Each language gets its own search index.", 2);
  if (!apple)
    add(G.reach, "data-safety", "Data safety", l.dataSafety ? "pass" : "warn",
      l.dataSafety ? "The data safety section is filled in." : "No data safety details found.",
      "Complete the Data safety form in the Play Console. People check it before installing.", 1);

  const scored = checks.filter((x) => x.status !== "info");
  const total = scored.reduce((n, x) => n + x.weight, 0);
  const got = scored.reduce((n, x) => n + x.weight * (x.status === "pass" ? 1 : x.status === "warn" ? 0.5 : 0), 0);
  return { score: total ? Math.round((got / total) * 100) : 0, checks };
}
