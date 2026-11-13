import * as cheerio from "cheerio";
import { callClaude, parseJsonLoose } from "./ai/anthropic";
import { isProfileUrl } from "./fixes";

/** Social & brand presence: which profiles the site links, whether schema knows them, and share previews. */

const NETWORKS: { name: string; re: RegExp; aiNote?: string }[] = [
  { name: "LinkedIn", re: /linkedin\.com\/(company|in|school)\//i, aiNote: "Frequently cited for B2B, people and company facts" },
  { name: "X / Twitter", re: /(twitter|x)\.com\/(?!intent|share|home|search)[A-Za-z0-9_]+/i },
  { name: "Facebook", re: /facebook\.com\/(?!sharer|share|dialog)[^/?#]+/i },
  { name: "Instagram", re: /instagram\.com\/[^/?#]+/i },
  { name: "YouTube", re: /youtube\.com\/(@|c\/|channel\/|user\/)/i, aiNote: "YouTube videos and transcripts are often cited in AI answers" },
  { name: "TikTok", re: /tiktok\.com\/@/i },
  { name: "Pinterest", re: /pinterest\.[a-z.]+\/[^/?#]+/i },
  { name: "GitHub", re: /github\.com\/[^/?#]+/i },
  { name: "Reddit", re: /reddit\.com\/(r|user|u)\//i, aiNote: "Reddit threads are among the most-cited sources in AI answers" },
  { name: "Threads", re: /threads\.net\/@/i },
  { name: "Bluesky", re: /bsky\.app\/profile\//i },
  { name: "Medium", re: /medium\.com\/@?[^/?#]+/i },
  { name: "Wikipedia", re: /wikipedia\.org\/wiki\//i, aiNote: "Strong entity signal for LLMs" },
  { name: "Wikidata", re: /wikidata\.org\/wiki\/Q/i, aiNote: "Strong entity signal for LLMs" },
  { name: "Crunchbase", re: /crunchbase\.com\/(organization|person)\//i },
  { name: "Google Business", re: /(g\.page|maps\.app\.goo\.gl|google\.com\/maps|business\.google\.com)/i, aiNote: "Key for local search and AI local answers" },
  { name: "Yelp", re: /yelp\.[a-z.]+\/biz\//i },
  { name: "Trustpilot", re: /trustpilot\.com\/review\//i },
];

export interface SocialPresence {
  profiles: { network: string; url: string; inSchema: boolean; note?: string }[];
  missingImportant: string[];
  schemaOnly: string[];
  share: {
    title: string;
    description: string;
    image: string;
    siteName: string;
    twitterCard: string;
    twitterSite: string;
    url: string;
  };
  checks: { title: string; status: "pass" | "warn" | "fail"; detail: string; fix?: string }[];
  /** Every sameAs URL in the page's JSON-LD (added 2026-11-13; older reports don't have it). */
  sameAs?: string[];
}

export function analyzeSocial(html: string, pageUrl: string): SocialPresence {
  const $ = cheerio.load(html);
  const links = $("a[href]").map((_, a) => $(a).attr("href") ?? "").get().filter((h) => /^https?:\/\//i.test(h));

  // sameAs from JSON-LD
  const sameAs: string[] = [];
  $('script[type="application/ld+json" i]').each((_, el) => {
    try {
      const walk = (n: unknown): void => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          const o = n as Record<string, unknown>;
          if (o.sameAs) (Array.isArray(o.sameAs) ? o.sameAs : [o.sameAs]).forEach((s) => typeof s === "string" && sameAs.push(s));
          Object.values(o).forEach((v) => typeof v === "object" && walk(v));
        }
      };
      walk(JSON.parse($(el).contents().text()));
    } catch {
      /* ignore */
    }
  });

  const profiles: SocialPresence["profiles"] = [];
  for (const n of NETWORKS) {
    const ok = (l: string) => n.re.test(l) && (n.name === "Google Business" || n.name === "Yelp" || n.name === "Trustpilot" || isProfileUrl(l.split(/[?#]/)[0].replace(/\/$/, "")));
    const url = links.find(ok) ?? sameAs.find(ok);
    if (!url) continue;
    profiles.push({ network: n.name, url: url.split("?")[0], inSchema: sameAs.some((s) => n.re.test(s)), note: n.aiNote });
  }
  const schemaOnly = profiles.filter((p) => !links.some((l) => l.split("?")[0] === p.url)).map((p) => p.network);
  const have = new Set(profiles.map((p) => p.network));
  const missingImportant = ["LinkedIn", "YouTube", "X / Twitter", "Facebook", "Instagram"].filter((n) => !have.has(n));

  const meta = (sel: string) => $(sel).attr("content")?.trim() ?? "";
  const share = {
    title: meta('meta[property="og:title"]') || $("title").first().text().trim(),
    description: meta('meta[property="og:description"]') || meta('meta[name="description" i]'),
    image: (() => {
      const i = meta('meta[property="og:image"]') || meta('meta[name="twitter:image" i]');
      try {
        return i ? new URL(i, pageUrl).toString() : "";
      } catch {
        return "";
      }
    })(),
    siteName: meta('meta[property="og:site_name"]'),
    twitterCard: meta('meta[name="twitter:card" i]'),
    twitterSite: meta('meta[name="twitter:site" i]'),
    url: meta('meta[property="og:url"]') || pageUrl,
  };

  const checks: SocialPresence["checks"] = [];
  checks.push({
    title: "Social profiles linked from the site",
    status: profiles.length >= 3 ? "pass" : profiles.length ? "warn" : "fail",
    detail: profiles.length ? `${profiles.length} found: ${profiles.map((p) => p.network).join(", ")}.` : "No social profile links found on the page.",
    fix: "Link your official profiles in the header or footer so people and AI models can connect them to your site.",
  });
  const notInSchema = profiles.filter((p) => !p.inSchema);
  checks.push({
    title: "Profiles listed in schema sameAs",
    status: profiles.length === 0 ? "warn" : notInSchema.length === 0 ? "pass" : "warn",
    detail: profiles.length === 0 ? "No profiles to list." : notInSchema.length ? `Missing from sameAs: ${notInSchema.map((p) => p.network).join(", ")}.` : "All linked profiles are in Organization/Person sameAs.",
    fix: "Add every official profile URL to the sameAs array of your Organization or Person JSON-LD (see the Fixes tab).",
  });
  checks.push({
    title: "Share preview (Open Graph)",
    status: share.title && share.description && share.image ? "pass" : share.title ? "warn" : "fail",
    detail: `Title ${share.title ? "✓" : "✗"} · description ${share.description ? "✓" : "✗"} · image ${share.image ? "✓" : "✗"}`,
    fix: "Add og:title, og:description and a 1200×630 og:image so links look good when shared on LinkedIn, Facebook, WhatsApp and Slack.",
  });
  checks.push({
    title: "X / Twitter card",
    status: share.twitterCard ? "pass" : "warn",
    detail: share.twitterCard ? `${share.twitterCard}${share.twitterSite ? ` · ${share.twitterSite}` : ""}` : "No twitter:card tag.",
    fix: '<meta name="twitter:card" content="summary_large_image"> and <meta name="twitter:site" content="@yourhandle">',
  });
  if (missingImportant.length)
    checks.push({
      title: "Key networks not linked",
      status: "warn",
      detail: `Not found: ${missingImportant.join(", ")}.`,
      fix: "You don't need every network — but if you have these profiles, link them. LinkedIn and YouTube carry the most weight in AI answers for most businesses.",
    });

  return { profiles, missingImportant, schemaOnly, share, checks, sameAs: [...new Set(sameAs)].slice(0, 40) };
}

export interface SocialPosts {
  posts: { network: string; text: string; hashtags: string[]; tip: string }[];
}

/** ADVANCED (socialPosts): AI-written launch posts for a page. */
export async function writeSocialPosts(opts: { url: string; title: string; description: string; excerpt: string; brand: string }): Promise<SocialPosts> {
  const r = await callClaude({
    feature: "social",
    system: `You are a social media marketer. Write posts that promote one web page, in the brand's voice, for: LinkedIn (professional, 600-1200 chars, hook first line, short paragraphs), X (under 270 chars), Facebook (conversational, 1-3 short paragraphs), Instagram (caption with line breaks and a call to visit the link in bio), Reddit (helpful, non-promotional post title + body suitable for a relevant subreddit; disclose affiliation).
Use only facts from the page info given. No fake statistics. Include the URL where the network allows links.
Reply ONLY with JSON: {"posts":[{"network":string,"text":string,"hashtags":string[],"tip":string}]}`,
    user: `Brand: ${opts.brand}\nURL: ${opts.url}\nTitle: ${opts.title}\nDescription: ${opts.description}\nPage excerpt: ${opts.excerpt.slice(0, 2500)}`,
    maxTokens: 12000,
  });
  const j = parseJsonLoose<SocialPosts>(r.text);
  return { posts: Array.isArray(j.posts) ? j.posts : [] };
}
