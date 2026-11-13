import { BRAND } from "./brand";

/**
 * Comparison pages (/compare/[slug]). Every fact about another company comes from its own pricing page,
 * read on CHECKED. Re-check before changing anything, keep the date honest, and never add a claim
 * you haven't seen on their site. Prices change; the page says so.
 */
export const CHECKED = "2026-11-13";

export interface Comparison {
  slug: string;
  name: string;
  site: string;
  pricingUrl: string;
  /** One line on what it is, in its own terms. */
  what: string;
  prices: string;
  trial: string;
  engines: string;
  fixes: string;
  /** Where the other tool is the better choice. Be fair: this is what makes the page credible. */
  theyWin: string[];
  /** Where this product is the better choice. Only things it really does today. */
  weWin: string[];
  /** What the two have in common, for the first sentence. */
  common: string;
  /** How the two fit together, for "Use both". */
  together: string;
}

export const COMPARISONS: Comparison[] = [
  {
    slug: "otterly",
    name: "OtterlyAI",
    site: "otterly.ai",
    pricingUrl: "https://otterly.ai/pricing",
    what: "AI search monitoring: it tracks brand mentions and citations across AI engines, with prompt research and a GEO audit.",
    prices: "Lite €29, Standard €189 and Premium €489 a month (excluding tax), Enterprise on request. 15% off yearly.",
    trial: "Free trial; no free plan.",
    engines: "ChatGPT, Google AI Overviews, Perplexity, Microsoft Copilot, Google AI Mode, Gemini and Claude. Lite covers 4 of the 7.",
    fixes: "Recommendations (3 a week on Lite). Its pricing page doesn't mention generating robots.txt, schema or llms.txt files.",
    theyWin: ["Tracks more AI engines, including Copilot and Google AI Mode", "A dedicated monitoring product with plans for larger brands"],
    common: "help you show up in AI answers",
    together: "OtterlyAI watches how AI talks about you over time, and " + BRAND.name + " finds and fixes what stops AI from reading and citing your site.",
    weWin: [
      "A free full audit across SEO, answer engines and AI assistants, about 50 checks",
      "Ready-to-paste fixes: robots.txt, llms.txt, schema and meta tags written for your site",
      "\"What AI sees\": the text AI crawlers actually get from your page",
      "Classic SEO, speed and accessibility checks in the same report",
    ],
  },
  {
    slug: "peec",
    name: "Peec AI",
    site: "peec.ai",
    pricingUrl: "https://peec.ai/pricing",
    what: "AI visibility and brand monitoring for marketing teams and agencies: visibility, share of voice and the sources AI cites.",
    prices: "Starter $95, Pro $245 and Advanced $495 a month, Enterprise on request. 15% off yearly. Extra AI models cost more.",
    trial: "Free trial; no free plan.",
    engines: "ChatGPT, Perplexity, AI Overview, AI Mode, Gemini, Naver AI Briefing, ERNIE and Bing AI Mode. Enterprise adds models such as Claude.",
    fixes: "Shows which AI bots robots.txt allows and recommended actions. Its pricing page doesn't mention generating robots.txt, schema or llms.txt files.",
    theyWin: ["More engines and regions, including Naver and ERNIE", "Built for marketing teams tracking many prompts and brands"],
    common: "help you show up in AI answers",
    together: "Peec AI watches how AI talks about you over time, and " + BRAND.name + " finds and fixes what stops AI from reading and citing your site.",
    weWin: [
      "A free full audit across SEO, answer engines and AI assistants, about 50 checks",
      "Ready-to-paste fixes: robots.txt, llms.txt, schema and meta tags written for your site",
      "Claude included in AI visibility tracking, not only on Enterprise",
      "Classic SEO, speed and accessibility checks in the same report",
    ],
  },
  {
    slug: "seoptimer",
    name: "SEOptimer",
    site: "seoptimer.com",
    pricingUrl: "https://www.seoptimer.com/pricing",
    what: "An SEO audit tool for site owners and agencies, with rank tracking, keyword and backlink research, an AI writer and white-label reports.",
    prices: "Starter $29, Pro $49 and Max $99 a month. White-label PDF reports start on Pro; the lead generation tool is on Max.",
    trial: "7-day free trial; no free plan.",
    engines: "Its pricing page doesn't mention tracking AI assistants such as ChatGPT or Perplexity.",
    fixes: "SEO audits and reports. Its pricing page doesn't mention generating robots.txt, schema or llms.txt files.",
    theyWin: [
      "Keyword and backlink research (25 to 250 searches a month by plan), and rank tracking for keywords you don't rank for yet. " + BRAND.name + " tracks positions from your own Search Console and backlinks from Bing",
      "A set number of AI writer articles each month (20 to 80 by plan)",
      "White-label PDF reports from $49 a month, and a lead generation tool on the $99 plan",
    ],
    common: "audit websites and turn the results into reports",
    together: "SEOptimer covers keywords, backlinks and classic SEO reports, and " + BRAND.name + " covers what answer engines and AI assistants need, with the fixes to paste in.",
    weWin: [
      "Checks for answer engines and AI assistants, not just classic SEO: about 50 checks across SEO, AEO and GEO",
      "Which AI crawlers can read your site, and \"What AI sees\": the text they actually get",
      "Ready-to-paste fixes: robots.txt, llms.txt, schema and meta tags written for your site",
      "AI visibility tracking: whether ChatGPT, Claude, Perplexity and Gemini mention you",
    ],
  },
];

/** "Track…" → "track…", but "AI visibility" stays as it is. */
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export const comparison = (slug: string) => COMPARISONS.find((c) => c.slug === slug);

export function comparisonMarkdown(c: Comparison): string {
  const checked = new Date(CHECKED + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `
${c.name} and ${BRAND.name} both ${c.common}, but they start from different places. ${c.name} is ${lowerFirst(c.what)} ${BRAND.name} audits your site for search engines, answer engines and AI assistants, then gives you the fixes to paste in.

## At a glance

| | ${BRAND.name} | ${c.name} |
|---|---|---|
| What it is | Site audit for SEO, AEO and GEO, with ready-to-paste fixes and AI visibility tracking | ${c.what} |
| Price | Free during launch. Paid plans aren't priced yet | ${c.prices} |
| Free option | Free audit, no sign-up for a page check | ${c.trial} |
| AI engines | ChatGPT, Claude, Perplexity and Gemini (each needs its provider key) | ${c.engines} |
| Fixes | Writes robots.txt, llms.txt, schema and meta tags for your site | ${c.fixes} |

## Choose ${c.name} if

${c.theyWin.map((x) => `- ${x}`).join("\n")}

## Choose ${BRAND.name} if

${c.weWin.map((x) => `- ${x}`).join("\n")}

## Use both

They fit together: ${c.together}

[Check your site free](/) · [See all features](/features)

---

_${c.name}'s details come from [its pricing page](${c.pricingUrl}), checked on ${checked}. Prices and plans change, so check there before you buy. ${c.name} is a trademark of its owner; ${BRAND.name} isn't affiliated with it._
`;
}
