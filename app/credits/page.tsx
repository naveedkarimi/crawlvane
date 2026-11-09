import type { Metadata } from "next";
import DocPage from "@/components/DocPage";
import { BRAND } from "@/lib/brand";
import { posts } from "@/lib/blog";
import { pexelsUrl, POST_IMAGES } from "@/lib/blog/images";

export const metadata: Metadata = {
  title: "Credits",
  description: `The photos, open-source software, fonts, data services and research ${BRAND.name} is built on, with thanks.`,
  alternates: { canonical: "/credits" },
};

const UPDATED = "2026-11-08";

const body = `
${BRAND.name} is built on other people's generous work. Thank you to everyone below.

## Photos

Photos are from [Pexels](https://www.pexels.com/), used under the [Pexels licence](https://www.pexels.com/license/), which allows free use. We credit them here anyway.

| Photo | Where we use it |
|---|---|
| [Business woman using a laptop](https://www.pexels.com/photo/business-woman-using-a-gray-laptop-7857551/) | Home page: site owners |
| [Woman using a laptop](https://www.pexels.com/photo/woman-using-a-laptop-8871889/) | Home page: consultants |
| [A team looking at a laptop](https://www.pexels.com/photo/a-team-looking-at-a-laptop-and-collaborating-7643742/) | Home page: agencies |
| [Professional analyzing charts at a desk](https://www.pexels.com/photo/business-professional-analyzing-charts-at-desk-30535623/) | Home page: how it works |
${Object.entries(POST_IMAGES).map(([slug, img]) => `| [${img.alt}](${pexelsUrl(img.pexelsId)}) | Blog: ${posts.find((p) => p.slug === slug)?.title ?? slug} |`).join("\n")}
| [Professional analyzing charts at a desk](https://www.pexels.com/photo/business-professional-analyzing-charts-at-desk-30535623/) | Header menu |

The product screenshots on the home page are real results from ${BRAND.name}, run on a free Open Graph image maker.

## Open-source software

| Project | Licence | What it does here |
|---|---|---|
| [Next.js](https://nextjs.org/) | MIT | The web framework |
| [React](https://react.dev/) | MIT | The user interface |
| [Cheerio](https://cheerio.js.org/) | MIT | Reads the HTML of the pages we check |
| [Lucide](https://lucide.dev/) | ISC | Icons |
| [Nodemailer](https://nodemailer.com/) | MIT-0 | Sends monitoring emails |
| [undici](https://undici.nodejs.org/) | MIT | Fetches the pages we check |
| [Claude SEO](https://github.com/AgriciDaniel/claude-seo) | MIT | Ideas behind our schema checks and monitoring change detection |
| [TypeScript](https://www.typescriptlang.org/) | Apache 2.0 | The language the app is written in |

## Fonts

[Figtree](https://fonts.google.com/specimen/Figtree), [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Geist Mono](https://vercel.com/font), all under the SIL Open Font License. Fonts are served from our own site, so loading a page doesn't contact Google.

## Data, standards and services

- [Google PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/about) and the [Chrome UX Report](https://developer.chrome.com/docs/crux) for speed tests and real-visitor data
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) (Apache 2.0), which powers PageSpeed lab results
- [Anthropic's Claude](https://www.anthropic.com/) for the AI fix plan
- [Schema.org](https://schema.org/) vocabulary (CC BY-SA 3.0) for structured data
- The [llms.txt proposal](https://llmstxt.org/) for the llms.txt format
- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) for how robots.txt is read
- Crawler documentation from [OpenAI](https://platform.openai.com/docs/bots), [Anthropic](https://support.anthropic.com/), [Perplexity](https://docs.perplexity.ai/guides/bots), [Google](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers) and others, for the crawler lists

## Research we cite

Our guides link to their sources in the text. The main ones are studies and reports from [Ahrefs](https://ahrefs.com/blog/llmstxt-study/), [SE Ranking](https://seranking.com/blog/ai-traffic-research-study/), [BrightEdge](https://www.brightedge.com/news/press-releases/brightedge-data-chatgpt-referral-traffic-doubles-in-2026), [Search Engine Journal](https://www.searchenginejournal.com/ai-overviews-cut-organic-clicks-38-field-study-finds/573145/), [Cloudflare](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/), [DebugBear](https://www.debugbear.com/blog/webmcp) and [Microsoft](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/the-future-of-ai-optimize-your-site-for-agents---its-cool-to-be-a-tool/4434189).

## Trademarks

Google, Bing, ChatGPT, Claude, Perplexity, Gemini and other names are trademarks of their owners. We use the names only to describe what ${BRAND.name} checks. ${BRAND.name} isn't affiliated with or endorsed by any of them.

## Spot a missing credit?

If we've used your work and haven't credited it properly, please [tell us](${BRAND.contactUrl}) and we'll fix it.
`;

export default function Page() {
  return <DocPage title="Credits" dek={`The photos, software, fonts and research ${BRAND.name} is built on.`} updated={UPDATED} body={body} />;
}
