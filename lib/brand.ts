/**
 * Brand constants. Change the product name, tagline or links here and the
 * header, footer, metadata and pricing page all follow. See docs/app/BRAND.md.
 */
/**
 * The domain and product name come from environment variables so moving to a new domain
 * is one setting. Set them before `npm run build`: static pages are rendered at build time.
 *   NEXT_PUBLIC_SITE_URL=https://yourbrand.com
 *   NEXT_PUBLIC_APP_NAME=YourBrand
 */
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://crawlvane.com").replace(/\/+$/, "");
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Crawlvane";

export const BRAND = {
  name: appName,
  tagline: "Get found on search engines and in AI.",
  description:
    `${appName} audits your website for search engines, answer engines and AI assistants like ChatGPT, Claude, Perplexity and Gemini, then hands you the fixes.`,
  url: siteUrl,
  /** Domain without protocol, for display ("yourbrand.com"). */
  host: siteUrl.replace(/^https?:\/\//, ""),
  contactUrl: "/contact",
  /** Who legally runs the site, for the privacy and terms pages. */
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || "",
  legalAddress: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || "",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "",
  themeColor: "#235789",
  /** Bump when page copy changes; used for dateModified and the sitemap. */
  updated: "2026-11-06",
} as const;

/** Link to the contact form with the topic filled in. */
export const contactLink = (topic: string) => `${BRAND.contactUrl}?topic=${encodeURIComponent(topic)}`;
