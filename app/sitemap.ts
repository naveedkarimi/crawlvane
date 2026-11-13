import { CHECKED, COMPARISONS } from "@/lib/compare";
import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { posts } from "@/lib/blog";
import { TOOLS } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(BRAND.updated);
  return [
    { url: `${BRAND.url}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${BRAND.url}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BRAND.url}/features`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BRAND.url}/developers`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BRAND.url}/bulk`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BRAND.url}/tools`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    ...TOOLS.map((t) => ({ url: `${BRAND.url}/tools/${t.slug}`, lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${BRAND.url}/blog`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...["contact", "privacy", "terms", "accessibility", "credits"].map((p) => ({ url: `${BRAND.url}/${p}`, lastModified, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...COMPARISONS.map((c) => ({ url: `${BRAND.url}/compare/${c.slug}`, lastModified: new Date(CHECKED), changeFrequency: "monthly" as const, priority: 0.5 })),
    ...posts.map((p) => ({ url: `${BRAND.url}/blog/${p.slug}`, lastModified: new Date(p.updated ?? p.date), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
