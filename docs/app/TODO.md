# Crawlvane (SEO + AI Search Audit): to-do list

**The order of work is in `ROADMAP.md`.** This file keeps the detail for each phase.

> **Status 2026-11-12:** accounts, Stripe, monitoring, teams, agency features, AI tracking and the growth features are built (see `ACCOUNTS-PLAN.md`). Unticked items below are setup you still have to do, or genuinely not built yet.

From the product review on 2026-11-05. Work top to bottom: each phase builds on the one before it.

Tick items as you go (`- [x]`).

---

## Phase 0: broken things (fix first)

- [ ] **Deploy the live site.** `crawlvane.com` does not respond (no DNS or connection). Needs your cPanel and DNS access: add the domain, then follow `DEPLOY-CPANEL.md`.
- [x] **Commit the app to git.** Committed on the `seo-audit-findable` branch; `data/` and `dist/` are now in `.gitignore` so saved reports and monitor emails stay out of git.
- [x] **Build the `/pricing` page.** `app/pricing/` is an empty folder, so the page 404s. Links to it:
  - [x] Header nav (`app/layout.tsx`)
  - [x] "Explore plans" in `components/FeatureGrid.tsx`
  - [x] "See launch and pilot plans" in `app/page.tsx`
- [x] **Style the "Start with a useful audit" section** (`.growth-section` in `app/page.tsx`). None of its `growth-*` classes exist in `globals.css`, so:
  - [x] "01 02 03" sit on their own lines instead of in cards
  - [x] The two links run together with no spacing
  - [x] It overlaps the "From URL to a smarter roadmap" section above it
- [x] **Make the FAQ heading readable.** "Frequently asked questions" is white text on a light grey background.
- [x] **Rewrite `app/globals.css` as one design system.** It is 90 KB and holds several redesigns stacked on top of each other:
  - [x] `.faq` is defined 6 times, `.hero-carousel` 3 times, `.tool-shell` and `.features` twice
  - [x] 4 colour schemes compete: blue `#275be8`, coral, purple `#302749`, navy `#202044`
  - [x] The dark-blue body gradient (`#1d2a5c`) clashes with the light theme
  - [x] The `.error` box uses dark-theme colours (`#3a1620`) on a light page
  - [x] Remove the leftover `.hero`, `.eyebrow` and `.lede` styles that nothing uses any more
- [x] **Silence the Next.js workspace-root warning.** Set `turbopack.root` in `next.config.mjs` (two lockfiles were detected).

---

## Phase 1: look like a real company (week 1)

### Brand

- [x] Choose a product name and a short tagline. Working name "Findable", set in `lib/brand.ts`; see `BRAND.md`
- [ ] Check the domain, social handles and trademark for the name before spending money on it
- [x] Make a logo and favicon (replace the plain "N" square)
- [x] Header: product name on the left; nav: Product, Pricing, Sample report, Resources; CTA "Run a free audit"
- [x] Update `metadata`, Open Graph, `siteName` and JSON-LD in `app/layout.tsx` to the product name
- [x] Create an Open Graph share image (1200×630)

### Design system

- [x] One font (Inter or Geist) loaded with `next/font`
- [x] One accent colour plus neutrals, and only success/warning/error colours on top
- [x] A spacing and radius scale written as CSS variables
- [x] Replace the glyph icons (⌕ ◎ ✦ ✳ ↗ ◉ ✧) in `FeatureGrid.tsx` with a real icon set (Lucide)
- [x] Consistent section labels (right now: 01, unnumbered, 02, 03)
- [x] Check contrast for every text/background pair (WCAG AA)
- [x] Accessibility (2026-11-06): axe-core WCAG 2.2 A/AA scan of every public page at 390 and 1280 px, 0 violations (fixed: logo name, underlined text links, heading order on tool pages, keyboard access to scrollable boxes, widget contrast and landmark, 24 px tap targets). Statement at `/accessibility`
- [ ] Manual accessibility review with VoiceOver and NVDA, and a keyboard-only pass of the report page
- [x] Responsive sweep (2026-11-06): no sideways scrolling on any page at 360, 390, 768 and 1280 px (fixed the GA4 guide's code block)
- [x] Check the layout at 390 px, 768 px and 1440 px (768 checked 2026-11-06: no horizontal overflow on home, pricing, contact, tools, blog, privacy)
- [x] Phone pass (2026-11-06): smaller header bar, full-screen menu with collapsible tools, one-row search, fewer pictures and shorter lists on the home page (about 25% shorter)

### Home page

- [x] **Put the URL box in the hero.** Today it sits below the fold, under the hero.
- [x] Replace the stock laptop photo and the 3-slide carousel (its dots barely do anything) with a real report screenshot or a short animated demo
- [x] Remove the team stock photo from "What to expect", or swap it for a product image
- [x] **Hide the roadmap cards.** Now shown only in admin preview; upcoming features are listed under Pro and Agency on `/pricing`.
- [x] Add a "See a sample report" link: "Open the full sample report" in the Real example section runs the live audit of Pixenlo
- [x] Add proof: audit counter (`data/stats/`, shown in the pricing preview once it passes 1,000) and before/after scores in every report
- [ ] Testimonials once you have them
- [x] New page order:
  - [x] Hero with URL box
  - [x] Results screenshot
  - [x] 3-step how it works
  - [x] SEO / AEO / GEO pillars
  - [x] Sample report
  - [x] Pricing preview
  - [x] FAQ
  - [x] Footer

### Footer and legal pages

- [x] Full footer: Product, Pricing, Privacy, Terms, Credits, Contact, social links
- [x] Privacy policy page (updated 2026-11-06 for forms, browser history and Plausible)
- [x] Terms of service page
- [x] Contact page with a form (`/contact`, `?topic=` prefills the message)
- [x] Add social profile links to the footer and to the `sameAs` schema (the app checks other sites for this, so it should pass its own check)

### Collect emails (the quickest way to grow)

- [ ] Ask for an email before someone downloads the PDF or opens the full report (not done on purpose: the free report stays ungated during launch; the "fix it for me" form and waitlist collect emails instead. Revisit with paid plans)
- [x] A "Get notified when Pro launches" form (`/pricing#waitlist`)
- [x] Store emails: `data/leads/` JSON files, CSV export at `/api/leads?format=csv` (admin key), optional email per lead with `LEADS_NOTIFY_EMAIL`. Move to the database in Phase 2
- [x] Add a "Want us to fix this for you?" call to action at the end of every report

### Before launch (added 2026-11-06)

- [x] Add `PAGESPEED_API_KEY` (free from Google Cloud); without it Core Web Vitals and the "What AI sees" screenshot fail
- [ ] Set a monthly spend limit in the Anthropic console
- [ ] Buy crawlvane.com (the name is chosen), then set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_NAME`
- [ ] Have a lawyer review `/privacy` and `/terms`, and add a governing-law clause for where you're based
- [ ] Schedule `/api/cron` (cPanel cron job) so 30-day report deletion, promised in the privacy policy, actually runs

### Launch tasks

- [ ] Audit your own site with the tool and publish it as the sample report
- [x] Analytics code: Plausible with events (Audit started, Report finished, Waitlist joined, Fix requested, Contact sent, Report downloaded, Tool used, Badge copied). Turn on by setting `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (needs a Plausible account)
- [ ] Error tracking (Sentry)

---

## Phase 2: take money (weeks 2–4)

### Infrastructure

- [ ] Move hosting off shared cPanel to Vercel or a small VPS (background crawls, cron jobs and headless Chrome don't fit cPanel well)
- [x] Finish moving to Supabase: leads, widget leads, newsletter and site statistics have their own tables; reports and monitors are still JSON in `documents`
  - [x] Tables: users, projects, reports, monitors, ai_visibility_runs, leads
- [ ] A job queue for crawls and AI runs (for example Inngest, Trigger.dev or a database-backed queue)
- [ ] Keep rate limits in a shared store (Redis or the database) instead of per server process
- [ ] Scheduled jobs (Vercel Cron or a system cron) instead of the cPanel cron

### Accounts

- [x] Sign up and log in (Auth.js, Clerk or Supabase Auth)
- [x] Projects: save a site and see its report history
- [x] Dashboard: list of sites, latest scores, score trend
- [ ] Switch on `FEATURE_ACCOUNTS`

### Billing

- [x] Stripe Checkout and the customer portal
- [x] Fill in `planAllows()` in `lib/config.ts` with the user's plan (done as `planAllowsFor()` in `lib/entitlements.ts`)
- [ ] Turn on `PAYWALL_ENABLED`
- [x] Usage limits per plan (sites, pages per crawl, AI visibility credits)
- [ ] Plans to start with (check competitor prices on their own pages first):
  - [ ] **Free:** quick check, crawler map, Core Web Vitals, social check
  - [ ] **One-off report, about $39:** full crawl, competitors, fixes, AI plan, PDF
  - [ ] **Pro, $29–49/mo:** 3 sites, monitoring, AI visibility tracking, research, social posts
  - [ ] **Agency, $49–79/mo and up:** embeddable widget, white-label, 10+ sites, JavaScript rendering, team seats
  - [ ] **Done-for-you:** quote form
- [x] Credits for AI visibility checks (each prompt × engine costs API money; don't make it unlimited)
- [x] Track API cost so you can set prices from real numbers: tokens and searches per day, provider and feature in `data/usage/`, see `/api/usage` (admin). Set `AI_PRICE_*` for dollar estimates and `AI_DAILY_TOKEN_CAP` as a safety net

### Switch on built features

- [ ] AI social posts (`FEATURE_SOCIAL_POSTS=1`, needs the Anthropic key)
- [ ] Deep niche research (`FEATURE_DEEP_RESEARCH=1`)
- [ ] AI visibility test (`FEATURE_AI_VISIBILITY=1`): start with Claude and Perplexity, then OpenAI and Gemini
- [ ] Monitoring and email alerts (`FEATURE_MONITORING=1`, needs SMTP and the cron job). Alerts now list what changed page by page (noindex, canonical, title, H1, schema), not only score drops
- [ ] White-label PDF reports (`FEATURE_WHITE_LABEL=1`)
- [ ] JavaScript rendering (`FEATURE_JS_RENDER=1`, needs a Browserless URL)

---

## Phase 3: agency product and AI tracking (month 2)

### Embeddable audit widget (most proven market)

- [x] An embed script agencies paste on their own site (`/widget.js`, iframe at `/embed/[id]`)
- [x] A lead form inside the widget (name, email, URL)
- [x] The agency's branding on the widget (colour, logo, button text and link, optional white label). Branding on the full report: still to do
- [x] Send leads to email and a webhook (works with Zapier and Make webhooks)
- [x] Lead list per widget at `/admin/widgets` with CSV (admin only until accounts exist; agencies get their own dashboard with accounts)
- [x] Agency's own domain for reports (for example `reports.agency.com`)

### White-label reports

- [x] Logo, colours and agency name on PDF and web reports
- [x] Remove the app's branding on Agency plans
- [x] Scheduled client reports emailed monthly

### AI visibility tracking over time

- [x] Re-run the same prompts every week
- [x] Trend charts per engine (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews)
- [x] Share of voice against competitors
- [x] Sentiment: how the brand is described
- [ ] Which sources get cited, and which ones cite competitors but not you
- [x] Prompt gap list: prompts where competitors appear and you don't
- [x] Alerts when visibility drops

### Team

- [x] Invite team members with roles (owner, editor, viewer)

---

## Phase 4: stand out (month 3 and later)

### Apply fixes, not just list them

- [x] WordPress plugin that applies schema, llms.txt, robots.txt and meta fixes in one click
- [ ] Shopify app with the same fixes (it also gets you into their app directory)
- [x] GitHub integration that opens a pull request with the fixes

### AI bot traffic (rare outside enterprise tools)

- [x] Upload a server log and see which AI bots visit, which pages they read, and what gets blocked (`/tools/ai-bot-log-analyzer`, runs in the browser)
- [ ] Or a small script or Cloudflare Worker to count bot visits live
- [x] AI referral traffic: GA4 regex builder (`/tools/ga4-ai-traffic-regex`) and AI referrals in the log analyzer

### Integrations

- [x] Google Search Console: real clicks and impressions next to the findings
- [x] GA4: organic and AI referral traffic
- [ ] Bing Webmaster Tools and IndexNow

### Issue tracking

- [x] Mark an issue as fixed (kept in the browser until accounts exist)
- [x] Re-check a single issue without a full re-crawl
- [x] Assign issues to a person
- [x] Export to CSV, and "Copy as ticket" Markdown on every issue for Jira, Linear, Trello or GitHub (direct integrations still to do)
- [x] History: before/after against the last run on this browser (server-side history comes with accounts)

### More for agencies

- [x] Bulk audits from a CSV of URLs (`/bulk`, up to 20)
- [x] Public API with API keys (`/api/v1/audit`, keys created by the admin at `/api/apikeys`, docs at `/developers`)
- [x] Multi-language checks: hreflang codes, self-reference, absolute URLs, duplicates, x-default on the audited page (checking that every alternate links back still to do; it needs a crawl)
- [x] Local business check: LocalBusiness schema details and the phone matching the page. Google Business Profile comparison still to do (needs the Places API)

### Content and marketing

- [ ] Comparison pages ("vs Otterly", "vs Peec", "SEOptimer alternative")
- [x] Free mini-tools that bring in search traffic: 16 live at `/tools`, including the accessibility checker (ADA / WCAG 2.2) and the AI bot log analyzer
- [x] Accessibility (WCAG) group in the main audit: zoom, landmarks and skip link, frame titles, ARIA and keyboard order, media
- [x] Embeddable score badge (`/api/badge?url=`), offered in reports scoring 70+
- [ ] Blog and guides on AEO and GEO
- [ ] Launch on Product Hunt and Hacker News, and post in Reddit communities (see the marketing plan in `APP-FEATURES.md`)

---

## Needs you (nothing more to build until these are done)

- Deploy, DNS, final name and domain (Phase 0 and Brand)
- Keys: `PAGESPEED_API_KEY`, `ANTHROPIC_API_KEY` with a spend limit, SMTP, Plausible account
- Decide hosting (Vercel or VPS), database (for example Supabase) and auth provider; then accounts, Stripe and the Phase 2 database move can be built
- Lawyer review of `/privacy` and `/terms`; testimonials
- Free tool 15 ("How does AI describe my business?") waits for the Anthropic key, an email gate and a daily cap
- WordPress plugin, Shopify app and GitHub pull requests: need a test WordPress or Shopify store and a GitHub App
- Search Console, GA4 and Bing integrations: need Google and Microsoft OAuth apps
- Comparison pages ("vs Otterly", "vs Peec"): need a decision on how to word competitor claims

---

## Don't build

- Keyword databases, backlink indexes or rank tracking. Semrush and Ahrefs already own these, and the data is expensive.

---

## Competitor reference (prices from third-party sites; check vendor pages)

| Group | Examples | Price | Notes |
|---|---|---|---|
| AI visibility trackers | Otterly, Peec AI, Profound, Semrush AI Toolkit | about $29, €70–89, $99–399+, $99/mo | Mostly monitoring, no fixes |
| Site audit tools | Seobility, SE Ranking, Sitechecker, SEOptimer | about $19–55/mo | Crawl, rankings, PDF reports |
| Agency lead-gen widgets | SEOptimer, MySiteAuditor | about $39–79/mo | SEOptimer says 2,000+ agencies use its widget |

Sources:
- [Surmado: best AI visibility tools 2026](https://www.surmado.com/blog/best-ai-visibility-tools-2026)
- [PromptZone: Profound vs Peec vs Otterly](https://www.promptzone.com/tara_suzuki/best-ai-search-visibility-tracking-software-in-2026-profound-vs-peec-vs-otterly-pe6)
- [Discovered Labs comparison](https://discoveredlabs.com/blog/profound-vs-peec-vs-otterly-which-ai-visibility-platform-should-you-buy)
- [Ayzeo comparisons](https://ayzeo.com/comparisons)
- [Rankite: 7 AI visibility tools compared](https://rankite.com/blog/best-ai-visibility-software)
- [Dupple: free SEO tools 2026](https://dupple.com/learn/best-free-seo-tools)
- [SEO tools pricing 2026](https://ai-price-tracker.pages.dev/blog/seo-tools-pricing-compared-2026)
- [Toolradar: Seobility pricing](https://toolradar.com/tools/seobility/pricing)
- [Search Atlas: SEOptimer review](https://searchatlas.com/seoptimer-review)
- [CheckThat: MySiteAuditor](https://checkthat.ai/brands/mysiteauditor)
- [Insites: lead generation tools](https://insites.com/the-5-best-lead-generation-tools-for-digital-marketing-providers)
- [Frase: 10 best AI visibility tools](https://frase.io/blog/the-10-best-ai-visibility-tools-in-2026)
- [The Rank Masters: crawler analytics tools](https://www.therankmasters.com/insights/ai-visibility/best-ai-visibility-tools-crawler-analytics)
- [Oncrawl AI Search Lens](https://www.oncrawl.com/platform/lenses/ai-search-lens/)
- [Metehan: AI visibility metrics 2026](https://metehan.ai/articles/leading-ai-visibility-metrics-platforms-and-tools-2026/)
