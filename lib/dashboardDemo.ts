import type { SiteSummary } from "./accounts";
import type { AlertRow } from "./alerts";

/** Example data for /dashboard?demo=1, so the dashboard can be previewed before sign-in is set up. */
const weeks = (scores: [number, number, number, number][]) =>
  scores.map(([overall, seo, aeo, geo], i) => ({ at: new Date(Date.now() - (scores.length - 1 - i) * 7 * 86400000).toISOString(), overall, seo, aeo, geo }));

const bots = (blocked: string[]) =>
  ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"].map((bot) => ({ bot, purpose: "search", allowed: !blocked.includes(bot) }));

export const DEMO_SITES: SiteSummary[] = [
  {
    id: "demo-1", url: "https://yourbusiness.com", domain: "yourbusiness.com", clientName: null, createdAt: "",
    latest: { overall: 72, seo: 91, aeo: 74, geo: 48, at: new Date().toISOString(), source: "monitor" }, delta: 4,
    issues: [
      { id: "ai-search-bots", title: "GPTBot is blocked in robots.txt", status: "fail", category: "geo", weight: 3, detail: "" },
      { id: "entity-schema", title: "No Organization schema on your homepage", status: "fail", category: "geo", weight: 3, detail: "" },
      { id: "direct-answer", title: "Service pages have no direct answer in the first paragraph", status: "fail", category: "aeo", weight: 3, detail: "" },
      { id: "meta-description", title: "Meta descriptions on 4 of 12 pages are too long", status: "warn", category: "seo", weight: 2, detail: "" },
    ],
    bots: bots(["GPTBot"]),
    history: weeks([[61, 84, 60, 30], [62, 85, 61, 31], [64, 86, 63, 33], [66, 87, 66, 36], [67, 88, 68, 38], [69, 89, 70, 41], [68, 90, 71, 44], [72, 91, 74, 48]]),
  },
  {
    id: "demo-2", url: "https://shop.yourbusiness.com", domain: "shop.yourbusiness.com", clientName: null, createdAt: "",
    latest: { overall: 54, seo: 82, aeo: 51, geo: 29, at: new Date(Date.now() - 5 * 86400000).toISOString(), source: "monitor" }, delta: -7,
    issues: [{ id: "product-schema", title: "Product schema missing on 24 pages", status: "fail", category: "seo", weight: 3, detail: "" }],
    bots: bots([]),
    history: weeks([[60, 84, 55, 35], [61, 84, 56, 36], [61, 83, 56, 34], [60, 83, 55, 33], [61, 84, 56, 34], [61, 83, 55, 33], [61, 83, 54, 31], [54, 82, 51, 29]]),
  },
  {
    id: "demo-3", url: "https://yourbusiness.co.uk", domain: "yourbusiness.co.uk", clientName: null, createdAt: "",
    latest: { overall: 91, seo: 96, aeo: 90, geo: 86, at: new Date().toISOString(), source: "monitor" }, delta: 1,
    issues: [{ id: "duplicate-title", title: "2 pages share the same title", status: "warn", category: "seo", weight: 1, detail: "" }],
    bots: bots(["OAI-SearchBot"]),
    history: weeks([[85, 93, 84, 80], [86, 93, 85, 81], [87, 94, 86, 82], [88, 95, 87, 83], [89, 95, 88, 84], [89, 95, 89, 85], [90, 96, 89, 85], [91, 96, 90, 86]]),
  },
];

export const DEMO_ALERTS: AlertRow[] = [
  { id: 1, kind: "fail", title: "shop.yourbusiness.com dropped 7 points", detail: "Product schema went missing on 24 pages. This often happens after a theme update.", read: false, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, kind: "pass", title: "yourbusiness.com went up 4 points", detail: "FAQ markup on /services is now valid.", read: false, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 3, kind: "warn", title: "yourbusiness.co.uk has 2 duplicate titles", detail: "Found on /about and /about-us.", read: true, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
];

/** Weekly checks for the preview: the next run is the coming Monday at 06:00 UTC. */
const nextMonday = () => {
  const d = new Date();
  d.setUTCHours(6, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  return d.getTime();
};
export const DEMO_MONITORS = DEMO_SITES.map((s) => ({ site_id: s.id, every_days: 7, alert_email: null, last_run_at: new Date(nextMonday() - 7 * 86400000).toISOString() }));
