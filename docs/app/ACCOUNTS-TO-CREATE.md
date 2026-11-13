# Accounts to create

Every outside account Crawlvane needs, in the order to set them up, with what to configure and the settings each one gives you for `.env.local`. Costs are in [COSTS.md](COSTS.md).

Tick each box as you go. Set every setting **once** in `.env.local`: a second, empty line for the same setting wipes out the value (see `LESSONS-LEARNED.md`).

---

## Step 1: needed to run the app at all

### ☐ Domain registrar (crawlvane.com)
- **Why:** the landing site (`crawlvane.com`) and the app (`app.crawlvane.com`).
- **Do:** buy `crawlvane.com`. Add DNS records for the site and the `app` subdomain, pointing at your hosting.
- **Settings:** `NEXT_PUBLIC_SITE_URL=https://crawlvane.com`, `NEXT_PUBLIC_APP_URL=https://app.crawlvane.com`, `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.crawlvane.com`

### ☐ Hosting
- **Why:** runs the app. Shared cPanel works (see `DEPLOY-CPANEL.md`) but struggles with long crawls; a small VPS or Vercel is the recommended move (`TODO.md`).
- **Do:** set up Node 20.18.1 or newer, deploy the build, add an SSL certificate for both addresses, and schedule `/api/cron` hourly.
- **Settings:** `CRON_SECRET` (any long random string; the cron job passes it)

### ☐ Supabase (database and sign-in)
- **Why:** all data and all sign-ins.
- **Do:**
  1. Create a project.
  2. Run `supabase/schema.sql` in the SQL editor (again after every update).
  3. Authentication → URL Configuration: set the Site URL to the app address, and add `/auth/callback` for every domain (`https://app.crawlvane.com/auth/callback` and `http://localhost:3000/auth/callback`).
  4. Authentication → Emails → SMTP: paste your email service's details (next account).
  5. Authentication → Emails → Templates: paste the branded templates from `design/email-templates/` (subject lines and steps in its README). The sign-in ones include the code (`{{ .Token }}`) the sign-in page asks for. Paste them again whenever they change: the sign-up, sign-in and reset links now use `{{ .TokenHash }}` so they work on any device.
  6. Authentication → Providers → Email: keep **Email** on and **Confirm email** on. Set the minimum password length to 10 (the sign-up page asks for at least 10) and, on a paid plan, turn on leaked password protection.
- **Settings:** `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the **service_role** key), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the **anon** key). Then `FEATURE_ACCOUNTS=1`.

### ☐ Email sending service (Resend or Postmark)
- **Why:** sign-in codes, alerts, invites, trial and limit emails, monthly client reports and "Email me this result". Supabase's built-in sender only mails your Supabase team.
- **Do:** verify your domain (add the DNS records it gives you), create SMTP credentials, and use them in both Supabase (step above) and the app.
- **Settings:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (for example `Crawlvane <hello@crawlvane.com>`)

### ☐ Anthropic (Claude)
- **Why:** the AI fix plan, AI page helpers, AI free tools, content briefs, research and social posts.
- **Do:** create an API key and **set a monthly spend limit** in the console.
- **Settings:** `ANTHROPIC_API_KEY`, optionally `AI_DAILY_TOKEN_CAP` and `AI_TOOLS_DAILY_CAP` as extra safety nets.

### ☐ Business details for the legal pages
- **Why:** the privacy policy and terms need them before launch.
- **Settings:** `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_PRIVACY_EMAIL`, and `ADMIN_KEY` (any long random string, for admin preview and sample reports).

---

## Step 2: needed to take payments

### ☐ Stripe
- **Why:** subscriptions, one-off reports, credit packs, Agency add-ons, trials and referral credit.
- **Do (test mode first):**
  1. Create products and recurring prices: Pro and Agency (monthly, and yearly if you want), plus two monthly add-on prices: extra seat ($10) and extra 10 sites ($20).
  2. Create one-time prices: one full report, and an AI credit pack.
  3. Developers → Webhooks: add `https://app.crawlvane.com/api/billing/webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted` and `.trial_will_end`.
  4. Settings → Billing → Customer portal: switch it on.
  5. Run one purchase, one trial and one cancellation in test mode, then once more in live mode with a real card.
- **Settings:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_AGENCY_YEARLY`, `STRIPE_PRICE_REPORT`, `STRIPE_PRICE_CREDITS`, `STRIPE_PRICE_EXTRA_SEAT`, `STRIPE_PRICE_EXTRA_SITES`, `STRIPE_TRIAL_DAYS`, `CREDITS_PER_PACK`, and the labels shown on the site: `PRICE_PRO_LABEL`, `PRICE_AGENCY_LABEL`, `PRICE_PRO_YEARLY_LABEL`, `PRICE_AGENCY_YEARLY_LABEL`, `PRICE_REPORT_LABEL`, `PRICE_EXTRA_SEAT_LABEL`, `PRICE_EXTRA_SITES_LABEL`.
- **Last:** `PAYWALL_ENABLED=1`, and `SIGNUP_GATE=1` if you want visitors to see only the first fixes.

### ☐ Lawyer (one-off)
- **Why:** review `/privacy` and `/terms`, including refunds, cancellations and a governing-law clause, before taking money.

---

## Step 3: sign-in options (free accounts)

### ☐ Google Cloud
One project covers three things:
- **Google sign-in:** OAuth consent screen, then a "Web application" OAuth client with Supabase's callback URL as the redirect. Paste the ID and secret into Supabase → Authentication → Providers → Google. Setting: `NEXT_PUBLIC_AUTH_GOOGLE=1`.
- **PageSpeed API key:** enable "PageSpeed Insights API" and create an API key (application restriction: None or your server's IP). Fixes the "daily quota is used up" errors. Setting: `PAGESPEED_API_KEY`.
- **Search Console and GA4:** enable "Google Search Console API", "Google Analytics Data API" and "Google Analytics Admin API". Create a second OAuth "Web application" client with the redirect `https://app.crawlvane.com/api/me/google/callback` (and `http://localhost:3000/api/me/google/callback` for testing). Add the read-only Search Console and Analytics scopes to the consent screen. While the consent screen is in "Testing", add yourself as a test user; publish it before launch. Settings: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` (any long random string; changing it disconnects every team).

### ☐ Microsoft Azure (Microsoft sign-in)
- **Do:** Azure portal → App registrations → New, for "Accounts in any organizational directory and personal Microsoft accounts". Add Supabase's callback URL as a Web redirect URI. Create a client secret and **note when it expires** (renew it before then). Paste the ID and secret into Supabase → Providers → Azure, with tenant URL `https://login.microsoftonline.com/common`.
- **Optional:** publisher verification, so work accounts don't see an "unverified" warning.
- **Setting:** `NEXT_PUBLIC_AUTH_MICROSOFT=1`

### ☐ GitHub (GitHub sign-in)
- **Do:** GitHub → Settings → Developer settings → OAuth Apps → New, with Supabase's callback URL. Paste the ID and secret into Supabase → Providers → GitHub.
- **Setting:** `NEXT_PUBLIC_AUTH_GITHUB=1`

---

## Step 4: optional, only for the features you switch on

| Account | Feature | Settings |
|---|---|---|
| ☐ **OpenAI** | ChatGPT answers in AI visibility tracking | `OPENAI_API_KEY`, `FEATURE_AI_VISIBILITY=1` |
| ☐ **Perplexity** | Perplexity answers in AI visibility tracking | `PERPLEXITY_API_KEY` |
| ☐ **Google AI Studio (Gemini)** | Gemini answers in AI visibility tracking | `GEMINI_API_KEY` |
| ☐ **SerpApi** | Google Play listings in App Check | `SERPAPI_KEY` |
| ☐ **Browserless** | JavaScript rendering for single-page apps | `BROWSERLESS_URL`, `FEATURE_JS_RENDER=1` |
| ☐ **Plausible Analytics** | Cookie-free visitor stats | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_PLAUSIBLE_SRC` |
| ☐ **Sentry** | Error tracking (not wired in yet; see `TODO.md`) | — |
| ☐ **Business email** (for example Google Workspace) | Real inboxes for `privacy@` and `support@` | — |
| ☐ **USPTO** (or your country's trademark office) | Register "Crawlvane" | — |
| ☐ **wordpress.org** | List the WordPress plugin in the plugin directory | — |

Accounts your **customers** create (you don't need these): Slack (for Slack alerts), Cloudflare (for the Worker), GitHub tokens (for pull requests), and their own Google accounts (for Search Console and GA4).

**Not needed:** Apple Developer Program (Apple sign-in was left out on purpose), and keyword, ranking or backlink data providers (not built).
