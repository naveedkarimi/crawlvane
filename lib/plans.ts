import { BRAND, contactLink } from "./brand";

/** Plans shown on /pricing and in the home page preview. */
export type Plan = {
  name: string;
  price: string;
  period?: string;
  status: "live" | "soon" | "quote";
  blurb: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
  /** Small print under the price, such as the yearly price or a free trial. */
  note?: string;
};

/** "or $390 a year · 14-day free trial", from the settings that are filled in. */
function priceNote(yearlyLabel?: string): string | undefined {
  const trial = Math.min(60, Math.max(0, Number(process.env.STRIPE_TRIAL_DAYS || 0) || 0));
  const parts = [yearlyLabel ? `or ${yearlyLabel} a year` : "", trial ? `${trial}-day free trial` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

export const plans: Plan[] = [
  {
    name: "Launch",
    price: "$0",
    period: "during launch",
    status: "live",
    blurb: "Every live feature, free while we launch. No account or card needed.",
    features: [
      "Page check with about 50 SEO, AEO and GEO checks",
      "AI crawler access map for 19 bots",
      "Core Web Vitals",
      "Social and brand presence check",
      "Full-site crawl, up to 300 pages",
      "Competitor comparison, up to 3 sites",
      "Ready-to-paste robots.txt, llms.txt and schema",
      "AI fix plan",
      "Shareable report, PDF, Markdown and JSON",
      "App Check: App Store and Google Play listings, any country",
    ],
    cta: { label: "Run a free audit", href: "/#audit" },
    featured: true,
  },
  {
    name: "Pro",
    price: "Coming soon",
    status: "soon",
    blurb: "For site owners and marketers who want to track progress.",
    features: [
      "Everything in Launch",
      "Saved sites and report history",
      "Weekly monitoring with email alerts",
      "AI visibility test across ChatGPT, Claude, Perplexity and Gemini",
      "Deep niche research and content plan",
      "AI-written social posts",
      "JavaScript rendering for single-page apps",
      "For apps: AI listing rewrites, review analysis and competitor comparison",
    ],
    cta: { label: "Join the waitlist", href: "/pricing#waitlist" },
  },
  {
    name: "Agency",
    price: "Coming soon",
    status: "soon",
    blurb: "For consultants and agencies reporting on client sites.",
    features: [
      "Everything in Pro, for more sites",
      "White-label PDF reports with your logo",
      "Embeddable audit widget for lead generation",
      "Team seats",
      "Bulk audits and API access",
      "Priority support",
    ],
    cta: { label: "Ask about a pilot", href: contactLink(`${BRAND.name}: agency pilot`) },
  },
];


/**
 * Paid plans, shown on /pricing once the paywall is on. Limits come from lib/entitlements.ts so
 * the page always matches what's enforced. Prices come from PRICE_PRO_LABEL and PRICE_AGENCY_LABEL
 * (for example "$39"), so nothing is shown until you've set real prices.
 */
export function paidPlans(limits: Record<"free" | "pro" | "agency", import("./entitlements").PlanLimits>, appUrl: (p: string) => string): Plan[] {
  const n = (v: number, one: string, many = `${one}s`) => `${v} ${v === 1 ? one : many}`;
  const signUp = (item: string) => appUrl(`/login?next=${encodeURIComponent(`/dashboard?tab=plan&buy=${item}`)}`);
  const f = limits.free, p = limits.pro, a = limits.agency;
  return [
    {
      name: "Free",
      price: "$0",
      status: "live",
      blurb: "Quick checks and one saved site, free for good.",
      features: [
        "Page checks with about 50 SEO, AEO and GEO checks",
        "AI crawler access map and Core Web Vitals",
        n(f.sites, "saved site") + " with score history" + (f.monitors ? " and a weekly check" : ""),
        "How to fix every issue, and downloads",
        n(f.fullReportsPerMonth, "full site report") + " a month, up to " + f.maxPages + " pages",
        n(f.apps, "tracked app"),
        n(f.aiCreditsPerMonth, "AI credit") + " a month",
      ],
      cta: { label: "Start free", href: appUrl("/login") },
    },
    {
      name: "Pro",
      price: process.env.PRICE_PRO_LABEL || "",
      period: "a month",
      status: "live",
      featured: true,
      blurb: "For site owners and marketers who want to track progress.",
      features: [
        n(p.sites, "website"),
        n(p.fullReportsPerMonth, "full report") + " a month, up to " + p.maxPages + " pages each, with up to " + p.competitors + " competitors",
        "Weekly checks with email alerts for " + n(p.monitors, "site"),
        "AI visibility tracking for " + n(p.visibilityTrackers, "site"),
        n(p.apps, "tracked app") + " with competitor updates",
        n(p.aiCreditsPerMonth, "AI credit") + " a month",
        n(p.seats, "team seat"),
        n(p.apiKeys, "API key"),
      ],
      cta: { label: process.env.STRIPE_TRIAL_DAYS && Number(process.env.STRIPE_TRIAL_DAYS) > 0 ? "Start free trial" : "Choose Pro", href: signUp("pro") },
      note: priceNote(process.env.PRICE_PRO_YEARLY_LABEL),
    },
    {
      name: "Agency",
      price: process.env.PRICE_AGENCY_LABEL || "",
      period: "a month",
      status: "live",
      blurb: "For consultants and agencies reporting on client sites.",
      features: [
        n(a.sites, "website") + ", grouped by client",
        n(a.fullReportsPerMonth, "full report") + " a month",
        "Monthly client reports by email for " + n(a.scheduledReports, "site"),
        "Your logo, colour and domain on client reports",
        n(a.widgets, "audit widget") + " for lead generation",
        n(a.seats, "team seat"),
        n(a.aiCreditsPerMonth, "AI credit") + " a month",
        n(a.apiKeys, "API key"),
      ],
      cta: { label: process.env.STRIPE_TRIAL_DAYS && Number(process.env.STRIPE_TRIAL_DAYS) > 0 ? "Start free trial" : "Choose Agency", href: signUp("agency") },
      note: priceNote(process.env.PRICE_AGENCY_YEARLY_LABEL),
    },
  ];
}
