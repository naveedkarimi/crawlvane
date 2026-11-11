# SEO + AI Search Audit: product guide

**Live at:** https://crawlvane.com (landing site) and https://app.crawlvane.com (the app), self-hosted
**Status:** Launch. Accounts, the dashboard and payments are built; paid plans switch on with `PAYWALL_ENABLED=1`. Plans, limits and the growth plan are in [PLANS.md](PLANS.md).

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

Who gets each feature is in [PLANS.md](PLANS.md#what-each-level-gets).

### On the website (no account needed)

| Feature | What it does |
|---|---|
| **Page check** | About 50 SEO, AEO and GEO checks on one URL, with scores from 0 to 100 and how to fix each issue (the first 3 without an account when `SIGNUP_GATE=1`) |
| **AI crawler access map** | robots.txt read for 19 crawlers, separating search bots from training bots, plus a live test of what each bot actually gets |
| **What AI sees** | The page as people see it next to the text AI crawlers read |
| **Core Web Vitals** | Google PageSpeed lab data and real-user metrics |
| **Social & brand presence** | Linked profiles, schema `sameAs`, and how shared links look |
| **App Check** | App Store and Google Play listing score for any country |
| **Free tools** | robots.txt, llms.txt, schema, meta tags, link preview and more, each with its own page |

### With a free account

| Feature | What it does |
|---|---|
| **Dashboard** | Overview of every saved site: score, change since last week, SEO/AEO/GEO bars, an 8-week chart, alerts, fixes by impact and AI crawler access across sites |
| **New check inside the app** | Page check, full site report and App Check, run without leaving the dashboard |
| **Full site report** | Crawls up to 300 pages (50 on Free), finds site-wide issues, ready-to-paste fixes, shareable link, PDF, Markdown and JSON |
| **AI fix plan** | Claude turns the findings into a prioritised plan |
| **Saved sites and history** | Every check adds a point to the site's score history |
| **Weekly checks and alerts** | Re-checks a site each week and emails when the score drops or new problems appear |
| **Tracked apps** | Rating and review changes and competitor updates for App Store and Google Play apps |
| **Account tools** | Google or email sign-in, change email, download all your data, delete the account |

### Pro

| Feature | What it does |
|---|---|
| **Competitor comparison** | Audits up to 3 competitors and lists what they do that you don't |
| **AI visibility tracking** | Asks ChatGPT, Claude, Perplexity and Gemini real buyer questions each week; mention rate per assistant over time, share of voice, and whether answers describe you positively, neutrally or negatively |
| **Deep niche research** | Web research on what your audience asks, sources AI trusts and content gaps |
| **AI social posts** | Ready-to-post LinkedIn, X, Facebook, Instagram and Reddit posts |
| **JavaScript rendering** | Renders single-page apps in a real browser before auditing |
| **App Check premium** | AI listing rewrites, review analysis and competitor comparison |
| **API** | Run audits from your own tools with a team API key |
| **Team** | Invite people as editors or viewers |

### Agency

| Feature | What it does |
|---|---|
| **Client sites** | Up to 25 sites, grouped by client name |
| **Report branding** | Your name, logo and colour on reports, without the Crawlvane header and footer |
| **Your own report domain** | Report links on reports.youragency.com, checked through DNS |
| **Monthly client reports** | A full report emailed to the client each month |
| **Audit widget** | A free audit on your own website that sends you the leads by email or webhook, with a lead list and CSV |

### Not built yet

See [PLANS.md](PLANS.md#ideas-not-built-yet) for the money ideas, and [TODO.md](TODO.md) for the rest: Search Console and GA4 connection, bulk CSV audits in the dashboard, multi-language and local SEO checks.

---

## 3. What the audit checks (49 checks)

**SEO (search engines):** HTTPS · status code · redirect chains · noindex (meta and header) · canonical · robots.txt · Googlebot access · XML sitemap · sitemap listed in robots.txt · title · meta description · single H1 · `lang` attribute · hreflang · content depth · heading order · image alt text · internal links · mobile viewport · charset · server response time · HTML size · compression · render-blocking scripts · image dimensions (layout shift) · HSTS · Open Graph · X card · favicon · structured data

**AEO (answer engines):** question-style headings · a short answer under each question · summary first · FAQ, Q&A or HowTo markup · lists and tables · paragraph length · readability · content present without JavaScript · author or byline · publish and update date

**GEO / LLM (AI search):** access for AI search bots · access for user-triggered AI fetchers · training-bot choices (info only) · Bing access (Copilot) · `/llms.txt` · `/llms-full.txt` · markdown version of the page · Organization or Person entity with `sameAs` · consistent brand name · outbound citations · concrete facts and numbers · About and Contact pages · `nosnippet` and `noai` directives

**Scoring:** each check has a weight from 1 to 3. A pass earns the full weight, a warning half, a fail zero, and info checks don't count. Overall = SEO 45% + GEO 30% + AEO 25%. Scores are capped when something blocks the page: noindex, Googlebot blocked, JavaScript-only content, or AI search bots blocked. The app presents scores as readiness signals and never as ranking or citation guarantees.

---

## 4. Pricing plan

Moved to [PLANS.md](PLANS.md): the four levels (no account, Free, Pro, Agency), limits, AI credits, how visitors become customers, billing with trials and yearly prices, suggested prices, settings and the order to switch things on.

---

## 5. How it's built

- **Stack:** Next.js 16 (React 19, TypeScript) with Node API routes and Cheerio for HTML parsing. All data is in Supabase (Postgres); there's no local file storage. Payments run through Stripe.
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
- **Paywall and sign-up gate:** see [PLANS.md](PLANS.md#order-to-switch-things-on) for what each does and the order to turn them on.

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
