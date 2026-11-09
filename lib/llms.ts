import { BRAND } from "./brand";
import { posts } from "./blog";
import { TOOLS } from "./tools";

// Served at /llms.txt and /llms-full.txt (see app/llms.txt and app/llms-full.txt).
// Generated so links follow NEXT_PUBLIC_SITE_URL and the product name.

export const llmsTxt = () => `# ${BRAND.name}

> ${BRAND.name} is a free website audit for the AI-search era. It checks whether a site is ready for search engines (SEO), answer engines such as featured snippets and Google AI Overviews (AEO), and AI assistants such as ChatGPT, Claude, Perplexity and Gemini (GEO), then gives ready-to-paste fixes.

Key facts:
- About 50 checks per page, scored 0 to 100 for SEO, answer readiness and AI search readiness.
- Reads robots.txt for 19 search and AI crawlers and keeps AI search bots separate from AI training bots.
- Generates robots.txt, llms.txt, Organization and WebSite JSON-LD, a starter sitemap and head tags.
- Full-site crawl up to 300 pages, competitor comparison up to 3 sites, AI-written fix plan.
- Free during launch. Pro and Agency plans (monitoring, AI visibility tracking, white-label reports) are planned.
- Scores are readiness signals, not ranking or citation guarantees.

## Product
- [Free audit](${BRAND.url}/): Enter a URL for a page check or a full site report.
- [Pricing](${BRAND.url}/pricing): Free launch plan and planned Pro and Agency plans.
- [Full details for AI assistants](${BRAND.url}/llms-full.txt): Features, scoring method and FAQ in one file.

## Free tools
${TOOLS.map((t) => `- [${t.name}](${BRAND.url}/tools/${t.slug}): ${t.summary}`).join("\n")}

## Guides
${posts.map((p) => `- [${p.title}](${BRAND.url}/blog/${p.slug}): ${p.description}`).join("\n")}
`;

export const llmsFullTxt = () => `# ${BRAND.name}: full reference

> ${BRAND.name} (${BRAND.url}) is a free website audit for search engines, answer engines and AI assistants. It tells you what to change and gives you the code. Last updated 2026-11-05.

## What ${BRAND.name} checks

### SEO (search engines)
HTTPS, status code, redirect chains, noindex in meta tags and headers, canonical, robots.txt, Googlebot access, XML sitemap, sitemap listed in robots.txt, title, meta description, single H1, lang attribute, hreflang, content depth, heading order, image alt text, internal links, mobile viewport, charset, server response time, HTML size, compression, render-blocking scripts, image dimensions, HSTS, Open Graph, X card, favicon and structured data.

### AEO (answer engines)
Question-style headings, a short answer under each question, a summary first, FAQ or Q&A markup (reported, not scored), lists and tables, paragraph length, readability, content present without JavaScript, author or byline, and publish and update dates.

### GEO (AI assistants and AI search)
Access for AI search bots, access for user-triggered AI fetchers, training-bot choices (reported, not scored), Bing access (which feeds Copilot), /llms.txt, /llms-full.txt and a markdown version of the page (reported, not scored), an Organization or Person entity with sameAs links, a consistent brand name, outbound citations, concrete facts and numbers, About and Contact pages, and nosnippet or noai directives.

## Crawlers it reads in robots.txt
Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, Claude-User, ClaudeBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot, Applebot-Extended, DuckAssistBot, Meta-ExternalAgent, Amazonbot, CCBot, Bytespider and MistralAI-User (19 in total). Search bots and user-triggered fetchers are kept separate from training bots, so a site can block training and still be cited.

## How the score works
Each check is weighted 1 to 3 by impact. A pass earns the full weight, a warning half and a fail nothing. Info items are not scored. Overall score = SEO 45% + AI search 30% + answer readiness 25%. The score is capped when something blocks the page: noindex, Googlebot blocked, content that only appears with JavaScript, or AI search bots blocked.

## Features available now (free during launch)
1. Page check: about 50 checks on one URL in about 20 seconds.
2. AI crawler access map for 19 bots.
3. Core Web Vitals from Google PageSpeed (lab and real-user data).
4. Social and brand presence: linked profiles, schema sameAs and share previews.
5. Full-site crawl up to 300 pages with site-wide issues (duplicate titles, broken links, orphan pages, deep pages, thin pages, sitemap errors).
6. Competitor comparison for up to 3 sites.
7. Ready-to-paste fixes: robots.txt, llms.txt, Organization and WebSite JSON-LD, starter sitemap.xml and head tags.
8. AI fix plan: up to 10 prioritised actions with why, how and effort.
9. Shareable report links kept for 30 days, with PDF, Markdown and JSON downloads.

## Planned paid plans
- Pro: saved sites, weekly monitoring with email alerts, AI visibility test across ChatGPT, Claude, Perplexity and Gemini, niche research, social posts, JavaScript rendering.
- Agency: everything in Pro for more sites, white-label reports, an embeddable audit widget, team seats, bulk audits and API access.
- Done for you: fixed-price implementation of the fixes in a report.

## FAQ

### What is the difference between SEO, AEO and GEO?
SEO helps search engines crawl, understand and index your pages. AEO shapes clear, direct answers that featured snippets, voice assistants and AI Overviews can lift. GEO makes your expertise and brand easier for ChatGPT, Claude, Perplexity and Gemini to read, trust and cite. None of them guarantees a ranking or a citation.

### Should I block GPTBot or ClaudeBot?
That is a business decision. Training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) are separate from AI search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot). You can block training and still allow the search bots that cite and link to you.

### Does llms.txt improve rankings?
Google says Google Search doesn't use llms.txt and that having one neither helps nor harms your visibility there. It can still give other AI tools a clean map of your key pages, so ${BRAND.name} reports it without scoring it.

### Is ${BRAND.name} free?
Yes. Every live feature is free during launch. Quick page checks will stay free when paid plans arrive.

## Limits
- Sites behind Cloudflare or other bot protection may block the crawler; the report says so.
- AI visibility results come from each provider's API and can differ from what users see in the apps.
- Scores are readiness signals, not ranking or citation guarantees.
`;
