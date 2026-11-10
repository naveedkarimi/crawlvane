// Tests the app store checker without calling the stores: `npm test`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

delete process.env.SERPAPI_KEY;
const { parseAppInput, parseAppleSubtitle, normalizeApple, normalizeGoogle, scoreListing, lookupApp, AppStoreError } = await import("../lib/appStore");
const { analyze } = await import("../lib/analyze");

// Inputs
assert.deepEqual(parseAppInput("https://apps.apple.com/us/app/whatsapp-messenger/id310633997"), { store: "apple", id: "310633997" });
assert.deepEqual(parseAppInput("https://play.google.com/store/apps/details?hl=en&id=com.whatsapp"), { store: "google", id: "com.whatsapp" });
assert.deepEqual(parseAppInput("id310633997"), { store: "apple", id: "310633997" });
assert.deepEqual(parseAppInput("com.example.app"), { store: "google", id: "com.example.app" });
assert.deepEqual(parseAppInput("Notion", "google"), { store: "google", term: "Notion" });
assert.equal(typeof parseAppInput("https://example.com/app"), "string");
assert.equal(typeof parseAppInput("   "), "string");
console.log("✓ app input parsing");

// The app's own subtitle sits right after the heading; similar apps' subtitles come later
const page1 = '<main><h1 class="t">WhatsApp Messenger</h1><p class="subtitle svelte-x">Simple. Reliable. Private.</p></main><section><p class="subtitle">Business</p></section>';
assert.equal(parseAppleSubtitle(page1), "Simple. Reliable. Private.");
assert.equal(parseAppleSubtitle("<p class='x'>no heading</p><p class=\"subtitle\">Business</p>"), null);
assert.equal(parseAppleSubtitle('<h1>App</h1><p class="developer">Acme</p>' + "x".repeat(1600) + '<p class="subtitle">Other app</p>'), "");
assert.equal(parseAppleSubtitle('<h1>A</h1><p class="subtitle">Notes &amp; Tasks</p>'), "Notes & Tasks");
console.log("✓ App Store subtitle reading");

// Apple listing from a trimmed real lookup response
const appleRaw = JSON.parse(readFileSync(new URL("./fixtures/apple-lookup-sample.json", import.meta.url), "utf8")).results[0];
const apple = normalizeApple(appleRaw, "us", "Simple. Reliable. Secure.");
assert.equal(apple.store, "apple");
assert.equal(apple.title, "WhatsApp");
assert.ok(apple.ratingCount! > 1000);
assert.ok(apple.languages! >= 5);
const updated = Date.parse(apple.lastUpdated!);
const fresh = scoreListing(apple, updated + 10 * 86400000);
const byId = (s: typeof fresh) => Object.fromEntries(s.checks.map((c) => [c.id, c.status]));
assert.equal(byId(fresh).rating, "pass");
assert.equal(byId(fresh)["rating-count"], "pass");
assert.equal(byId(fresh).updated, "pass");
assert.equal(byId(fresh).subtitle, "pass");
assert.equal(byId(fresh)["keywords-note"], "info");
assert.ok(fresh.score >= 0 && fresh.score <= 100);
const stale = scoreListing({ ...apple, subtitle: "", releaseNotes: "Bug fixes and improvements.", screenshots: 2 }, updated + 400 * 86400000);
assert.equal(byId(stale).updated, "fail");
assert.equal(byId(stale).subtitle, "fail");
assert.equal(byId(stale)["release-notes"], "warn");
assert.equal(byId(stale).screenshots, "fail");
assert.ok(stale.score < fresh.score);
assert.equal(byId(scoreListing({ ...apple, subtitle: null })).subtitle, "info");
console.log("✓ App Store listing scoring");

// Google Play listing in SerpApi's documented shape
const google = normalizeGoogle({
  product_info: { title: "Example Notes", authors: [{ name: "Example Inc" }], rating: 3.8, reviews: 240, downloads: "10K+", thumbnail: "https://play-lh.example/icon", content_rating: { text: "Everyone" } },
  about_this_app: { snippet: "Example Notes keeps your notes in sync across devices. Write, sort and find anything in seconds.", updated_on: "Oct 31, 2026" },
  media: { images: ["a", "b", "c"], video: { link: "https://youtube.example/v" } },
  categories: [{ name: "Productivity" }],
  what_s_new: { snippet: "Faster search and a new dark theme." },
  data_safety: [{ text: "No data shared with third parties" }],
}, "com.example.notes", "de");
assert.equal(google.title, "Example Notes");
assert.equal(google.installs, "10K+");
assert.equal(google.hasVideo, true);
assert.equal(google.descriptionComplete, false);
assert.ok(google.url.includes("gl=de"));
const g = byId(scoreListing(google));
assert.equal(g.rating, "fail");
assert.equal(g["rating-count"], "warn");
assert.equal(g.screenshots, "warn");
assert.equal(g.video, "pass");
assert.equal(g["data-safety"], "pass");
assert.equal(g.subtitle, undefined);
console.log("✓ Google Play listing scoring");

await assert.rejects(lookupApp({ store: "google", id: "com.example.missingkey" }, "us"), (e: unknown) => e instanceof AppStoreError && e.status === 503 && /SERPAPI_KEY/.test(e.message));
console.log("✓ Google Play explains a missing provider key");

// Website app checks only appear when a page links to an app
const page = (body: string) => ({ url: "https://acme.example/", ok: true, status: 200, body, headers: { "content-type": "text/html" }, redirects: [], ms: 100, bytes: body.length });
const base = { requestedUrl: "https://acme.example/", robots: null, sitemap: null, llms: null, llmsFull: null };
const none = analyze({ ...base, page: page("<html><head><title>Acme</title></head><body><a href='/about'>About</a></body></html>"), appFiles: { aasa: null, assetlinks: null } });
assert.equal(none.checks.some((c) => c.id.startsWith("app-")), false);
const withApp = analyze({
  ...base,
  page: page("<html><head><title>Acme</title></head><body><a href='https://apps.apple.com/us/app/acme/id123456789'>App Store</a><a href='https://play.google.com/store/apps/details?id=com.acme.app'>Google Play</a></body></html>"),
  appFiles: { aasa: null, assetlinks: { ...page('[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.acme.app"}}]'), headers: { "content-type": "application/json" } } },
});
const w = Object.fromEntries(withApp.checks.filter((c) => c.id.startsWith("app-")).map((c) => [c.id, c]));
assert.equal(w["app-smart-banner"].status, "warn");
assert.match(w["app-smart-banner"].fix ?? "", /app-id=123456789/);
assert.equal(w["app-aasa"].status, "warn");
assert.equal(w["app-assetlinks"].status, "pass");
assert.equal(w["app-schema"].status, "warn");
console.log("✓ website app checks");
