# Your next steps

Everything that needs you, in the order to do it. The code for all of this is built; these are the settings, accounts, tests and decisions only you can do. Tick them off as you go.

Written 2026-11-13. For how to set up each outside account, see [ACCOUNTS-TO-CREATE.md](ACCOUNTS-TO-CREATE.md). For prices, see [COSTS.md](COSTS.md).

## 1. Make it run (do first, about 30 minutes)

Nothing that uses accounts or the database works until these are done.

- [ ] **Fix `.env.local`.** Delete line 2 and lines 21 to 24. They're empty duplicates that wipe out your Supabase settings.
- [ ] **Run the latest `supabase/schema.sql`** in Supabase → SQL Editor. It's safe to run again; it adds the new tables for Bing, IndexNow, keywords, articles, bot visits, rate limits and the job queue.
- [ ] **Add these settings to `.env.local`:**
  - `TOKEN_ENCRYPTION_KEY`: any long random string. Needed for Google and Bing connections. Don't change it later, or every team has to reconnect.
  - `ANTHROPIC_API_KEY`: needed for the AI writer, AI fix plan and AI helpers.
  - `PAGESPEED_API_KEY`: turns on speed tests across each site's top pages.
  - `CRON_SECRET`: any random string of 12 or more characters, for the scheduled jobs.
- [ ] **Restart `npm run dev`** so the new settings load.

## 2. Set up Supabase sign-in (about 20 minutes)

- [ ] **Authentication → URL Configuration:** set the Site URL to your app address (`http://localhost:3000` for now). Add `/auth/callback` under Redirect URLs for every address you use, for example `http://localhost:3000/auth/callback`.
- [ ] **Authentication → Providers → Email:** keep Email and "Confirm email" on, and set the minimum password length to 10.
- [ ] **Authentication → Emails → Templates:** paste all six templates from `design/email-templates/`, with the subject lines in its README. Three changed recently: Confirm signup, Magic Link and Reset Password.
- [ ] **Authentication → Emails → SMTP:** add your email service (Resend or Postmark), or sign-in emails only reach your own Supabase team.

## 3. Test the new features with real data (about 1 hour)

These are tested with fake data only. Try each one and tell me what breaks.

- [ ] **Sign-in:**
  - Sign up with a password and confirm with the code.
  - Confirm a second account by opening the link on your phone.
  - Log in, then log out.
  - Use "Forgot password" and set a new one.
  - Try "Email me a sign-in code".
- [ ] **Keyword rankings** (Dashboard → Keywords & content): link a site to Search Console (Websites), add a few keywords, press "Check now".
- [ ] **AI writer:** write one article. It costs 3 credits.
- [ ] **Bing and backlinks:** in Bing Webmaster Tools, go to Settings → API access and copy your key. Paste it under Websites → Bing and IndexNow, link your site, then open Backlinks.
- [ ] **IndexNow:** set it up for one site, upload the key file it gives you, then send pages.
- [ ] **AI bot visits:** add the Cloudflare Worker (or the PHP snippet) to a real site and check that counts appear.
- [ ] **Full site report:** run one and check the "Speed across your top pages" table and the Wikidata entity check.
- [ ] **Job queue (optional):** set `JOB_QUEUE=1`, start two full reports, restart the server mid-report, then open `/api/cron?secret=YOUR_CRON_SECRET` and check the report finishes.
- [ ] **Phone check:** sign in on your phone and look through each dashboard section.

## 4. Decisions only you can make

- [ ] **Prices for Pro and Agency.** Check competitors' own pricing pages first. Then create the Stripe prices, set the `STRIPE_PRICE_*` and `PRICE_*_LABEL` settings, and only then turn on `PAYWALL_ENABLED=1`.
- [ ] **Where to host:** a small VPS or a cPanel Node app works with everything, including the job queue. Vercel works too, but the job queue needs a long-running server, so leave `JOB_QUEUE` off there.
- [ ] **Your real social profiles** (LinkedIn, X and others). Send me the links and I'll add them to the site's schema. The self-audit flags their absence on every page, and I won't invent them.
- [ ] **Testimonials and numbers:** only once you have real ones. The site never shows made-up ones.
- [ ] **Paid data, later:** rank tracking for keywords you don't rank for yet (SerpApi or DataForSEO), and backlinks beyond Bing's index. Only once paying customers ask for them.

## 5. Before launch

- [ ] **Buy `crawlvane.com`**, then set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_URL` (for example `https://app.crawlvane.com`).
- [ ] **Deploy.** Follow [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md), or your chosen host's steps. Update the Supabase Site URL and Redirect URLs to the live addresses.
- [ ] **Schedule the cron job:** call `https://YOUR_APP/api/cron?secret=YOUR_CRON_SECRET` every 15 to 60 minutes. It deletes old data on the schedule the privacy policy promises, runs weekly checks and rank tracking, and restarts stopped reports.
- [ ] **Set spend limits** in the Anthropic console (and the OpenAI, Perplexity and Gemini consoles, if you use them). Keep `AI_DAILY_TOKEN_CAP` and `AI_TOOLS_DAILY_CAP` set.
- [ ] **Lawyer review** of `/privacy` and `/terms`, including a governing-law clause for where you're based.
- [ ] **Fill in your legal details:** `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS` and `NEXT_PUBLIC_PRIVACY_EMAIL`.
- [ ] **Check the name:** run a trademark search for "Crawlvane" before spending on marketing.

## 6. After launch

- [ ] **Run `npm run indexnow`** after each deploy that adds pages. It needs `INDEXNOW_KEY` set and the site live.
- [ ] **Submit the sitemap** in Google Search Console and Bing Webmaster Tools.
- [ ] **Audit your own live site** with Crawlvane and fix what it finds. The self-audit on the dev server averaged 93 out of 100.
- [ ] **Add error tracking** with Sentry. It's optional, and the free tier is fine to start.
- [ ] **Check the comparison pages:** recheck OtterlyAI, Peec AI and SEOptimer prices every few months, and update `lib/compare.ts` with the date.
