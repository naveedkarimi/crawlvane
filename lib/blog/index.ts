import { aiPosts } from "./posts-ai";
import { contentPosts } from "./posts-content";
import { performancePosts } from "./posts-performance";
import type { Post } from "./types";

export type { Post } from "./types";
export { CTAS } from "./types";

/** All posts, newest first (ties keep the order below, which is the reading order we want). */
const ORDER = [
  "can-chatgpt-read-your-website",
  "ai-crawlers-which-to-allow",
  "seo-vs-aeo-vs-geo",
  "is-cloudflare-blocking-ai-search",
  "ai-overviews-cutting-clicks",
  "write-content-ai-assistants-quote",
  "why-your-site-is-slow-on-mobile",
  "does-llms-txt-matter",
  "structured-data-for-ai-search",
  "ai-referral-traffic-ga4",
  "is-your-website-ready-for-ai-agents",
];

const all = [...aiPosts, ...contentPosts, ...performancePosts];
export const posts: Post[] = [...all].sort(
  (a, b) => b.date.localeCompare(a.date) || ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug),
);

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);

/** Words per post, for "x min read". */
export const readMinutes = (p: Post) => Math.max(2, Math.round(p.body.split(/\s+/).length / 220));

/** Related posts: most shared tags, then newest. */
export function relatedPosts(p: Post, n = 3): Post[] {
  return posts
    .filter((x) => x.slug !== p.slug)
    .map((x) => ({ x, score: x.tags.filter((t) => p.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ x }) => x);
}
