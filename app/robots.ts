import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

// Allow every crawler, including AI search bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot).
// Report pages are kept out of search with a noindex tag, not here, so crawlers can read that tag.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${BRAND.url}/sitemap.xml`,
  };
}
