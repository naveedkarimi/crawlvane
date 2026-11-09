# SEO + AI Search Audit: product guide

**Live at:** https://crawlvane.com (self-hosted on cPanel)
**Status:** Launch. Every feature is **free**, and paid plans will come later.

---

## 1. What the app is

A website audit tool for the AI-search era. It checks whether a site is ready for:

- **SEO (search engines):** whether Google and Bing can find, crawl, index and rank it.
- **AEO (answer engines):** whether featured snippets, voice assistants and AI Overviews can lift direct answers from it.
- **GEO / LLM (generative engines):** whether ChatGPT, Claude, Perplexity and Gemini can read, understand, trust and cite it.

It then tells users exactly what to fix, with copy-paste code and an AI-written plan.

**Positioning:** most AI visibility tools only *track* numbers. This app tells people **what to change** and hands them the fix.

---

## 2. Feature list

### ✅ Live now (all free)

| # | Feature | What it does | Planned plan |
|---|---|---|---|
| 1 | **Quick page check** | Runs about 50 SEO, AEO and GEO checks on one URL, with scores from 0 to 100 and a fix for every issue | Free forever |
| 2 | **AI crawler access map** | Reads robots.txt for 19 crawlers (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, Claude-User, ClaudeBot, PerplexityBot, Google-Extended, CCBot…). It separates search bots from training bots | Free forever |
| 3 | **Core Web Vitals** | Google PageSpeed lab data and real-user metrics (LCP, INP, CLS) | Free forever |
| 4 | **Social & brand presence** | Shows which social profiles the site links, whether schema `sameAs` lists them, and how shared links look (Open Graph and X card preview) | Free forever |
| 5 | **Full-site crawl** | Crawls up to 300 pages from links and the sitemap, and groups issues across the site | Pro |
| 6 | **Site-wide issue detection** | Finds duplicate titles and descriptions, broken and redirecting internal links, orphan pages, pages buried 4+ clicks deep, thin pages, noindexed pages, sitemap errors, slow pages, and pages blocked by bot protection | Pro |
| 7 | **Competitor comparison** | Audits up to 3 competitors side by side and lists the checks they pass that you fail | Pro |
| 8 | **Ready-to-paste fixes** | Generates a robots.txt (keeps your rules, unblocks AI search bots), an llms.txt built from crawled pages, Organization + WebSite JSON-LD, a starter sitemap.xml and homepage `<head>` tags | Pro |
| 9 | **AI fix plan** | Claude turns all findings into a prioritised plan (up to 10 actions), each with why, how and effort | Pro |
| 10 | **Shareable reports** | Each report gets its own link, kept for 30 days, and downloads as PDF, Markdown or JSON | Pro |

### 🕒 Built, shown as "Coming soon"

These are fully coded and tested. Each one switches on with one setting (see section 6).

| # | Feature | What it does | Needs | Planned plan |
|---|---|---|---|---|
| 11 | **AI visibility test** | Asks ChatGPT, Claude, Perplexity and Gemini real buyer questions, either auto-generated or typed in. Records whether you're mentioned or cited, which sources get cited, and your share of voice against competitors | API key for each engine | Pro |
| 12 | **Deep niche research** | Claude researches the web for the questions your audience asks, the sources AI assistants trust, your content gaps, and a 6–10 piece content plan | Anthropic key | Pro |
| 13 | **AI social media posts** | Writes ready-to-post LinkedIn, X, Facebook, Instagram and Reddit posts for a page | Anthropic key | Pro |
| 14 | **Weekly monitoring & email alerts** | Re-audits daily, weekly or monthly and emails you when the score drops or new issues appear. Emails include an unsubscribe link | Cron job + SMTP | Pro |
| 15 | **JavaScript rendering** | Renders React, Vue and other single-page-app sites in a real browser before auditing | Browserless URL | Pro |
| 16 | **White-label PDF reports** | Puts an agency name, logo and brand colour on reports | none | Agency |
| 17 | **Accounts & saved history** | Placeholder for sign-in, report history and billing | Not built yet | Free account |

### 🛠 Not built yet (roadmap)

- Accounts (sign-up and login) and a report history dashboard
- Stripe payments that switch the Pro and Agency plans on (the code already has a `planAllows()` hook)
- A database (MySQL on cPanel) to replace the JSON file storage
- An AI visibility trend chart (re-run the same questions every week)
- Google Search Console and GA4 connection: real clicks and impressions, plus AI referral traffic
- Bulk audits (CSV of URLs) and an API for agencies
- Multi-language checks (hreflang clusters) and a local SEO mode (Google Business Profile, NAP consistency)
- Done-for-you service: "we implement the fixes", sold as a fixed-price add-on

---

## 3. What the audit checks (49 checks)

**SEO (search engines):** HTTPS · status code · redirect chains · noindex (meta and header) · canonical · robots.txt · Googlebot access · XML sitemap · sitemap listed in robots.txt · title · meta description · single H1 · `lang` attribute · hreflang · content depth · heading order · image alt text · internal links · mobile viewport · charset · server response time · HTML size · compression · render-blocking scripts · image dimensions (layout shift) · HSTS · Open Graph · X card · favicon · structured data

**AEO (answer engines):** question-style headings · a short answer under each question · summary first · FAQ, Q&A or HowTo markup · lists and tables · paragraph length · readability · content present without JavaScript · author or byline · publish and update date

**GEO / LLM (AI search):** access for AI search bots · access for user-triggered AI fetchers · training-bot choices (info only) · Bing access (Copilot) · `/llms.txt` · `/llms-full.txt` · markdown version of the page · Organization or Person entity with `sameAs` · consistent brand name · outbound citations · concrete facts and numbers · About and Contact pages · `nosnippet` and `noai` directives

**Scoring:** each check has a weight from 1 to 3. A pass earns the full weight, a warning half, a fail zero, and info checks don't count. Overall = SEO 45% + GEO 30% + AEO 25%. Scores are capped when something blocks the page: noindex, Googlebot blocked, JavaScript-only content, or AI search bots blocked. The app presents scores as readiness signals and never as ranking or citation guarantees.

---

## 4. Pricing plan

**Now:** everything is free, with `PAYWALL_ENABLED=0`. The Pricing page says "Free during launch".

**Later (suggested starting points to test):**

| Plan | Price | Includes |
|---|---|---|
| **Free** | $0 | Quick checks, crawler map, Core Web Vitals, social check |
| **One-off full report** | ~$39 once | Full crawl, competitors, fixes, AI plan, PDF |
| **Pro** | ~$49/mo | 3 sites, everything in the full report, AI visibility test, research, social posts, monitoring |
| **Agency** | ~$149/mo | 10+ sites, white-label, JavaScript rendering, team access, priority support |
| **Done-for-you** | Quote | You implement the fixes |

**Market reference (2026 published prices):** AI visibility trackers start around **$29/mo** (Otterly Lite). Mid tiers run about **$95–$499/mo** (Peec AI, Otterly Standard and Premium, Profound). Classic SEO suites such as Semrush start around **$139/mo**. These tools mostly monitor rather than give fixes, which leaves room for a cheaper, fix-focused product.

Sources: [Ryze AI price comparison](https://www.get-ryze.ai/blog/ai-visibility-tools-pricing-compared-2026) · [UD: what AI visibility tools cost](https://www.ud.hk/en/insight/article/ai-visibility-tool-pricing-2026-09-03) · [Semrush pricing 2026](https://ai-price-tracker.pages.dev/blog/semrush-pricing-guide-2026)

**Running costs:** hosting is your existing cPanel plan. The rest is pay-per-use AI API calls: one Claude call per fix plan, a handful of web searches per research run, and the number of questions × engines for each AI visibility test. AI visibility and deep research cost the most per report, so price them into Pro. Check each provider's dashboard after your first few real runs to set accurate prices.

---

## 5. How it's built

- **Stack:** Next.js 16 (React 19, TypeScript) with Node API routes and Cheerio for HTML parsing. It uses no database, storing reports and monitors as JSON files in `data/`.
- **Hosting:** cPanel "Setup Node.js App" (Passenger) runs a standalone build from the startup file `app.js`. Full steps are in `DEPLOY-CPANEL.md`.
- **Background jobs:** full reports run in the background, and the report page checks for progress every 2 seconds. A cPanel cron job hits `/api/cron` hourly to run monitoring and delete reports older than 30 days.
- **AI providers:** Anthropic Claude for the fix plan, research, social posts and question generation; OpenAI, Perplexity and Gemini for the visibility test. Model names are settings, so they can be changed without code.
- **Security:**
  - Blocks requests to private and internal networks. Every redirect hop is checked, only ports 80 and 443 are allowed, and cloud metadata addresses are blocked.
  - Responses are capped at 3 MB and requests time out.
  - Per-IP rate limits apply.
  - Hidden features are checked on the server, not just hidden in the browser.
  - Report pages are set to noindex, and the `data/` folder is protected with `.htaccess`.
- **Tests:**
  - `npm test` runs the robots.txt parser, the private-network blocking, the good- and bad-page scoring, and the AI response parsing for all 4 engines against simulated responses.
  - `npm run smoke -- https://site.com 10` runs a real crawl.

### Key files

```
app/page.tsx               Home: Quick check / Full report tabs, feature grid, FAQ
app/report/[id]/           Report page (Overview, Issues, Pages, Competitors, Fixes, AI plan, Social, AI visibility, Research)
app/pricing/               Pricing page (free during launch)
app/api/audit              Quick check
app/api/reports            Start a full report, then poll /api/reports/[id]
app/api/advice             AI fix plan for a single page
app/api/pagespeed          Core Web Vitals
app/api/monitors           Monitoring sign-up and unsubscribe link
app/api/cron               Hourly job: monitors + cleanup
app/api/config             Feature switches for the UI
lib/analyze.ts             All 49 checks and scoring
lib/crawl.ts               Site crawler and site-wide issues
lib/competitors.ts         Competitor audits and gap finder
lib/fixes.ts               robots.txt / llms.txt / schema / sitemap generators
lib/social.ts              Social presence check and AI post writer
lib/ai/*.ts                Claude helper, fix plan, AI visibility, research
lib/monitor.ts, mail.ts    Monitoring and email alerts
lib/config.ts              Feature switches, plans, limits  ← start here
```

---

## 6. Switching features on and off

All switches go in `.env` (or cPanel's environment variables). Restart the app after changing them.

- **Preview hidden features privately:** visit `https://crawlvane.com/?admin=YOUR_ADMIN_KEY`. Everything unlocks for you only, and the feature grid shows what each feature still needs. Leave preview with `?admin=off`.
- **Make a feature public:** for example `FEATURE_AI_VISIBILITY=1`.
- **Hide a live feature:** for example `FEATURE_COMPETITORS=0`.
- **Paywall:** keep `PAYWALL_ENABLED=0` until accounts and Stripe exist.

Suggested launch order:

1. **AI social posts:** only needs the Anthropic key.
2. **Deep research:** only needs the Anthropic key.
3. **AI visibility test:** start with Claude and Perplexity, then add OpenAI and Gemini.
4. **Monitoring:** set up SMTP and the cron job.
5. **White-label, then JavaScript rendering.**

---

## 7. Social media marketing plan for the app itself

**Goal:** first 500 users and the first 20 paying customers once plans launch. The free tool doubles as lead generation.

### Channels and what to post

| Channel | Why | What to post |
|---|---|---|
| **LinkedIn** (main) | Business owners, marketers and agencies | 3 posts a week: before/after audits of well-known sites (with permission, or public sites only), short "AI search tip" posts, and screenshots of the AI crawler map ("Is your site blocking ChatGPT?") |
| **X / Twitter** | SEO and dev community, and fast reach | Daily short tips, threads on GEO/AEO, audit screenshots, replies to SEO discussions |
| **Reddit** | r/SEO, r/bigseo, r/smallbusiness, r/Entrepreneur, r/webdev | Helpful answers first. Share the tool only when relevant and say you built it. Post one "I built a free AI-search audit tool, feedback welcome" launch post |
| **YouTube / Shorts** | AI answers often cite YouTube | 60-second "Auditing [famous site] for AI search" videos, and a 10-minute "How to get cited by ChatGPT" guide |
| **Product Hunt / Hacker News** | One-time launch spikes | Launch day with the free full report as the hook |
| **Facebook groups** | Small business and WordPress groups | Free audit offers ("drop your URL, I'll audit 10 sites") |

### First 30 days

1. **Week 1, set-up:** put the profile links in the app's footer and schema (the app checks for this). Create a demo report for your own site.
2. **Week 2, proof:** audit 10 well-known local or industry sites and turn the 3 most interesting findings into posts. Example: "4 of 10 top dental sites block AI search bots."
3. **Week 3, launch:** Product Hunt plus a "Show HN" post plus Reddit feedback posts. Offer free audits in comments and DMs.
4. **Week 4, collect:** add an email capture for "Get notified when Pro launches", and email it to everyone on the list when paid plans arrive.

### Content ideas

"Is ChatGPT allowed to read your website?" · "The 5-minute llms.txt" · "Why your competitor shows up in Perplexity and you don't" · "SEO vs AEO vs GEO in one picture" · "We audited 100 small-business sites: here's what AI can't see"

**Rules:** never post fake numbers. Use real audit data, get permission before naming private businesses negatively, and always disclose you built the tool.

Once you switch on the **AI social posts** feature (#13), you can use it to draft these posts too.

---

## 8. Known limits

- Runs on shared hosting, so very large crawls (300+ pages) can be slow or get stopped by the host. Lower `MAX_PAGES_HARD` if needed.
- Sites behind Cloudflare or other bot protection may block the crawler. The report says so clearly.
- AI visibility results come from each provider's API with web search. They are close to, but not identical to, what users see in the ChatGPT, Claude, Perplexity and Gemini apps, and they vary between runs.
- llms.txt is an emerging convention, and no search engine has confirmed using it. The app flags it as optional.
- Rate limits are kept per server process. A shared store such as Redis or a database will be needed with accounts.
