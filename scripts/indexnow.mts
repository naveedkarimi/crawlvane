/**
 * Tells IndexNow (Bing, Yandex and others) about every page in this site's live sitemap.
 * Run after a deploy that adds or changes pages:  npm run indexnow
 * Needs INDEXNOW_KEY and NEXT_PUBLIC_SITE_URL in .env.local, and the site live so
 * /indexnow.txt and /sitemap.xml load.
 */
import { sendIndexNow } from "../lib/indexNow";

const key = process.env.INDEXNOW_KEY?.trim();
const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/+$/, "");
if (!key || !site) {
  console.error("Set INDEXNOW_KEY and NEXT_PUBLIC_SITE_URL in .env.local first.");
  process.exit(1);
}

const keyLocation = `${site}/indexnow.txt`;
const live = await fetch(keyLocation).then((r) => r.text()).catch(() => "");
if (live.trim() !== key) {
  console.error(`${keyLocation} doesn't hold INDEXNOW_KEY yet. Deploy with INDEXNOW_KEY set, then run this again.`);
  process.exit(1);
}

const xml = await fetch(`${site}/sitemap.xml`).then((r) => r.text());
const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(site));
console.log(`Sending ${urls.length} URLs from ${site}/sitemap.xml…`);
for (let i = 0; i < urls.length; i += 1000) {
  const r = await sendIndexNow(site, key, urls.slice(i, i + 1000), keyLocation);
  console.log(`${r.ok ? "✓" : "✗"} ${r.status} ${r.message}`);
  if (!r.ok) process.exit(1);
}
