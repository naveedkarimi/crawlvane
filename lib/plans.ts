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
};

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

