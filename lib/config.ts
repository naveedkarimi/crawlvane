/**
 * Central configuration and feature flags.
 *
 * LIVE features are on by default. ADVANCED features are fully built but
 * off by default — the UI shows them as "Coming soon". Turn one on for
 * everyone with its env var (e.g. FEATURE_AI_VISIBILITY=1), or test it
 * privately by opening the site with ?admin=YOUR_ADMIN_KEY.
 */

import { BRAND } from "./brand";

export type FeatureKey =
  | "aiView"
  | "botTest"
  | "siteCrawl"
  | "competitors"
  | "fixes"
  | "aiPlan"
  | "pagespeed"
  | "aiVisibility"
  | "deepResearch"
  | "monitoring"
  | "jsRender"
  | "whiteLabel"
  | "accounts"
  | "social"
  | "socialPosts"
  | "appCheck"
  | "appPremium";

export interface FeatureInfo {
  key: FeatureKey;
  name: string;
  description: string;
  tier: "live" | "advanced";
  env: string;
  /** Env vars that must be set for the feature to actually work */
  requires?: string[];
}

export const FEATURES: FeatureInfo[] = [
  { key: "botTest", name: "AI bot access test", description: "Request your page as GPTBot, ClaudeBot, PerplexityBot and more to catch firewall and CDN blocks robots.txt doesn't show.", tier: "live", env: "FEATURE_BOT_TEST" },
  { key: "aiView", name: "What AI sees", description: "Your page as people see it next to the text AI crawlers actually read, with a clear verdict.", tier: "live", env: "FEATURE_AI_VIEW" },
  { key: "siteCrawl", name: "Full-site crawl", description: "Audit up to hundreds of pages and find issues that repeat across the site.", tier: "live", env: "FEATURE_SITE_CRAWL" },
  { key: "competitors", name: "Competitor comparison", description: "Audit up to 3 competitors and see exactly what they do that you don't.", tier: "live", env: "FEATURE_COMPETITORS" },
  { key: "fixes", name: "Ready-to-paste fixes", description: "Generated robots.txt, llms.txt and Organization/WebSite schema for your site.", tier: "live", env: "FEATURE_FIXES" },
  { key: "aiPlan", name: "AI fix plan", description: "Claude turns the findings into a prioritised, step-by-step plan.", tier: "live", env: "FEATURE_AI_PLAN", requires: ["ANTHROPIC_API_KEY"] },
  { key: "pagespeed", name: "Core Web Vitals", description: "Google PageSpeed lab and real-user metrics.", tier: "live", env: "FEATURE_PAGESPEED" },
  { key: "social", name: "Social & brand presence", description: "Which social profiles you link, whether your schema knows them, and how your links look when shared.", tier: "live", env: "FEATURE_SOCIAL" },
  { key: "appCheck", name: "App Check", description: "Check any App Store or Google Play listing in any country and get a score with what to fix.", tier: "live", env: "FEATURE_APP_CHECK" },
  { key: "aiVisibility", name: "AI visibility test", description: "Ask ChatGPT, Claude, Perplexity and Gemini real buyer questions and see who gets mentioned and cited.", tier: "advanced", env: "FEATURE_AI_VISIBILITY", requires: ["ANTHROPIC_API_KEY | OPENAI_API_KEY | PERPLEXITY_API_KEY | GEMINI_API_KEY"] },
  { key: "deepResearch", name: "Deep niche research", description: "Web research on your niche: questions people ask, sources AI trusts, content gaps and a content plan.", tier: "advanced", env: "FEATURE_DEEP_RESEARCH", requires: ["ANTHROPIC_API_KEY"] },
  { key: "monitoring", name: "Weekly monitoring & alerts", description: "Re-audit automatically and get an email when scores drop.", tier: "advanced", env: "FEATURE_MONITORING", requires: ["CRON_SECRET", "SMTP_HOST"] },
  { key: "jsRender", name: "JavaScript rendering", description: "Render JavaScript-heavy sites in a real browser before auditing.", tier: "advanced", env: "FEATURE_JS_RENDER", requires: ["BROWSERLESS_URL"] },
  { key: "whiteLabel", name: "White-label PDF reports", description: "Put your agency name and logo on client reports.", tier: "advanced", env: "FEATURE_WHITE_LABEL" },
  { key: "socialPosts", name: "AI social post writer", description: "Ready-to-post LinkedIn, X, Facebook, Instagram and Reddit posts for any page.", tier: "advanced", env: "FEATURE_SOCIAL_POSTS", requires: ["ANTHROPIC_API_KEY"] },
  { key: "appPremium", name: "App Check premium", description: "AI listing rewrites, review analysis and competitor comparison for apps.", tier: "advanced", env: "FEATURE_APP_PREMIUM", requires: ["ANTHROPIC_API_KEY"] },
  { key: "accounts", name: "Accounts & saved reports", description: "Sign in, keep report history, and manage your plan.", tier: "advanced", env: "FEATURE_ACCOUNTS" },
];

function envFlag(name: string): boolean | undefined {
  const v = process.env[name];
  if (v === undefined || v === "") return undefined;
  return /^(1|true|yes|on)$/i.test(v);
}

/** Is the feature switched on for the public? */
export function isPublic(key: FeatureKey): boolean {
  const f = FEATURES.find((x) => x.key === key)!;
  return envFlag(f.env) ?? f.tier === "live";
}

export function isAdmin(req: Request): boolean {
  const key = process.env.ADMIN_KEY;
  return !!key && key.length >= 8 && req.headers.get("x-admin-key") === key;
}

/** Is the feature usable for this request (public, or admin preview)? */
export function featureEnabled(key: FeatureKey, req?: Request): boolean {
  return isPublic(key) || (!!req && isAdmin(req));
}

/**
 * Pricing hook. Everything is FREE for now. When payments are added, check the
 * user's plan here against FEATURE_PLAN[key]. Until then this always allows.
 */
export const FEATURE_PLAN: Record<FeatureKey, "free" | "pro" | "agency"> = {
  appCheck: "free",
  appPremium: "pro",
  aiView: "free",
  botTest: "free",
  siteCrawl: "pro",
  competitors: "pro",
  fixes: "pro",
  aiPlan: "pro",
  pagespeed: "free",
  aiVisibility: "pro",
  deepResearch: "pro",
  monitoring: "pro",
  jsRender: "pro",
  whiteLabel: "agency",
  accounts: "free",
  social: "free",
  socialPosts: "pro",
};
export const PAYWALL_ENABLED = /^(1|true)$/i.test(process.env.PAYWALL_ENABLED ?? ""); // off: all free

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function planAllows(_key: FeatureKey, _req: Request): boolean {
  if (!PAYWALL_ENABLED) return true;
  return true; // TODO when accounts + Stripe ship: look up the user's plan
}

export const LIMITS = {
  maxPagesDefault: Number(process.env.MAX_PAGES_DEFAULT ?? 50),
  maxPagesHard: Number(process.env.MAX_PAGES_HARD ?? 300),
  crawlConcurrency: Number(process.env.CRAWL_CONCURRENCY ?? 2),
  /** Pause before each page, per worker, so a crawl doesn't hammer the site being checked. */
  crawlDelayMs: Number(process.env.CRAWL_DELAY_MS ?? 500),
  maxCompetitors: 3,
  maxConcurrentJobs: Number(process.env.MAX_CONCURRENT_JOBS ?? 2),
  reportsPerHour: Number(process.env.REPORTS_PER_HOUR ?? 5),
  reportTtlDays: Number(process.env.REPORT_TTL_DAYS ?? 30),
};

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
// Single source of truth for domain and name: lib/brand.ts
export const SITE_URL = BRAND.url;
export const APP_NAME = BRAND.name;
