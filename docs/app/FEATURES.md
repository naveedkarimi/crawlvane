# Crawlvane: product master document

Last updated 2026-11-06. Everything we have decided and discussed about the product in one place: features, findings, the business case, launch plan, growth, brand and domain. Update this file whenever a decision changes.

Related files: `TODO.md` (step-by-step work plan with checkboxes), `BRAND.md` (look, voice and the Claude Design prompt), `APP-FEATURES.md` (setup and switches), `README.md` (developer notes).

**Contents**
1. What Crawlvane is
2. Feature inventory
3. "What AI sees" (built 2026-11-06)
4. Site speed test (PageSpeed)
5. Crawlvane audited by Crawlvane
6. Real example: Pixenlo
7. Features to add
8. How to make people come back
9. Getting users: marketing and social media
10. Business: can it make money?
11. Launch plan
12. Brand, domain and design decisions
13. Market research (2026-11-06)
14. Build queue: what we build next, in order
15. Decision log

---

## 1. What Crawlvane is

An all-in-one website audit for the AI-search era. It checks a site for **search engines (SEO)**, **answer engines (AEO)** and **AI assistants (GEO)**, then hands over the fixes instead of just a score.

**Positioning:** most AI visibility tools only track numbers. Crawlvane tells you what to change, gives you the code, and shows you what AI actually sees.

### How the features fit together

| Step | What the user does | Features |
|---|---|---|
| 1. Find | Enter a URL | Page check, full-site crawl, JavaScript rendering |
| 2. See | Understand the problem | **What AI sees**, SEO / AEO / GEO scores, AI crawler map, Core Web Vitals, social and brand check |
| 3. Compare | See where competitors win | Competitor comparison and gap list |
| 4. Fix | Apply changes | Ready-to-paste fixes, AI fix plan |
| 5. Prove | Share the result | Report link, PDF, Markdown, JSON, white-label PDF |
| 6. Keep it fixed | Watch for regressions | Monitoring and email alerts (built, off) |
| 7. Grow | Get mentioned by AI | AI visibility test, niche research, social posts (built, off) |

---

## 2. Feature inventory

### Live now (free during launch)

| # | Feature | What it does | Switch |
|---|---|---|---|
| 1 | **What AI sees** | The page as people see it next to the text AI crawlers read, with a verdict | `FEATURE_AI_VIEW` |
| 1b | **AI bot access test** | Requests the page as a browser and as 13 crawlers; flags firewall or CDN blocks that robots.txt doesn't show | `FEATURE_BOT_TEST` |
| 1c | **Free AI Bot Checker page** | Standalone tool at `/tools/ai-bot-checker` that can rank in search and bring in users | always on |
| 1e | **10 free tools** at `/tools` | AI visibility, AI bot, robots.txt, llms.txt, schema, speed, link preview, answer readiness, page to Markdown, agent readiness (see 7G) | always on |
| 1f | **Privacy, Terms and Credits pages** | `/privacy`, `/terms`, `/credits`, linked in the footer | always on |
| 1d | **Blog** | 11 guides on SEO, AEO, GEO, AI crawlers, llms.txt, AI Overviews, speed, analytics and AI agents, each with a call to action | always on |
| 2 | Page check | About 50 checks on one URL in about 20 seconds, scored 0 to 100 for SEO, AEO and GEO | always on |
| 3 | AI crawler access map | Reads robots.txt for 19 crawlers; AI search bots kept separate from training bots | always on |
| 4 | Speed test | Google PageSpeed on mobile or desktop: 4 Lighthouse scores, lab and real-user Core Web Vitals, top 5 fixes in plain English with savings and who should fix it (needs `PAGESPEED_API_KEY`) | `FEATURE_PAGESPEED` |
| 5 | Social and brand presence | Linked profiles, schema `sameAs`, Open Graph and X card preview | `FEATURE_SOCIAL` |
| 6 | Full-site crawl | Up to 300 pages from links and the sitemap | `FEATURE_SITE_CRAWL` |
| 7 | Site-wide issues | Duplicate titles and descriptions, broken and redirecting links, orphan, deep and thin pages, noindex, sitemap errors, slow pages, bot-protection blocks | with crawl |
| 8 | Competitor comparison | Up to 3 competitors side by side, plus the checks they pass that you fail | `FEATURE_COMPETITORS` |
| 9 | Ready-to-paste fixes | robots.txt, llms.txt, Organization and WebSite JSON-LD, starter sitemap.xml, head tags | `FEATURE_FIXES` |
| 10 | AI fix plan | Claude writes up to 10 prioritised actions with why, how and effort | `FEATURE_AI_PLAN` |
| 11 | Shareable reports | A link kept for 30 days, with PDF, Markdown and JSON downloads | with crawl |

### Built, switched off

| # | Feature | Needs | Plan |
|---|---|---|---|
| 12 | AI visibility test (ChatGPT, Claude, Perplexity, Gemini mentions, citations, share of voice) | API key per engine | Pro |
| 13 | Deep niche research (questions people ask, trusted sources, content gaps, content plan) | Anthropic key | Pro |
| 14 | AI social posts (LinkedIn, X, Facebook, Instagram, Reddit) | Anthropic key | Pro |
| 15 | Monitoring and email alerts | Cron job, SMTP, Privacy page | Pro |
| 16 | JavaScript rendering for single-page apps | Browserless URL | Pro |
| 17 | White-label PDF reports | none | Agency |
| 18 | Accounts and saved history | Not built yet | Free account |

### The checks (51)

- **SEO:** HTTPS, status code, redirect chains, noindex (meta and header), canonical, robots.txt, Googlebot access, XML sitemap, sitemap in robots.txt, title, meta description, single H1, `lang`, hreflang, content depth, heading order, image alt text, internal links, mobile viewport, charset, response time, HTML size, compression, render-blocking scripts, image dimensions, HSTS, Open Graph, X card, favicon, structured data, structured data quality (Google's required properties, template text, relative URLs, retired types), schema images that return 404.
- **AEO:** question-style headings, a short answer under each question, summary first, FAQ / Q&A markup (info only), lists and tables, paragraph length, readability, content without JavaScript, author or byline, publish and update dates.
- **GEO:** AI search bot access, user-triggered AI fetchers, training-bot choices (info only), Bing access, `/llms.txt`, `/llms-full.txt` and markdown version of the page (info only), Organization or Person entity with `sameAs`, consistent brand name, outbound citations, concrete facts and numbers, About and Contact pages, `nosnippet` / `noai` directives.

---

## 3. "What AI sees" (built 2026-11-06)

**Why:** our most unique, most shareable feature. It explains the biggest AI-search problem in one picture: many modern sites look great to people but hand AI crawlers an empty page, because the text only appears after JavaScript runs and most AI crawlers do not run JavaScript.

**What it shows** (in the page check, right under the scores, and in the full report Overview):
- A verdict: red under 50 words of HTML text, amber under 250, green above.
- **What people see:** a real Chrome screenshot of the page from Google PageSpeed (one click, about 30 seconds).
- **What AI crawlers read:** title, description, heading outline and the start of the text, all taken from the raw HTML, plus word count, heading count, schema types and how many AI search bots are allowed.

**How it works:** the audit now returns `outline` and `textExcerpt` in its facts (`lib/analyze.ts`); the PageSpeed route returns Chrome's `final-screenshot` (`app/api/pagespeed/route.ts`); the view is `components/AiView.tsx`. Text from separate elements is spaced so "Full Stack" + "Engineer" reads correctly.

**Tested:** Pixenlo shows red (0 words; title and description only, no headings, no text). A well-built personal site shows green (281 words, 10 headings).

**Next improvements:**
- [x] Add "What AI sees" to the Markdown and PDF report downloads (2026-11-13).
- [x] When JavaScript rendering is on, show both word counts (2026-11-13).
- [x] Shareable image of the view for social posts (2026-11-13): "Share image" on the report's What AI sees card, from `/api/reports/[id]/ai-image`.
- [x] Use the view on the free single-purpose tool page "Can ChatGPT read my site?" (the AI visibility checker uses it).

---

## 4. Site speed test (PageSpeed)

**Question asked:** should we add a site test like pagespeed.web.dev?

**Answer:** we already have one. "Run Core Web Vitals" uses the same Google PageSpeed API and shows performance, SEO, accessibility and best-practices scores, lab LCP, CLS, TBT, FCP and Speed Index, and real-user LCP, INP and CLS. Do not clone Google's free tool; improve ours where pagespeed.web.dev is better and keep our edge (plain-English fixes and everything in one report).

**Must do before launch:**
- [x] **Add `PAGESPEED_API_KEY`** (free from Google Cloud, about 25,000 requests a day). Without it, requests share Google's tiny anonymous quota; during testing it was already used up, which breaks Core Web Vitals and the "What people see" screenshot. The app now shows a clear message when this happens.

**Improvements:**
- [x] Mobile / desktop toggle (the API route already supports `strategy=desktop`; the screen only shows mobile).
- [x] Top 5 "opportunities" with estimated savings (for example "Reduce unused JavaScript, saves 1.2 s"), rewritten in plain English with who should fix it.
- [x] Core Web Vitals across the whole site: full reports test the top 5 pages (2026-11-13; needs `PAGESPEED_API_KEY`).
- [x] Track speed over time (2026-11-13): full reports save the top-page average; the dashboard charts it.

---

## 5. Crawlvane audited by Crawlvane

The app's own analyzer run against its pages (production build).

| Page | Before | After | SEO | AEO | GEO |
|---|---|---|---|---|---|
| Home `/` | 88 | **98** | 100 | 100 | 94 |
| Pricing `/pricing` | 88 | **97** | 98 | 100 | 94 |

### Fixed on the site

| Problem found | Fix | File |
|---|---|---|
| Canonical `/` in the root layout leaked to the 404 and report pages | Canonical set on the home page only | `app/layout.tsx`, `app/page.tsx` |
| No `og:image` | Generated 1200×630 share image | `app/opengraph-image.tsx` |
| Person entity had no `sameAs` | GitHub and LinkedIn, plus Organization and WebSite entities | `lib/brand.ts`, `app/layout.tsx` |
| No machine-readable date | `dateModified` and sitemap `lastModified` from `BRAND.updated` | several |
| First paragraph was a 7-word label | Section labels are `div`s | `app/page.tsx`, `app/pricing/page.tsx` |
| Pricing FAQ had no schema | FAQPage JSON-LD | `app/pricing/page.tsx` |
| Old name in `llms.txt`, no key facts | Rewritten, plus `llms-full.txt`, both generated from brand settings | `lib/llms.ts`, `app/llms.txt`, `app/llms-full.txt` |
| Domain hard-coded in many files | One setting: `NEXT_PUBLIC_SITE_URL` | `lib/brand.ts` |

### Fixed in the analyzer (improves every customer's audit, with tests)

| False result | Fix |
|---|---|
| FAQ accordions (`<details><summary><h3>Q</h3></summary><p>A</p>`) scored as "no answer" | Look past the heading's wrapper |
| Dates on FAQPage, AboutPage and other WebPage subtypes ignored | Read all WebPage subtypes |
| Next.js `nomodule` polyfill counted as render-blocking | Ignore `nomodule` scripts |
| Bot-protection message named the old crawler | Uses the brand-based crawler name |

### Still open on the site

- [ ] More concrete numbers in the copy (GEO "facts and numbers" warning).
- [ ] Longer pricing page (286 words): add a plan comparison table.
- [x] Privacy and Terms pages.
- [ ] Deploy, run the live audit, submit the sitemap in Search Console and Bing Webmaster Tools.

---

## 6. Real example: Pixenlo

Audit on 2026-11-05: overall **58**, SEO **86**, AEO **30**, GEO **40** (5 failed, 11 warnings, 27 passed).

- Rich schema (WebApplication, FAQPage, BreadcrumbList) and all AI bots allowed, yet **0 words of text in the raw HTML**. The "What AI sees" view makes this obvious: a polished page for people, nothing for AI crawlers.
- No H1, headings, paragraphs, lists or question-style headings.
- No `llms.txt`, About or Contact page; Person schema without `sameAs`; meta description 234 characters.

**Fix for Pixenlo:** prerender or server-render so the text ships in the HTML, add an H1, a short intro and a visible FAQ, add `llms.txt`, About and Contact pages and `sameAs`. Then re-run the audit: a strong before/after story for marketing.

Images on the home page: `app-product-shot.webp` (page check with What AI sees; the "people see" pane is a real Chrome screenshot taken with our test browser because the PageSpeed quota was used up) and `app-speed-test.webp` (real Lighthouse lab results). Re-capture after big UI changes.

---

## 7. Features to add

Ordered by value for effort. ★ marks gaps most competitors leave open.

### A. Quick wins that bring in users (weeks)

- [ ] **Email capture** before the PDF download and for "Get notified when Pro launches".
- [x] ★ **Free single-purpose tools** (built: see /tools), each a page that can rank: "Can ChatGPT read my site?" (uses What AI sees), AI crawler robots.txt checker, llms.txt generator, schema generator.
- [x] **Public score badge** sites can embed, linking back to their report.
- [x] **Sample reports gallery** of public sites (with permission).
- [x] **Before/after report** after a re-run.
- [x] **"Fix it for me" button** on each report that opens a quote request with the report attached.
- [ ] PageSpeed improvements from section 4.

### B. Core paid features (1 to 3 months)

- [x] **Accounts, projects and history** with score trend charts.
- [x] **Monitoring and alerts** (switch on, then add Slack).
- [x] ★ **AI visibility tracking over time**: same prompts weekly across ChatGPT, Claude, Perplexity, Gemini and AI Overviews; share of voice, sentiment, cited sources. All engines on every plan.
- [x] **Prompt gap list**: questions where competitors are mentioned and you are not, each with a content brief.
- [x] **"How AI describes you"**: what ChatGPT and Claude say about the business today, next to competitors.
- [x] **Search Console and GA4 connection**, including AI referral traffic.
- [x] **Issue tracker**: mark fixed, re-check one issue, assign, export to Jira, Trello, Linear or CSV.

### C. Fix automation, the strongest difference (3 to 6 months)

- [x] ★ **WordPress plugin** (in `wordpress/`) that applies schema, llms.txt, robots.txt and meta fixes in one click.
- [ ] **Shopify app** with the same fixes. Parked 2026-11-08: the Shopify App Store already has several AEO and llms.txt apps from about $14.50 to $19/mo.
- [x] **GitHub pull request** with generated files.
- [x] **Cloudflare Worker template** serving llms.txt, a markdown version of each page and fixed headers.
- [x] **Answer rewrites** (AI page helpers): AI writes a 40 to 60 word answer under each question heading.
- [x] **FAQ builder** (AI page helpers) from niche research, with FAQPage schema.

### D. Deeper analysis

- [x] **AI bot traffic** (log analyzer tool, and live counting from 2026-11-13) from server logs (or a small script or Worker). No longer rare: Peec includes it on every plan, and Ahrefs Bot Analytics is free in beta.
- [x] **Entity check** (2026-11-13): Wikidata lookup by official website, sameAs link check; profiles were already checked. Knowledge panel needs Google's paid API, not done.
- [x] **Internal link suggestions** from the crawl.
- [x] **Image SEO** and **accessibility basics**.
- [x] **Multi-language** (hreflang) and **local SEO** checks (no separate modes).

### E. Agency features (most proven paid market)

- [x] **Embeddable audit widget** with lead form and leads to email, webhook or Zapier.
- [x] **White-label reports** on the agency's domain and scheduled client reports.
- [x] **Bulk CSV audits**, **public API**, **team seats** (a separate client portal isn't built; agency report domains cover part of it).

### F. Trust and growth

- [ ] **"State of AI readiness" report** from anonymised audit data.
- [ ] **Industry benchmarks** inside each report.
- [ ] **Real testimonials and logos** once you have them. Never invent them.
- [x] **Comparison pages**: vs Otterly and vs Peec (2026-11-13). SEOptimer added the same day (prices copied by hand from its pricing page).

### G. Free tools roadmap (added 2026-11-06)

**Status (2026-11-06): 10 built, 5 next.** None of the 10 call an AI model; they are rule-based checks of the page's HTML, robots.txt and sitemap, plus Google PageSpeed for the speed test. That keeps them free to run.

| # | Tool | URL | Uses | Status |
|---|---|---|---|---|
| 1 | Can AI read my page? (AI visibility checker) | `/tools/ai-visibility-checker` | Our analyzer; optional PageSpeed screenshot | ✅ |
| 2 | AI Bot Checker | `/tools/ai-bot-checker` | Fetches as 13 crawlers | ✅ |
| 3 | AI robots.txt checker and generator | `/tools/robots-txt-checker` | robots.txt parser (RFC 9309); generator runs in the browser | ✅ |
| 4 | llms.txt generator and validator | `/tools/llms-txt-generator` | Reads homepage links and sitemap, up to 24 pages | ✅ |
| 5 | Schema markup generator | `/tools/schema-generator` | Runs in the browser | ✅ |
| 6 | Mobile page speed test | `/tools/page-speed-test` | Google PageSpeed API (needs `PAGESPEED_API_KEY`) | ✅ |
| 7 | Link preview checker | `/tools/link-preview-checker` | Page HTML + loads the og:image | ✅ |
| 8 | Answer readiness checker (AEO) | `/tools/answer-readiness-checker` | Same question/answer logic as the audit | ✅ |
| 9 | Page to Markdown | `/tools/page-to-markdown` | HTML to Markdown converter | ✅ |
| 10 | AI agent readiness checker | `/tools/ai-agent-readiness` | Landmarks, labels, button and link names, facts as text, schema | ✅ |
| 11 | Redirect, status and canonical checker | `/tools/redirect-checker` | Every hop with its status, temporary redirects, http→https, www vs non-www, canonical target | ✅ |
| 12 | Sitemap validator | `/tools/sitemap-validator` | Finds the sitemap, index children, 50k limit, other-host and http URLs, duplicates, lastmod, 10-URL spot check | ✅ |
| 13 | Security headers check | `/tools/security-headers-checker` | HSTS, CSP, nosniff, clickjacking, Referrer/Permissions-Policy, version leaks, X-Robots-Tag noindex | ✅ |
| 14 | GA4 AI traffic regex builder | `/tools/ga4-ai-traffic-regex` | Browser only: pick assistants, copy regex, test a referrer, GA4 steps | ✅ |
| 15 | "How does AI describe my business?" | | Claude API: the only one with a running cost; gate with email and a daily cap | ⏳ |

Endpoints: `/api/robots-txt`, `/api/llms-txt`, `/api/page-tools?tool=preview|answers|markdown|agent` (one fetched page serves all four for 10 minutes), plus the existing `/api/audit`, `/api/bot-test` and `/api/pagespeed`. Limits: `TOOL_PER_HOUR` (default 40) and `LLMS_TOOL_PER_HOUR` (default 10) per network.

Original plan:

Each tool is its own page under `/tools/`, does one job, ranks for its own search, and ends by pointing to the full audit. The best ones reuse code we already have and cost nothing to run. Search volumes have not been checked yet; confirm them in a keyword tool before building more than the first wave.

**Wave 1: reuse existing code, no API cost**

| Tool | What it does | Reuses | Effort |
|---|---|---|---|
| ✅ AI Bot Checker | Requests the page as 13 crawlers and flags firewall blocks | `lib/botTest.ts` | Done |
| **Can AI read my page?** | Side-by-side: what people see vs the text AI crawlers read, with word count | `AiView`, `lib/analyze.ts` | Small |
| **robots.txt AI tester + generator** | Paste or fetch robots.txt, show which AI bots are allowed; toggles to build a new one (search, fetchers, training) | robots parsing in `lib/botTest.ts` | Small |
| **llms.txt generator + validator** | Builds llms.txt from the sitemap and checks an existing one | full-report fix generator | Small |
| **Schema generator** | Forms for Organization, Person, LocalBusiness, Article, FAQPage, Product; copy JSON-LD; validate pasted JSON-LD | schema checks in `lib/analyze.ts` | Small to medium |
| **Link preview checker** | How a URL looks when shared on LinkedIn, X, Slack, WhatsApp and Google (title, description, OG image, pixel truncation) | analyzer facts; cross-link to pixenlo for making OG images | Small |
| **Answer-readiness checker (AEO)** | Lists question headings and the answer under each; flags answers too long, missing, or hidden in accordions | analyzer outline | Small |
| **Page to Markdown** | Shows the clean Markdown an LLM gets from a page; copy or download | `textExcerpt` / outline code | Small |
| **GA4 AI traffic regex builder** | Pick assistants, get the channel-group regex and steps | none (client-side) | Tiny |

**Wave 2: small server cost**

| Tool | What it does | Note |
|---|---|---|
| **Mobile speed test page** | Standalone version of the speed card | Needs `PAGESPEED_API_KEY`; keep the 15-minute cache |
| **Redirect, status and canonical checker** | Follows redirects, shows chain, status codes, canonical and noindex | Reuses `safeFetch` |
| **Sitemap validator** | Fetches the sitemap, checks format, status codes and noindex conflicts on a sample | Cap URLs per run |
| **Security headers check** | HTTPS, HSTS, CSP and other headers with plain-English fixes | Small |
| **Agent readiness checker** | Labelled forms, named buttons, landmarks, explicit prices and contact, WebMCP/NLWeb hints | Build queue item 6 |

**Wave 3: uses Claude, needs limits or email**

| Tool | What it does | Note |
|---|---|---|
| **"How does AI describe my business?"** | Asks Claude what it knows about a brand and compares it with the site | Strong hook; gate behind email, daily cap |
| **Topic coverage (fan-out) check** | Sub-questions a page should answer and which it misses | Build queue item 9 |
| **Meta title and description writer** | Suggests titles and descriptions within pixel limits | Cheap per call; rate-limit |

**How to get the most from them**
- One tool page per search intent, each with a short guide, FAQ, WebApplication schema and a link to the matching blog post.
- Add a `/tools` index page and list every tool in the footer, sitemap and llms.txt.
- Offer "email me this result" on each tool (feeds email capture, build queue item 7).
- Launch each tool separately on social media; each is a new post rather than one launch.

### Don't build

Keyword databases, backlink indexes or rank tracking. Semrush and Ahrefs own those, and the data is expensive.

---

## 8. How to make people come back

Social media brings first visits. People return when the product gives them a reason:

1. **Weekly email** with score changes and new issues (monitoring is built; needs SMTP, cron, Privacy page).
2. **AI visibility that changes every week**: "ChatGPT mentioned you 3 times, your competitor 7." A number people want to check again.
3. **Visible progress**: fix checklist, before/after scores, score history.
4. **Timely alerts**: "OpenAI added a new crawler; here is whether your site allows it."
5. **Public score badge** that also brings new visitors.

## What makes Crawlvane unique

- **What AI sees** (built): people view vs AI crawler view in one picture.
- **Fixes, not just scores**: copy-paste code today, one-click WordPress fixes next.
- **Search, answers and AI in one audit** with plain-English explanations.
- **How AI describes you** (planned): what assistants say about the business vs competitors.

---

## 9. Getting users: marketing and social media

**Yes, do social media**, but as a channel for real findings, not ads.

- **Real audit stories** like Pixenlo's ("beautiful site, invisible to AI") on LinkedIn and X about three times a week. Short screen recordings of the What AI sees view work well.
- **Free single-purpose tools** that rank in search (section 7A).
- **Launches**: Product Hunt, Show HN, helpful answers on Reddit (r/SEO, r/bigseo, r/smallbusiness, r/webdev). Always say you built it.
- **Agencies**: the embeddable widget turns their visitors into your users.
- **YouTube Shorts**: "What ChatGPT sees on [site]" in 60 seconds.

Rules: never post fake numbers; get permission before naming private businesses negatively; disclose that you built the tool. The full 30-day plan and channel table are in `APP-FEATURES.md`, section 7.

---

## 10. Business: can it make money?

**Honest view:** as a pure subscription tool the odds are modest; the market is crowded with funded players. A common rule of thumb for free-to-paid conversion in tools like this is 1 to 3% (not measured for Crawlvane). Illustration only: 1,000 free audits a month × 2% × $49 ≈ $1,000 a month.

**Better odds come from combining:**
1. **Leads for your services**: one $500 to $1,500 implementation job beats dozens of subscriptions.
2. **Agency widget**: the most proven paid model.
3. **Low-cost AI visibility tracking with fixes included** ($29 to $49 a month).
4. **Credits for AI visibility runs**, because each prompt × engine costs API money.

### Competitors (prices from third-party sites, 2026; confirm on vendor pages)

| Group | Examples | Price | Notes |
|---|---|---|---|
| AI visibility trackers | Otterly, Peec AI, Profound, Semrush AI Toolkit, Ahrefs Brand Radar | $29, $95, custom, $99 per domain (annual), from $50/mo | Mostly monitoring and recommendations |
| Free AI graders | HubSpot AI Search Grader, ConversionBox | Free; HubSpot AEO is $50/mo | Test real AI answers about a brand |
| Site audit tools | Seobility, SE Ranking, Sitechecker, SEOptimer | Seobility from €59.90/mo | Crawl, rankings, PDF reports; AI features being added |
| Audit plus applied fixes | Search Atlas (OTTO), Alli AI | $99/mo, about $249/mo | Sold as making changes on the site |
| Agency lead-gen widgets | SEOptimer, MySiteAuditor | MySiteAuditor $79/mo for the widget | MySiteAuditor's pricing page mentions no AI checks |

Prices for Otterly, Peec, Profound, Semrush, Ahrefs, HubSpot, Seobility, Search Atlas and MySiteAuditor were read from their own pages on 2026-11-08. Alli AI is from a third-party roundup. SEOptimer's page refused the request, so it is unverified. Confirm before quoting publicly.

**Gaps we can own:** agency widget with AI-readiness checks; showing the problem (What AI sees) and making it easy to fix; a WordPress plugin (less crowded than Shopify, but AEOmatic and Search Atlas exist); clear, low pricing. See the 2026-11-08 update in section 13.

### Suggested plans (when accounts and Stripe exist)

| Plan | Price | Includes |
|---|---|---|
| Free | $0 | Page check, What AI sees, crawler map, Core Web Vitals, social check |
| One-off full report | about $39 | Full crawl, competitors, fixes, AI plan, PDF |
| Pro | $29 to 49/mo | 3 sites, monitoring, AI visibility tracking, research, social posts |
| Agency | $49 to 79/mo and up | Widget, white-label, 10+ sites, JavaScript rendering, team seats |
| Done for you | Quote | We implement the fixes |

---

## 11. Launch plan

**Decision:** launch with the **free plan**, not everything. There is no paywall yet, so "everything" would only add API costs and moving parts.

| Feature | At launch | Why |
|---|---|---|
| Page check, What AI sees, crawler map, Core Web Vitals, social | On | Cheap, the main hook |
| Full crawl, competitors, fixes, AI fix plan | On, with limits | What people share and return for |
| Monitoring and alerts | On once the Privacy page, SMTP and cron exist | Near-zero cost, collects emails |
| AI visibility test, deep research | Off (admin preview only) | Real cost per run; the Pro hook |
| AI social posts | Off | Off-message for an audit tool |
| JavaScript rendering | Off | Needs paid Browserless |
| White-label | Off; give pilot agencies the admin key | Agency hook |

```
NEXT_PUBLIC_SITE_URL=https://yourbrand.com
NEXT_PUBLIC_APP_NAME=YourBrand
PAGESPEED_API_KEY=...        # required, see section 4
PAYWALL_ENABLED=0
FEATURE_MONITORING=1         # after Privacy page + SMTP + cron
FEATURE_AI_VISIBILITY=0
FEATURE_DEEP_RESEARCH=0
FEATURE_SOCIAL_POSTS=0
FEATURE_JS_RENDER=0
FEATURE_WHITE_LABEL=0
RATE_LIMIT_PER_HOUR=30
REPORTS_PER_HOUR=5
MAX_PAGES_DEFAULT=50
MAX_PAGES_HARD=150
MAX_CONCURRENT_JOBS=2
```

### Pre-launch checklist

- [ ] Choose and register the domain (section 12); set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_NAME`; rebuild.
- [x] `PAGESPEED_API_KEY` set.
- [ ] Monthly spend limit in the Anthropic console (the AI fix plan is public).
- [x] Privacy and Terms pages.
- [x] Email capture.
- [ ] Analytics (Plausible or GA4) and error tracking.
- [ ] Search Console and Bing Webmaster Tools; submit the sitemap.
- [ ] Run the live audit on the deployed site.

**When to turn on paid plans:** once accounts and Stripe exist and you have about 100 to 200 email signups.

---

## 12. Brand, domain and design decisions

### Name and domain

- **"Crawlvane" is a working name only.** Every domain checked is registered: findable.com, .ai, .app, .io, .so, getfindable.com, usefindable.com, tryfindable.com, findableai.com, findablehq.com (whois, 2026-11-05).
- About 30 alternatives were checked; most `.com` names are taken. **Looked unregistered:** `rankcite.ai`, `quotewise.ai`, `cite-ready.com` (avoid the hyphen). Whois is a hint; confirm at a registrar. `.ai` usually costs more per year than `.com`.
- **Switching domain is one setting:** `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_NAME` in `.env`, then rebuild (tested with a fake domain: no old references remain). If the old domain was ever public, 301-redirect it.

### Full-brand checklist

- [ ] Final name, domain, trademark search, social handles.
- [ ] Brand email (`hello@yourbrand.com`) and `MAIL_FROM`.
- [ ] Own About, Contact, Privacy and Terms pages.
- [ ] Search Console and Bing for the new domain.

### Design decisions

- **Palette:** "Rustic Autumn" (Linen `#F3E9DC`, Golden Chestnut `#C08552`, Espresso `#5E3023`), chosen 2026-11-05 after trying ink and lime, then "Sunset Beach". Deeper chestnut shades for buttons and small text keep WCAG AA contrast. Details in `BRAND.md`.
- **Type:** Figtree headings, DM Sans body, Geist Mono for code.
- **Layout inspiration:** the Seoinux theme (warm hero with wavy edge, pill buttons, numbered cards, photo cards, dark footer). Ideas only; no copied text, images, logos or fake stats.
- **CTA band kept plain** (white background, dark button), as requested.
- **Photos:** real product screenshots plus Pexels photos (Unsplash blocks automated downloads).

### Photo and image credits

| File | Source | Used in |
|---|---|---|
| `public/images/pexels-site-owner.jpg` | [Pexels photo 7857551](https://www.pexels.com/photo/business-woman-using-a-gray-laptop-7857551/) | Who it's for: site owners |
| `public/images/pexels-consultant.jpg` | [Pexels photo 8871889](https://www.pexels.com/photo/woman-using-a-laptop-8871889/) | Who it's for: consultants |
| `public/images/pexels-agency-team.jpg` | [Pexels photo 7643742](https://www.pexels.com/photo/a-team-looking-at-a-laptop-and-collaborating-7643742/) | Who it's for: agencies |
| `public/images/pexels-analytics-desk.jpg` | [Pexels photo 30535623](https://www.pexels.com/photo/business-professional-analyzing-charts-at-desk-30535623/) | How it works |
| `public/images/app-product-shot.webp` | Real page check of Pixenlo (scores and What AI sees; the "people see" pane is a real Chrome screenshot) | The report |
| `public/images/app-speed-test.webp` | Real Lighthouse 13.6 lab results for pixenlo (no synthetic field data shown) | Real example |

The Pexels licence allows free commercial use without attribution. Check each photo page once before launch.

---

## 13. Market research (2026-11-06)

Web research across competitors, AI search data, marketing and retention. Most sources are vendor blogs or roundups, so figures are directional; check the original study before quoting a number publicly.

### What competitors shipped recently

- **They are moving from tracking to fixing.** Peec AI added "Actions" and a content optimizer that suggest fixes; Otterly added a GEO audit (crawlability, content, query fan-out) and agent analytics; Ahrefs Brand Radar added entity extraction; Profound has Agent Analytics (AI crawler visits via Cloudflare, AWS, Vercel, WordPress integrations), prompt volumes and an "AI Marketer" agent. ([Goodie AI](https://higoodie.com/blog/best-geo-tools/), [Nick Lafferty](https://nicklafferty.com/blog/best-generative-engine-optimization-tools-2025/), [Foundry CRO](https://foundrycro.com/blog/best-geo-tools-2026/))
- **AI crawler analytics were reported as a paid-tier feature** (corrected in the 2026-11-08 update below). Otterly's starts at its $189 Standard plan; Peec and Ahrefs now offer it more cheaply.
- **What this means for us:** "we suggest fixes" is no longer unique on its own. Our edge must be **showing** the problem (What AI sees), **applying** fixes (plugins, PRs, Workers) and a **lower price** that includes crawler checks.

### What the market data says

- **AI Overviews cut clicks.** Pew: about 8% of users click an organic result when an AI Overview shows vs 15% without; a randomized field study found about 38% fewer organic clicks; Ahrefs: the top result gets about 58% fewer clicks; Seer: a gap of about 37% persists in 2026. AI Mode zero-click rate is often quoted at about 93% (source attribution varies). ([Search Engine Journal](https://www.searchenginejournal.com/ai-overviews-cut-organic-clicks-38-field-study-finds/573145/), [Relevant Audience](https://www.relevantaudience.com/seo/ai-overview-impact-on-organic-search-2026/), [SE Roundtable](https://www.seroundtable.com/google-ai-overviews-mode-ctr-42421.html))
- **AI referral traffic is small but growing and valuable.** About 0.3% to 1% of all website visits come from AI assistants (SE Ranking 0.32% in 2026, up from 0.02% in 2024; Conductor 1.08%). ChatGPT sends most of it (62% to 95% depending on the study); Perplexity's share is shrinking. ([SE Ranking](https://seranking.com/blog/ai-traffic-research-study/), [BrightEdge](https://www.brightedge.com/news/press-releases/brightedge-data-chatgpt-referral-traffic-doubles-in-2026), [Mission Growth](https://missiongrowth.io/blog/ai-referral-traffic-statistics))
- **Cloudflare blocks AI crawlers by default** on new domains since July 2025, with a pay-per-crawl option; reports describe a 2026 extension to "mixed-use" crawlers on ad-supported pages (not confirmed from primary sources). Many site owners don't know their CDN blocks AI bots even when robots.txt allows them. ([Cloudflare blog](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/), [Press Gazette](https://pressgazette.co.uk/platforms/cloudflare-says-bot-blocking-is-fueling-publisher-ai-deals/))
- **llms.txt is rarely read.** Ahrefs' log study of 137,000 domains: 97% of llms.txt files received no requests in May 2026; adoption grew about 8.8x in a year anyway. Keep treating it as optional and say so honestly. ([Ahrefs](https://ahrefs.com/blog/llmstxt-study/), [PPC Land](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/))
- **AI agents are the next layer.** Google previewed WebMCP (Feb 2026, W3C draft) so sites can expose actions to agents; Microsoft's NLWeb makes sites queryable in natural language. Basic agent readiness = semantic HTML, labelled forms, explicit prices and policies, structured data. ([DebugBear](https://www.debugbear.com/blog/webmcp), [Microsoft](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/the-future-of-ai-optimize-your-site-for-agents---its-cool-to-be-a-tool/4434189))
- **Query fan-out:** AI Mode splits one question into many sub-searches. One page that answers many related questions wins; Google warns that mass-producing pages for each variation is spam. ([Xponent21](https://xponent21.com/insights/query-fan-out-one-page-per-question/))

### Marketing and growth findings

- **Free tools work ("engineering as marketing").** HubSpot's Website Grader is the classic example: a free grader that captures leads and feeds the paid product. AI coding tools make building small tools cheap. ([Growth Method](https://growthmethod.com/engineering-as-marketing/), [Koombea](https://www.koombea.com/blog/engineering-marketing-work-saas/))
- **Launch channels:** Product Hunt, Show HN and Peerlist for launch day; Reddit posts that lead with the problem (and follow each subreddit's rules); LinkedIn often converts best for B2B. Soft-launch to 50 to 100 people first. ([Setproduct](https://www.setproduct.com/blog/where-to-launch-startup-2026), [Alt Hunt](https://althunt.io/blog/where-to-launch-saas-product))
- **Blog content keeps ranking and gets cited by AI** when it answers specific questions with original data. Our audit data (anonymised) is original data nobody else has.

### Retention findings

- **Activation beats tours:** get the user to their first meaningful result fast (we do: a score in about 20 seconds). Next step is a second meaningful result (fix applied, score went up). ([Business of Apps](https://www.businessofapps.com/insights/saas-user-retention-in-2026-how-to-build-for-long-term-engagement/))
- **Triggered messages beat broadcasts:** emails tied to an event ("your score dropped", "a new AI crawler is blocked") get far more engagement than newsletters (vendor figures of 3 to 4.5x). ([Userflow](https://www.userflow.com/blog/retention-kpis-how-to-measure-and-improve-customer-retention))
- **Benchmarks for later:** SMB SaaS monthly churn is often 4.5% to 6%; aim lower with monitoring. ([SaaS Buyer Guide](https://saasbuyerguide.com/saas-churn-retention-metrics-2026-benchmarks-every-founder-must-know/))

### Update 2026-11-08: competitor check

Pricing and feature lists were read from vendor pages. Buyer complaints and Shopify or WordPress app details come from listings and vendor blogs, so treat them as weaker evidence.

- **Testing real AI answers is now expected for free.** HubSpot's AI Search Grader and ConversionBox both do it. Ours is built but switched off, which makes it the biggest product gap.
- **Bot analytics is no longer enterprise-only.** Peec includes crawl insights on every plan from $95/mo; Ahrefs Bot Analytics is free in beta.
- **Applied fixes already exist.** Search Atlas sells OTTO from $99/mo, Alli AI pushes changes live, WordPress has AEOmatic, and Shopify has Strata AI, MagicGeo, Avada and Geoify. Build WordPress first and park Shopify.
- **MCP access is spreading.** Otterly, Peec, Semrush and Seobility list it. We have a public API but no MCP server.
- **AI readiness is entering general audits.** Semrush sells a site audit for AI readiness, and Seobility's audit flags pages blocked for AI bots.
- **The agency widget is our best opening.** MySiteAuditor charges $79/mo for its widget and its pricing page mentions no AI checks.
- **Google's Lighthouse has an experimental Agentic Browsing category** (Chrome 150+): WebMCP tools, agent-focused accessibility, CLS and an llms.txt presence check. Too early to prioritise.
- **Buyers appear tired of dashboards and "vanity scores"** and want ranked actions. Evidence is thin.

**Build order after launch:** accounts, database and Stripe; real AI answer test and the free "How does AI describe my business?" tool; monitoring and weekly prompt tracking; agency white-label and scheduled reports; WordPress plugin; Search Console, GA4, Bing and IndexNow.

### New features from the research

| Feature | Why | Effort |
|---|---|---|
| ★ **AI bot access test**: fetch the page as GPTBot, ClaudeBot, PerplexityBot and others and compare with a normal browser | Catches CDN and firewall blocks (Cloudflare default) that robots.txt checks miss | Small |
| ★ **Agent readiness checks**: labelled forms, named buttons, landmarks, explicit prices and contact details, WebMCP or NLWeb present | Next wave after AI search; nobody audits this yet | Small to medium |
| **Topic coverage (fan-out) check**: list the sub-questions a page should answer and which ones it misses | Matches how AI Mode builds answers | Medium (uses Claude) |
| **Blog with original data** ("we audited 1,000 sites") | Ranks, gets cited by AI, feeds social posts | Ongoing |
| **Free tool pages**: AI bot checker, What AI sees checker, llms.txt generator | Proven lead magnets | Small each |
| **Event emails**: score drop, new crawler blocked, fix verified | Highest-engagement retention lever | Medium |

---

## 14. Build queue: what we build next, in order

Status as of 2026-11-06. ✅ done · 🔨 building now · ⏳ next.

1. ✅ What AI sees
2. ✅ Speed test (mobile/desktop, top fixes, caching)
3. ✅ AI bot access test (results card + free tool page `/tools/ai-bot-checker`)
4. ✅ Blog with 11 guides (`/blog`), each pointing to the matching tool
5. ✅ Design: real product shot and speed test images, blog and free tools in navigation, mobile navigation row, "From the blog" on the home page
6. ✅ Agent readiness checks: free tool, and landmarks, form labels, button names, link text and share image now count in the main audit
7. ✅ Privacy, Terms, Credits and Contact pages · ✅ email capture (waitlist, "fix it for me", contact; `data/leads/`)
8. ✅ Report tools without accounts: before/after vs. the last run, mark as fixed, re-check one issue, CSV export, score badge (all browser-side except the badge)
9. ✅ Free tools 11–14 (redirects, sitemap, security headers, GA4 AI regex)
10. ⏳ Accounts, Stripe, monitoring emails (Phase 2 in `TODO.md`)
11. ⏳ Topic coverage (fan-out) check
12. ⏳ WordPress plugin
13. ✅ Agency widget, public API, bulk audit, AI bot log analyzer, hreflang and local business checks, AI usage tracking (2026-11-06)
14. ⏳ Free tool 15, "How does AI describe my business?" (needs the Anthropic key, an email gate and a daily cap)

---

## 15. Decision log

| Date | Decision |
|---|---|
| 2026-11-05 | Product reviewed; to-do list created (`TODO.md`). |
| 2026-11-05 | Phase 0 fixes done: pricing page, broken sections, one design system, committed on branch `seo-audit-findable`. |
| 2026-11-05 | Working name "Crawlvane"; logo is a lens with a spark. |
| 2026-11-05 | Palette changed twice; final: Rustic Autumn. CTA band kept plain. |
| 2026-11-05 | Real product screenshots and Pexels photos replace mock-ups and stock-only images. |
| 2026-11-05 | Self-audit: home 88 → 98, pricing 88 → 97; three analyzer false results fixed. |
| 2026-11-05 | Launch with the free plan; paid features stay off until accounts and Stripe exist. |
| 2026-11-05 | Separate domain and full brand planned; "Crawlvane" domains all taken; domain made a single setting. |
| 2026-11-06 | "What AI sees" built (page check and full report). |
| 2026-11-06 | Site speed test: keep the existing PageSpeed feature and improve it (API key, desktop toggle, opportunities) instead of cloning pagespeed.web.dev. |
| 2026-11-06 | Speed test finished: mobile/desktop, plain-English top fixes with savings and owner, whole-site field data fallback, 15-minute cache. |
| 2026-11-06 | Market research done (section 13). Next builds: AI bot access test, blog, realistic screenshots, then agent readiness. |
| 2026-11-06 | Built: AI bot access test and free AI Bot Checker page; blog with 11 guides; real product shots; mobile navigation. |
| 2026-11-06 | Built 9 more free tools (10 in total) with a `/tools` index grouped by theme, linked from navigation, footer, home page, sitemap, llms.txt and the matching blog posts. |
| 2026-11-08 | Competitor check (section 13): Shopify app parked, WordPress plugin stays, real AI answer test moved up. |
| 2026-11-08 | Results summary redesigned as one slim bar where each count opens its list; nothing repeated. |
| 2026-11-08 | Took the useful parts of claude-seo (MIT), rewritten in TypeScript: JSON-LD validation, monitoring change detection, connection-time SSRF guard. Left out its paid-API wrappers and third-party statistics. |
| 2026-11-08 | llms.txt, llms-full.txt, Markdown versions and FAQ/HowTo markup are reported but no longer scored. Google's AI optimization guide says Search doesn't use these files, and its changelog says FAQ rich results stopped on 2026-05-07. |
| 2026-11-06 | No AI company logos on the home page: their brand rules restrict logo use without permission. Names are shown with generic icons, plus a "not affiliated" line in the footer, Terms and Credits. |
| 2026-11-06 | Privacy, Terms and Credits pages added. They describe what the code actually does (no cookies or analytics, reports deleted after 30 days). Have a lawyer review them before paid plans; Terms has no governing-law clause yet. |
| 2026-11-06 | Footer redesigned: call-to-action card on every page (replaces the home page CTA band), tool links, social icons, legal links, large wordmark. |
| 2026-11-06 | Header and motion inspired by a reference template (ideas only, no code or assets copied): floating header with mega menus, scroll fade-ins, back-to-top, blog photo cards. |
| 2026-11-06 | Palette kept brown but refined: white and light cream, espresso text and buttons, chestnut as a small accent. Section review: 4-column features grid, sticky example screenshot, count-up scores, FAQ help card, calmer disabled button. |
| 2026-11-06 | Switched to the "Tropical Fusion" palette (Stormy Teal, Mint Leaf, Straw Gold). Home hero made dark teal with a faint grid; Features redesigned as a bento grid with two illustrated cards. Product screenshots on the home page still show the old brown UI and need re-capturing. |


## App Check: App Store and Google Play (added 2026-11-09)

SEO for apps: check any App Store or Google Play listing, in any country, and get a score out of 100 with what to fix. Page: `/tools/app-store-checker`. It's also the first link in the header (with a "New" badge), in the footer, and the first free tool on the tools page. A home page hero tab was tried and removed on 2026-11-09; `AppCheck` still supports `redirect` if it comes back.

**Data sources**

| Store | Source | Key | Notes |
|---|---|---|---|
| App Store | Apple's public lookup and search services | None | Full listing, ratings, languages, release notes. The subtitle is read from the public App Store page because the lookup doesn't include it |
| App Store reviews | Apple's customer reviews feed | None | 50 per page; we read 2 pages. Old feed, could be switched off |
| Google Play | SerpApi (`google_play_product`, `google_play`) | `SERPAPI_KEY` | Free plan: 250 searches a month. No full description, version or feature graphic in the data |

Google has no public listing API, and reading Play pages directly risks breaking its terms, so Play needs SerpApi.

**Free checks (about 15):** name length, subtitle (Apple), opening of the description, screenshots, iPad screenshots, video, average rating, number of ratings, rating of the latest version (Apple), last update, release notes, languages (Apple), data safety (Google). Scores weight each check 1 to 3, like the website audit.

**Premium (`FEATURE_APP_PREMIUM`, needs `ANTHROPIC_API_KEY`):** AI listing rewrite (names, subtitle or short description, opening, keywords, screenshot captions), review analysis (complaints, praise, requests from up to 120 recent reviews, reviewer names left out), and comparison with up to 3 competitors in either store. Shown as "Coming soon" until switched on; preview with the admin key.

**Website app checks** (in the site audit, only when a page links to an app): iPhone Smart App Banner, iOS Universal Links file, Android App Links file, and app structured data.

**Not built yet:** weekly app monitoring with email alerts. It needs the monitoring feature (`FEATURE_MONITORING`) switched on first.

**Stored:** `app_checks` table (store, app, country, score, failed checks), deleted after 12 months.

---

## 16. Capability extensions review (2026-11-12)

A review of `docs/CRAWLVANE-CAPABILITY-EXTENSIONS.md` against the code. Built items are ticked in that file. Its rules still apply to everything below: new work is added alongside existing checks, never changes current scores, plans or limits, sits behind a feature flag until it's tested, and says where its data came from.

### Already built

| Area | What's there | Where |
|---|---|---|
| Crawl and site structure | Duplicate titles and descriptions, thin pages, pages more than 3 clicks deep, orphan pages, pages missing from the sitemap, sitemap entries that aren't indexable, broken links with their source pages, internal links that redirect, pages blocked by bot protection, slow pages | Full report → Issues (`lib/crawl.ts`) |
| Internal links | Suggested links between related pages, with anchor text, for poorly linked pages | Full report → Pages (`lib/linkSuggest.ts`) |
| Change detection | Before/after against the last check (new and fixed issues); monitoring alerts list page-by-page changes to title, description, canonical, H1, noindex, robots and schema | Page check, weekly checks (`lib/drift.ts`) |
| Technical tools | Sitemap validator (lastmod, size, other-host and duplicate URLs), redirect and canonical checker (http/https, www), security headers incl. X-Robots-Tag noindex, hreflang and local business checks in the audit | Free tools, audit checks |
| AEO | Answer readiness (question headings, answer length), topic coverage, answer rewrites, FAQ builder | Free tool, AI helpers |
| Content drafts | Title and description ideas, answer passages, FAQs; mark a fix as done and re-check that one issue | AI helpers, page check |
| GEO and AI visibility | Questions you choose, tracked weekly across assistants: mention, citation and cited URLs, competitor mentions, sentiment, history per assistant, share of voice, prompt gaps with content briefs | Dashboard → AI visibility |
| AI crawlers | Access map for 19 crawlers by purpose (search, user-triggered, training), live test as 14 bots, server-log analyzer | Audit, free tools |
| Search data | Search Console (clicks, impressions, CTR, position, top searches and pages) and GA4 visits from AI assistants, per saved site | Dashboard → Websites |
| Workflow | Assign fixes to teammates, export for Jira, Linear or CSV, Slack alerts, scheduled client reports, API keys, roles | Dashboard |

### Quick adds (a few hours to a day each, no new data provider)

**All 14 built on 2026-11-12** (tests in `scripts/test-growth.mts`). Q1 to Q6 and Q10 are the full report's new Diagnostics tab and Pages exports; Q7 and Q8 are in the dashboard's Search Console and GA4 panel; Q9 is in AI visibility; Q11 is Settings → Webhook; Q12 is the Fixes list; Q13 and Q14 are the Summary card at the top of a report. None of them changes a score, check, plan or limit.

These reuse data the app already collects. Each would ship behind a feature flag, outside the score.

| # | Quick add | Builds on | Plan |
|---|---|---|---|
| Q1 | **Crawl coverage summary:** discovered, crawled, failed, blocked and skipped URL counts with the reason for each, plus a CSV export | Crawl results already hold status, errors and blocks | Free (full report) |
| Q2 | **Page groups:** pages sharing a title, description or H1 shown as groups, plus exact-duplicate pages (same main text) | Page summaries; add a text hash per page | Free |
| Q3 | **Soft 404s:** pages that return 200 but look like error pages ("not found" title or H1, almost no text), labelled as likely | Page audits in the crawl | Free |
| Q4 | **URL consistency:** the same page reached with and without a trailing slash, or in different letter case | The crawled URL set | Free |
| Q5 | **Links to pages that shouldn't get them:** internal links pointing at noindex pages or at a different canonical | Link map, noindex and canonical per page | Free |
| Q6 | **Links in and out per page** in the Pages table, and CSV exports of pages and link suggestions | Link map | Free |
| Q7 | **Search Console opportunities:** pages with many impressions but a low click rate, and searches in positions 8 to 20; country and device split | The existing Google connection | Free account |
| Q8 | **GA4 landing pages:** top landing pages with sessions and engaged sessions, next to each page's audit issues | The existing Google connection | Free account |
| Q9 | **AI visibility detail:** which competitor domains get cited per question, and a "this isn't us" button to correct a wrong brand match | Visibility rows already store cited URLs | Pro |
| Q10 | **AI crawler access for key pages:** run the existing bot test on up to 5 chosen URLs, not only the home page | `runBotTest` | Free account |
| Q11 | **Webhooks:** a team webhook for alerts and finished reports, for Zapier and similar | Slack sending code | Pro |
| Q12 | **Status and notes on fixes:** open, in progress or done, with a short note, next to the assignee | `issue_assignments` | Free account |
| Q13 | **Compare two reports** of the same site: new and resolved site-wide issues and score change | Stored reports | Pro |
| Q14 | **Executive summary** at the top of a report: top 3 issues and what changed since the last report | Q13 | Free |

Suggested order: Q1, Q2, Q5, Q6 (report quality), then Q7, Q8 (connected data, high value now that Google is connected), then Q12, Q13, Q14, then the rest.

### Bigger pieces (days to weeks)

| Item | Why it's bigger |
|---|---|
| Near-duplicate content and topic clusters | Needs text similarity across every crawled page, and a page-group view |
| Raw HTML vs rendered DOM comparison | Needs JavaScript rendering (Browserless) for each compared page |
| Entity inventory and citation-readiness across the site | AI assessment per page, with evidence; credits and caps |
| Migration mode | Old and new URL sets, redirect mapping and before/after comparison |
| Content backlog with stages (draft, review, published, re-check) | New workflow screens and data |
| Activity log, report templates and annotations, client approvals | New agency screens and data |
| Bing Webmaster Tools | Its own API key and connection flow |
| Verified crawler visits from logs (reverse DNS) | Server-side log processing and verification |

### Needs a paid data provider (not planned until one is chosen)

Keyword volumes and difficulty, rank and SERP-feature tracking, backlinks and referring domains, external listing consistency for local SEO, and question datasets. The extensions file's rule applies: never invent these numbers.
