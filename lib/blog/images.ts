/** Cover photo per blog post (Pexels licence, cropped to 1200 × 750 WebP in public/images/blog). */

export interface PostImage { src: string; alt: string; pexelsId: string }

const P = (slug: string, pexelsId: string, alt: string): [string, PostImage] => [slug, { src: `/images/blog/${slug}.webp`, alt, pexelsId }];

export const POST_IMAGES: Record<string, PostImage> = Object.fromEntries([
  P("seo-vs-aeo-vs-geo", "6155000", "Hands typing a search on a laptop next to a phone"),
  P("can-chatgpt-read-your-website", "14553730", "HTML and CSS code on a dark screen"),
  P("ai-crawlers-which-to-allow", "4508751", "A corridor of server racks in a data center"),
  P("is-cloudflare-blocking-ai-search", "37605911", "A technician at a computer in a server room"),
  P("does-llms-txt-matter", "5223887", "Close-up of colourful code on a monitor"),
  P("ai-overviews-cutting-clicks", "7698825", "A team looking at a laptop with concern"),
  P("write-content-ai-assistants-quote", "4468010", "A person writing notes beside a laptop"),
  P("structured-data-for-ai-search", "1921326", "Lines of colourful source code"),
  P("why-your-site-is-slow-on-mobile", "20041860", "A hand holding a smartphone"),
  P("ai-referral-traffic-ga4", "5466236", "Colleagues reviewing charts around a laptop"),
  P("is-your-website-ready-for-ai-agents", "5082579", "Hands using a phone in front of a desktop screen"),
]);

export const postImage = (slug: string) => POST_IMAGES[slug];
export const pexelsUrl = (id: string) => `https://www.pexels.com/photo/${id}/`;
