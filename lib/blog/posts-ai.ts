import type { Post } from "./types";

export const aiPosts: Post[] = [
  {
    slug: "seo-vs-aeo-vs-geo",
    title: "SEO vs AEO vs GEO: what each one means in 2026",
    description: "SEO gets you indexed, AEO gets you quoted in answers, GEO gets you cited by ChatGPT, Claude and Perplexity. What each needs, in plain English.",
    date: "2026-11-06",
    tags: ["GEO", "AEO", "SEO"],
    cta: "audit",
    body: `
People now find businesses in three different places: a search results page, a direct answer box, and a chat with an AI assistant. Each one reads your website a little differently, and each has picked up its own acronym.

## SEO: be found and indexed

Search engine optimization is still the foundation. If Google and Bing can't crawl, understand and index a page, nothing else on this list works, because AI assistants lean on search indexes too. Bing's index feeds Microsoft Copilot, and ChatGPT search uses its own crawler plus search partners.

The basics haven't changed much:

- Pages return a 200 status, aren't blocked by robots.txt and don't carry a noindex tag
- Each page has one clear title, a meta description and a single H1
- A canonical URL, an XML sitemap and sensible internal links
- Fast loading on mobile (Core Web Vitals)

## AEO: be the answer

Answer engine optimization is about the boxes that answer a question without a click: featured snippets, voice assistants and Google's AI Overviews. These systems lift short passages, so they reward pages that are easy to quote.

- Headings phrased as the questions people ask ("How much does a website audit cost?")
- A direct 40 to 60 word answer right under each question, then the detail
- Lists and tables for steps and comparisons
- Text that exists in the HTML, not only after JavaScript runs

## GEO: be cited by AI assistants

Generative engine optimization is the newest layer: making your expertise easy for ChatGPT, Claude, Perplexity and Gemini to read, trust and cite. Three things matter most.

1. **Access.** AI search bots such as OAI-SearchBot, Claude-SearchBot and PerplexityBot must be allowed in robots.txt and not blocked by your firewall or CDN.
2. **Clarity.** Organization or Person schema with sameAs links to your real profiles, a consistent brand name, About and Contact pages.
3. **Evidence.** Concrete facts, numbers and outbound citations to good sources. Assistants prefer passages they can stand behind.

[[cta]]

## How the three fit together

| | SEO | AEO | GEO |
|---|---|---|---|
| Goal | Rank and get clicks | Be the quoted answer | Be mentioned and cited |
| Reads | Whole page and links | Short passages | Passages plus brand signals |
| Biggest blocker | noindex, robots.txt, slow pages | Long intros, no question headings | Blocked AI bots, JavaScript-only text |

The overlap is large. A fast, crawlable page with clear headings, direct answers and honest sources does well in all three. The differences are in the details, which is why it helps to check each one separately.

## Where to start

Fix access first (crawling, indexing, AI bot access), then structure (headings, answers, schema), then evidence (facts, sources, author details). None of these guarantee a ranking or a citation, but each removes a reason to skip you.
`,
  },
  {
    slug: "can-chatgpt-read-your-website",
    title: "Can ChatGPT read your website? How to see what AI sees",
    description: "Many modern sites look great to people but give AI crawlers an empty page. Here's how to check yours in a minute, and how to fix it.",
    date: "2026-11-06",
    tags: ["GEO", "JavaScript", "Technical"],
    cta: "aiView",
    body: `
Open your website in a browser and it looks finished: headline, product, prices, reviews. Now ask a different question: what does an AI crawler get when it asks your server for the same page? For a surprising number of sites, the answer is almost nothing.

## Why AI crawlers can see less than people

Modern sites are often built with JavaScript frameworks that send a nearly empty HTML file and then build the page in the browser. Google renders JavaScript, usually with a delay. Most AI crawlers fetch the raw HTML and move on. If your text only appears after JavaScript runs, those crawlers can't read it, quote it or cite it.

> We audited a polished free Open Graph image maker. It has rich schema and allows every AI bot, yet its HTML contains 0 words of readable text. People see a full page; AI crawlers see a title and a description.

## Three ways to check your own site

1. **View source.** In your browser, right-click and choose "View page source" (not "Inspect"). Search for a sentence from your page. If it isn't there, it's added by JavaScript.
2. **Fetch it from the command line.** Run \`curl -s https://yoursite.com | grep "a sentence from your page"\`. No match means crawlers that don't run JavaScript won't see it.
3. **Use a side-by-side view.** Our free [AI visibility checker](/tools/ai-visibility-checker) shows your page as people see it next to the text AI crawlers read, with a word count and verdict.

[[cta]]

## How to fix it

- **Server-side rendering or static generation.** Frameworks such as Next.js, Nuxt, SvelteKit and Astro can send complete HTML. This is the best fix.
- **Prerendering.** If you can't change the framework, a prerender service or build step can save a complete HTML copy of each page for crawlers.
- **Put the essentials in the HTML.** At minimum: an H1, a short intro paragraph, key facts (prices, location, what you do) and your FAQ as real text.
- **Keep structured data, but don't rely on it.** Schema helps machines understand you, but it isn't a substitute for readable content.

## What "good" looks like

A healthy page shows the same story in the raw HTML as in the browser: a clear heading, a few hundred words of real text, and headings that outline the page. When we checked a well-built personal site, the raw HTML had 281 words and 10 headings, so AI crawlers get the full picture.

## Check after every redesign

JavaScript-only content often arrives with a new theme, page builder or framework upgrade. Re-check your key pages after any redesign, and especially your homepage, pricing and top landing pages.
`,
  },
  {
    slug: "ai-crawlers-which-to-allow",
    title: "GPTBot, ClaudeBot, PerplexityBot: which AI crawlers to allow in 2026",
    description: "AI search bots, assistant fetchers and training crawlers are different. How to allow the ones that cite you and block the ones that only train.",
    date: "2026-11-06",
    tags: ["GEO", "robots.txt", "AI crawlers"],
    cta: "robots",
    body: `
"Should I block GPTBot?" is one of the most common questions site owners ask about AI. The useful answer starts with a distinction most guides skip: AI companies run several different bots, and they do different jobs.

## Three kinds of AI bots

| Kind | What it does | Examples | Blocking it means |
|---|---|---|---|
| AI search | Builds the index an assistant searches | OAI-SearchBot, Claude-SearchBot, PerplexityBot | You can't be found or cited in that assistant's search answers |
| On-request fetchers | Visit a page because a user asked about it | ChatGPT-User, Claude-User, Perplexity-User | The assistant can't open your page when someone asks for it |
| Training | Collect content to train models | GPTBot, ClaudeBot, CCBot, Google-Extended (a control token) | Your content isn't used for future training |

Classic search bots still matter most: **Googlebot** for Google, and **Bingbot**, whose index also powers Microsoft Copilot.

## A sensible default

For most businesses that want to be recommended by AI assistants, the practical setup is: allow search engines, AI search bots and on-request fetchers; decide separately about training.

\`\`\`
# Allow AI search and assistant fetchers
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
Allow: /

# Optional: opt out of AI training
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Google-Extended
Disallow: /

User-agent: *
Allow: /
Sitemap: https://yoursite.com/sitemap.xml
\`\`\`

Blocking training is a business decision, not a ranking factor. Publishers with valuable archives often block it; small businesses that want reach often allow it.

## robots.txt is only half the story

robots.txt is a polite request. Your firewall, CDN or security plugin makes its own decisions, and it may block AI bots even when robots.txt allows them. Since July 2025, [Cloudflare blocks AI crawlers by default](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/) on newly added sites unless the owner opts in. Many site owners never notice.

[[cta]]

## How to check what's really happening

1. Read your robots.txt at yoursite.com/robots.txt and look for rules naming the bots above, or let our free [robots.txt checker](/tools/robots-txt-checker) do it for every bot at once.
2. Check your CDN or firewall's bot settings (in Cloudflare, the Security and Bots area).
3. Test live: request your page as each crawler and compare the response with a normal browser visit. That's exactly what our free [AI Bot Checker](/tools/ai-bot-checker) does.

## Keep a record

Write down which bots you allow and why, and re-check after changing hosting, CDN or security plugins. Those changes are the most common reason a site quietly disappears from AI answers.
`,
  },
  {
    slug: "is-cloudflare-blocking-ai-search",
    title: "Is Cloudflare blocking AI search bots on your site?",
    description: "Cloudflare blocks AI crawlers by default on new sites. If you want ChatGPT, Claude and Perplexity to cite you, here's how to check and what to change.",
    date: "2026-11-06",
    tags: ["GEO", "Cloudflare", "AI crawlers"],
    cta: "botTest",
    body: `
If your site sits behind Cloudflare, there's a real chance AI crawlers are being turned away, even if you never chose that.

## What changed

On July 1, 2025, Cloudflare announced that AI crawlers would be [blocked by default on newly onboarded domains](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/), with an option for publishers to charge crawlers through "Pay Per Crawl". Search engine crawlers such as Googlebot stay allowed. Reports in 2026 describe further changes for crawlers that both train models and fetch live answers on ad-supported pages, so check Cloudflare's own documentation for your plan.

For publishers who want to be paid, this is useful. For a small business that wants to be recommended by ChatGPT or Perplexity, a default block can quietly remove you from AI answers.

## The robots.txt trap

Many owners check robots.txt, see "Allow", and stop there. But a firewall rule is checked before robots.txt ever matters. The crawler gets a 403 error or a challenge page, so it never reads your content.

> Allowed in robots.txt + blocked by the firewall = invisible to that AI assistant.

[[cta]]

## How to check in a minute

1. Run our free [AI Bot Checker](/tools/ai-bot-checker) on your homepage. It requests the page as a browser and as each crawler, and flags any bot that's allowed in robots.txt but blocked on arrival.
2. In the Cloudflare dashboard, review your bot settings (the Security and Bots area, including any AI crawler setting) and any WAF custom rules that match user-agents.
3. Check security plugins too. WordPress firewall plugins sometimes block "unknown bots" on their own.

A note on accuracy: firewalls can verify that a request claiming to be GPTBot really comes from OpenAI's IP addresses. Our test sends each bot's user-agent from our own server, so a block can also mean "this firewall blocks fake GPTBots". That's a good setting; confirm the real behaviour in your Cloudflare analytics.

## What to allow

If you want AI visibility, allow the search and on-request bots: OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot and Perplexity-User. Training crawlers (GPTBot, ClaudeBot, CCBot) are a separate choice; blocking them doesn't stop you being cited in search answers.

## Re-check after changes

CDN migrations, new security rules and plugin updates are the usual causes of surprise blocks. Add a bot access check to your launch checklist.
`,
  },
];
