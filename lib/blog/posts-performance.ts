import type { Post } from "./types";

export const performancePosts: Post[] = [
  {
    slug: "why-your-site-is-slow-on-mobile",
    title: "Why your site is slow on mobile (and how to fix it)",
    description: "Core Web Vitals in plain English: what LCP, INP and CLS mean, the thresholds Google uses, and the most common fixes for a slow mobile site.",
    date: "2026-11-06",
    tags: ["Performance", "Core Web Vitals", "Mobile"],
    cta: "speed",
    body: `
Most people visit on a phone, often on a patchy connection. A site that feels fine on your office Wi-Fi can take several seconds to show anything on a mid-range phone. Google measures this with three numbers called Core Web Vitals.

## The three numbers that matter

| Metric | What it measures | Good | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | When the main image or heading appears | 2.5 s or less | over 4 s |
| INP (Interaction to Next Paint) | How quickly the page responds to taps and clicks | 200 ms or less | over 500 ms |
| CLS (Cumulative Layout Shift) | How much things jump around while loading | 0.1 or less | over 0.25 |

Google judges each at the 75th percentile of real visits, so three out of four visitors need a good experience. INP replaced the older FID metric in March 2024.

## Lab tests vs real visitors

A speed test like PageSpeed runs a **lab test**: one simulated load on a slow phone. It's great for finding problems. **Field data** comes from real Chrome users over the last 28 days, and that's what Google uses. Small sites often have no field data yet, so the lab test is your guide.

[[cta]]

## The most common causes, and fixes

**Too much JavaScript.** The phone spends seconds running scripts before the page responds. Remove unused libraries and plugins, split code by page, and delay non-essential scripts.

**Images that are too big.** A 3 MB photo for a 400-pixel-wide phone screen is the classic problem. Compress images, use WebP or AVIF, serve sizes that fit the screen, and lazy-load images below the first screen.

**The hero image loads late.** If your main image is lazy-loaded or discovered late, LCP suffers. Don't lazy-load it, give it fetchpriority="high", and preload it if it's set in CSS.

**Render-blocking files.** Stylesheets and scripts in the head stop anything from showing. Defer scripts and inline the small amount of CSS needed for the first screen.

**Slow server.** If the first byte takes over a second, add page caching or a CDN, turn on Brotli or gzip compression, and consider better hosting.

**Layout shifts.** Images, ads and banners without reserved space push content around. Always set width and height on images and video.

**Third-party scripts.** Chat widgets, trackers and embeds add up. Remove what you don't need and load chat or video only when someone clicks.

## Where to start

Run a mobile speed test, take the top three fixes by estimated savings, and re-test after each change. Small, measured steps beat a big rebuild, and a faster site helps people, search rankings and conversions at the same time.
`,
  },
  {
    slug: "ai-referral-traffic-ga4",
    title: "How much traffic does ChatGPT send? How to track it in GA4",
    description: "AI assistants send about 0.3 to 1% of website traffic, mostly from ChatGPT. Here's what the 2026 data says and how to measure AI referrals in GA4.",
    date: "2026-11-06",
    tags: ["GEO", "Analytics"],
    cta: "audit",
    body: `
AI assistants are a new traffic source, and it's easy to either ignore them or overestimate them. Here's what the data says, and how to see your own numbers.

## What the 2026 data says

- **Share of traffic is small but growing.** SE Ranking's study of about 100,000 sites put AI platforms at 0.32% of all website traffic in 2026, up from 0.02% in 2024. Conductor measured 1.08%. ([SE Ranking](https://seranking.com/blog/ai-traffic-research-study/), [Mission Growth](https://missiongrowth.io/blog/ai-referral-traffic-statistics))
- **ChatGPT sends most of it.** Depending on the study, ChatGPT accounts for about 62% to 95% of AI referrals. Perplexity's share has been shrinking. ([BrightEdge](https://www.brightedge.com/news/press-releases/brightedge-data-chatgpt-referral-traffic-doubles-in-2026))
- **Visitors arrive informed.** People who click through from an assistant have often already compared options, so these visits can convert well. Check your own data before assuming.

## How to see AI traffic in GA4

The simplest way is a custom channel group so AI assistants appear as their own line in your reports.

1. In GA4, open **Admin**, then **Data display**, then **Channel groups**.
2. Create a new channel group (copy the default one so nothing else changes).
3. Add a channel named **AI assistants** with the condition *Session source* matches regex (or build your own list with the free [GA4 AI traffic regex builder](/tools/ga4-ai-traffic-regex)):

\`\`\`
chatgpt\\.com|chat\\.openai\\.com|perplexity\\.ai|claude\\.ai|gemini\\.google\\.com|copilot\\.microsoft\\.com|you\\.com
\`\`\`

4. Move it **above** the Referral channel so it's matched first, then save.
5. View it under **Reports**, then **Acquisition**, then **Traffic acquisition**, choosing your new channel group.

[[cta]]

## Why some AI traffic is invisible

Not every assistant passes a referrer. Some clicks from apps arrive as "direct" traffic, and AI answers that mention you without a link drive branded searches instead. Watch for rising branded search and direct traffic alongside your AI channel.

## How to get more of it

- Make sure AI search bots can reach your pages (robots.txt and firewall)
- Make your text readable without JavaScript
- Answer specific questions clearly, with facts and sources
- Use Organization schema with links to your real profiles

Then measure monthly. AI referrals are still a small slice of traffic, but they're growing fast and they reward the same clarity that helps every visitor.
`,
  },
  {
    slug: "is-your-website-ready-for-ai-agents",
    title: "Is your website ready for AI agents?",
    description: "AI agents now browse, compare and book on people's behalf. What agent-ready means, what WebMCP and NLWeb are, and a practical checklist for 2026.",
    date: "2026-11-06",
    tags: ["GEO", "AI agents", "Technical"],
    cta: "audit",
    body: `
AI assistants are starting to do more than answer: they open pages, compare options, fill in forms and complete tasks for people. That's a new kind of visitor, and it struggles with the same things that confuse screen readers and search engines.

## What agents need from a website

An agent can't guess from a pretty layout. It needs information and actions to be explicit:

- **Facts in text, not images.** Prices, opening hours, delivery areas and policies written on the page.
- **Clear structure.** Real headings, landmarks (header, nav, main, footer) and lists.
- **Labelled forms.** Every input has a label; every button says what it does ("Book a table", not an unlabeled icon).
- **Stable, simple flows.** No surprise pop-ups blocking the first click, and no steps that only work with a mouse hover.
- **Structured data.** Product, Offer, LocalBusiness and Organization schema describe things in a machine-readable way.

Much of this is plain accessibility. A site that works well with a keyboard and a screen reader is already halfway there.

## The new standards, briefly

**WebMCP** is a draft standard previewed by Google in February 2026 that lets a site expose actions (search products, check availability, book) as tools an agent can call directly, instead of guessing at buttons. ([DebugBear](https://www.debugbear.com/blog/webmcp))

**NLWeb**, from Microsoft, makes a site queryable in natural language using its Schema.org data, so an agent can ask your site a question and get a structured answer. ([Microsoft](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/the-future-of-ai-optimize-your-site-for-agents---its-cool-to-be-a-tool/4434189))

Both are early. Most businesses don't need them yet, but the basics they build on (clean structure, schema, explicit facts) are worth doing now.

[[cta]]

## A practical checklist

1. Can someone use your key task (book, buy, contact) with only a keyboard?
2. Are prices, hours and policies written as text on the page?
3. Does every form field have a label, and every button a clear name?
4. Is your main content in the HTML, not only rendered by JavaScript?
5. Do you have Organization and, where relevant, Product or LocalBusiness schema?
6. Are AI bots allowed through robots.txt and your firewall?

If you can answer yes to all six, your site is ready for most of today's agents, and you've made it better for people at the same time.
`,
  },
];
