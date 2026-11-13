# Plans, pricing and growth

How Crawlvane turns visitors into free accounts and free accounts into paying customers: what each level gets, how billing works, what to switch on and in what order, and the ideas not built yet.

Last updated 2026-11-10. When you change a limit or a gate, change it in the code first (see [How to change a plan](#how-to-change-a-plan)), then update this page.

---

## The ladder

There are four levels. Each one should be useful on its own and make the next one obvious.

| Level | Who | What they're paying for |
|---|---|---|
| **No account** | Anyone on the website | Nothing. The free check shows the problem and proves the product works |
| **Free account** | Signed up with an email or Google | Nothing, but they give an email and come back each week |
| **Pro** | Site owners and marketers | Tracking progress: more sites, monitoring, AI visibility, competitors |
| **Agency** | Consultants and agencies | Client work: many sites, branding, client reports, lead widget |

### What each level gets

| | No account | Free | Pro | Agency |
|---|---|---|---|---|
| Page check: about 50 SEO, AEO and GEO checks, with scores | ✓ | ✓ | ✓ | ✓ |
| Every issue found, with details | ✓ | ✓ | ✓ | ✓ |
| AI crawler access map, Core Web Vitals, social check | ✓ | ✓ | ✓ | ✓ |
| Free tools (robots.txt, schema, llms.txt and the rest) | ✓ | ✓ | ✓ | ✓ |
| App Check (App Store and Google Play score) | ✓ | ✓ | ✓ | ✓ |
| How to fix each issue | First 3 | All | All | All |
| AI fix plan for a page | – | 5 credits a month | 200 credits | 1,000 credits |
| Download a page check (Markdown, CSV, JSON) | – | ✓ | ✓ | ✓ |
| Full site reports a month | – | 2 | 30 | 200 |
| Pages per full report | – | 50 | 300 | 300 |
| AI fix plan inside a full report | – | – | ✓ | ✓ |
| Competitor comparison | – | – | Up to 3 | Up to 3 |
| Saved websites with score history | – | 1 | 3 | 25 |
| Weekly checks with email alerts | – | 1 site | 3 sites | 25 sites |
| AI visibility tracking (ChatGPT, Claude, Perplexity, Gemini) | – | – | 3 sites | 25 sites |
| Tracked apps with competitor updates | – | 1 | 3 | 25 |
| Team seats | – | 1 | 2 | 10 |
| API keys | – | – | 1 | 5 |
| Deep research, AI social posts, JavaScript rendering, App Check premium | – | – | ✓ | ✓ |
| Your name, logo and colour on reports, no Crawlvane header | – | – | – | ✓ |
| Your own report domain (reports.youragency.com) | – | – | – | ✓ |
| Monthly client reports by email | – | – | – | 25 sites |
| Audit widget for your website, with leads | – | – | – | 5 |
| Reports kept | 30 days | 30 days | 365 days | 365 days |

The "No account" column applies when `SIGNUP_GATE=1`. Without it, visitors see every fix and can download. Once the paywall is on, the AI fix plan and full reports need an account anyway, because they count against a plan. Limits in the other columns are only enforced when `PAYWALL_ENABLED=1`; until then everyone gets generous launch limits.

### AI credits

One credit covers about one AI answer. Credits come from the monthly allowance first, then from bought packs, which don't expire at the end of the month.

| Feature | Credits |
|---|---|
| AI fix plan | 1 |
| App listing advice | 2 |
| App review analysis | 3 |
| AI social posts | 2 |
| Deep research | 10 |
| AI visibility: each question asked to each AI assistant | 1 |
| AI visibility: reading how the answers describe you (once per run) | 1 |

A credit pack adds 100 credits by default (`CREDITS_PER_PACK`).

---

## How visitors become customers

Each step happens where the person is already working, never as a pop-up on arrival.

1. **Page check (no account).** After the results, a card says "Keep track of yoursite.com" with what a free account adds. With the sign-up gate on, fixes after the first 3 show "Create a free account to see how to fix this", and the AI fix plan, downloads and full report ask for an account.
2. **Sign-up.** The sign-in link brings people back to the same check inside the dashboard, now with every fix, and the site is saved to their history.
3. **Getting started.** The dashboard shows a checklist: add a website, run a check, turn on weekly checks, run a full report.
4. **Coming back.** The free weekly check emails when the score drops. That email is the main reason free users return.
5. **Hitting a limit.** When an action is blocked by the plan, a bar appears with "See plans". At 80% of a limit, the Overview says so before anything is blocked.
6. **Paying.** The plan page offers monthly or yearly billing and a free trial on the first subscription. Coming from a "Choose Pro" button on the pricing page, it shows "Continue to checkout" straight away.

### Other ways it makes money

- **One-off full report:** for people who won't subscribe. Bought in the dashboard.
- **AI credit packs:** for heavy users who don't want a bigger plan.
- **Done for you:** the "Want us to fix these for you?" form on every page check and report asks for a fixed-price quote.

---

## Billing

- **Stripe** runs checkout, invoices, the customer portal and card details. The app never sees card numbers.
- **Subscriptions:** Pro and Agency, monthly or yearly. The webhook is the only thing that changes a team's plan.
- **Trial:** set `STRIPE_TRIAL_DAYS` (for example 14). It applies to a team's first subscription only, so cancelling and resubscribing doesn't give a second trial. Capped at 60 days.
- **Yearly:** set `STRIPE_PRICE_PRO_YEARLY` and `STRIPE_PRICE_AGENCY_YEARLY`. The dashboard then shows a Monthly/Yearly switch.
- **Switching plans:** a team that already subscribes is sent to the Stripe customer portal instead of a second checkout.
- **One-off items:** a full report (`STRIPE_PRICE_REPORT`) and an AI credit pack (`STRIPE_PRICE_CREDITS`).
- **Promotion codes** are allowed at checkout. Create them in Stripe.

### Prices

The pricing page never shows a made-up number. Paid plans appear there only when `PAYWALL_ENABLED=1` and both `PRICE_PRO_LABEL` and `PRICE_AGENCY_LABEL` are set. Until then it shows the "Free while we launch" page.

Suggested starting points to test, from 2026 market prices:

| Plan | Monthly | Yearly (2 months free) |
|---|---|---|
| Pro | $39–49 | $390–490 |
| Agency | $99–149 | $990–1,490 |
| One-off full report | $39 once | – |
| Credit pack (100 credits) | $10–15 once | – |

AI visibility trackers start around $29 a month and mid tiers run $95–499. Classic SEO suites start around $139. Most of them only track numbers, so a cheaper product that gives the fixes has room. Check competitors' own pricing pages before setting prices, and check your real AI costs per report in each provider's dashboard after the first runs.

---

## Settings

All in `.env.local` (development) or the server's environment. `NEXT_PUBLIC_` settings are fixed when the site is built.

| Setting | What it does |
|---|---|
| `FEATURE_ACCOUNTS=1` | Sign-in and the dashboard |
| `SIGNUP_GATE=1` | Visitor limits: first 3 fixes, account needed for AI plan, downloads and full reports |
| `VISITOR_FIX_PREVIEW=3` | How many fixes a visitor sees |
| `PAYWALL_ENABLED=1` | Plan limits and paid features. Turn on only once Stripe works |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe connection |
| `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY` | Monthly price IDs |
| `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_AGENCY_YEARLY` | Yearly price IDs (optional) |
| `STRIPE_PRICE_REPORT`, `STRIPE_PRICE_CREDITS`, `CREDITS_PER_PACK` | One-off report and credit pack |
| `STRIPE_TRIAL_DAYS` | Free trial length for a first subscription |
| `PRICE_PRO_LABEL`, `PRICE_AGENCY_LABEL` | Prices shown on /pricing, like `$39` |
| `PRICE_PRO_YEARLY_LABEL`, `PRICE_AGENCY_YEARLY_LABEL` | Yearly prices shown on /pricing |
| `PAID_REPORT_TTL_DAYS=365` | How long paid teams' reports are kept |
| `FEATURE_WHITE_LABEL=1` | Agency branding on reports |
| `CUSTOM_REPORT_DOMAINS=1` | Agencies' own report domains |
| `FEATURE_AI_VISIBILITY=1`, `FEATURE_DEEP_RESEARCH=1`, `FEATURE_SOCIAL_POSTS=1`, `FEATURE_JS_RENDER=1`, `FEATURE_APP_PREMIUM=1` | Paid features. Each needs its API key |

The full list, including AI keys and email, is in `.env.example`.

## Order to switch things on

1. **Collect free sign-ups first.** Run the latest `supabase/schema.sql`, set `FEATURE_ACCOUNTS=1` and `SIGNUP_GATE=1`, set up email (SMTP) and the daily `/api/cron` job so the free weekly check works.
2. **Turn on the AI features** you'll sell in Pro, once `ANTHROPIC_API_KEY` (and the other AI keys for visibility) are in. Run each once yourself to see the real cost.
3. **Set up Stripe:** products and prices, the webhook to `/api/billing/webhook` (checkout completed, subscription created, updated and deleted), the customer portal, and optionally the trial and yearly prices.
4. **Turn on the paywall:** `PAYWALL_ENABLED=1` plus the price labels. The pricing page switches to the paid plans.
5. **Agency extras:** `FEATURE_WHITE_LABEL=1`, then `CUSTOM_REPORT_DOMAINS=1` once your hosting can add agency domains with SSL.

---

## How to change a plan

Everything is enforced on the server, and the pricing comparison is generated from the same numbers, so the page can't promise something the app doesn't do.

| To change | Edit |
|---|---|
| Limits per plan (sites, reports, credits, seats…) | `PLAN_LIMITS` in `lib/entitlements.ts` |
| Credit cost of an AI feature | `CREDIT_COST` in `lib/entitlements.ts` |
| Which plan a feature needs | `FEATURE_PLAN` in `lib/config.ts` |
| What visitors get without an account | `lib/tiers.ts` |
| Rows in the pricing comparison table | `ladder()` in `lib/tiers.ts` |
| Plan cards on /pricing | `paidPlans()` in `lib/plans.ts` |

Run `npm test` afterwards: `scripts/test-tiers.mts` and `scripts/test-entitlements.mts` check the gates and limits.

---

## Ideas: built and still open

Built on 2026-11-11 (switch on with the settings in `ACCOUNTS-PLAN.md`):

- **Upgrade emails** after a weekly check finds a drop (Free teams), 3 days before a trial ends, and when a team hits a limit (`lib/lifecycle.ts`, once per team per period).
- **Buy one report without an account:** "Get the full report for $X" on the page check; pay, sign in, and it runs (`PRICE_REPORT_LABEL`).
- **Priced done-for-you work:** "From $X" per fix type in reports, from `lib/fixPrices.ts`.
- **Referrals:** a link per team; one free month (Stripe credit) for each referred team that starts paying.
- **Agency add-ons:** extra seats ($10 a month each) and site packs ($20 a month per 10 sites) on the Agency subscription.
- **Google Search Console and GA4 connection** for every team: clicks, impressions, top searches and AI referral visits per site.
- **AI visibility gaps:** questions where competitors are named and you aren't, with a content brief (credits).

Next, from the capability extensions review (`FEATURES.md`, section 16): quick adds that reuse data the app already has, such as Search Console opportunities (high impressions and low click rate, positions 8 to 20), GA4 landing pages next to audit issues, report comparison with an executive summary, and webhooks. None of them change current plans or limits; which plan each sits in is suggested there.

Still open:

1. **Annual-only discount for Agency.** Pricing only: set a yearly Agency price in Stripe (`STRIPE_PRICE_AGENCY_YEARLY`).
2. **Usage-based AI visibility:** extra questions per site sold as credit packs instead of a hard limit.
3. **Comparison pages** (vs Otterly, vs Peec). Check competitors' prices and features on their own sites first.
4. **Industry benchmarks and a "State of AI readiness" report**, once there's enough real audit data. Never estimate.

## Before taking money

- A lawyer reviews `/privacy` and `/terms`, including the refund and cancellation wording.
- Legal name, address and privacy email are set (`NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_PRIVACY_EMAIL`).
- Run one real purchase and one cancellation in Stripe's test mode, then once more in live mode with a real card.
- A monthly spend limit in the Anthropic console, and `AI_DAILY_TOKEN_CAP` as a safety net.
