# Accounts, dashboard and payments: build plan

Started 2026-11-09. Built in phases; each phase works on its own and is switched on with a feature flag, so nothing reaches visitors until it's ready.

## How it fits together

- **Logins:** Supabase Auth with an email link (and Google later). The browser only signs in and out; every API route checks the session on the server.
- **Data:** new Supabase tables, read and written only by the server with the secret key. Row level security stays on with no policies, like the rest of the database.
- **Organisations:** every account belongs to an organisation (a person or an agency). Sites, reports, apps, plans and credits belong to the organisation, so teams share them.
- **Switches:** `FEATURE_ACCOUNTS` shows sign-in and the dashboard. `PAYWALL_ENABLED` turns on plan limits.

## Phases

| Phase | What | Status |
|---|---|---|
| 1 | Sign-in, organisations, dashboard with saved sites, score history and reports | Built (2026-11-09). Switch on with `FEATURE_ACCOUNTS=1` |
| 2 | Plans, limits and AI credits (`lib/entitlements.ts`, `usage_counters`, `credit_ledger`) | Built (2026-11-09). Limits apply only with `PAYWALL_ENABLED=1` |
| 3 | Stripe: checkout for plans, one-off reports and credit packs, customer portal, webhooks (`lib/billing.ts`) | Built (2026-11-09). Not yet tested with real Stripe keys |
| 4 | Monitoring in the dashboard: weekly site checks and app monitoring with rating drops and competitor updates (`lib/orgMonitoring.ts`) | Built (2026-11-09) |
| 5 | AI tracking over time: weekly prompts per site, trends per engine, share of voice (`lib/visibilityTracking.ts`) | Built (2026-11-09). Needs the AI keys |
| 6 | Teams and agencies: invites and roles, client names on sites, scheduled monthly client reports, alerts (`lib/teams.ts`, `lib/schedules.ts`, `lib/alerts.ts`) | Built (2026-11-09) |
| 7 | Dashboard redesign to match `design/Design System 2.0/Crawlvane Dashboard (standalone).html`: sidebar, Overview with score chart, alerts, fixes and AI crawler table | Built (2026-11-10). Preview without signing in at `/dashboard?demo=1` |
| 8 | The rest (2026-11-10): reports kept 365 days for paid teams (`prune_reports`), API keys per team, agency widgets, team report branding and white-label reports without our header, custom report domains, AI answer sentiment and a chart per engine, Google sign-in, change email, data download, a first-run checklist, paid plans on /pricing, and a separate app address (`proxy.ts`, `lib/hosts.ts`) | Built. Needs the settings in `.env.example` and the latest `schema.sql` |
| 9 | Visitor → free → Pro → Agency ladder (2026-11-10): `lib/tiers.ts` (one table for gates and the pricing comparison), `SIGNUP_GATE` (visitors see the first 3 fixes; AI plan, downloads and full reports need a free account), one free weekly check, sign-up and upgrade prompts (`components/Upsell.tsx`), near-limit nudge, Stripe trial and yearly prices, header button is Sign in / Dashboard | Built. Turn on with `SIGNUP_GATE=1`; trial and yearly need their Stripe settings |
| 10 | Growth and automation (2026-11-11/12). **Money and retention:** upgrade emails (trial ending, limit reached, a weekly drop on Free), buying one report before signing in, referrals (a free month as Stripe credit), Agency add-ons (extra seats, site packs), Slack alerts, assigning fixes and exporting them for Jira, Linear or CSV. **AI:** page helpers (topic coverage, answer rewrites, FAQ builder, meta tags), the free tools "How does AI describe my business?" and the meta tag writer, and prompt gaps with content briefs. **Growth:** internal link suggestions in full reports, priced "fix it for me" (`lib/fixPrices.ts`), "Email me this result" on every free tool, and the `/examples` gallery. **Automation:** `/api/v1/fixes`, a WordPress plugin (`integrations/wordpress/`), GitHub pull requests, a Cloudflare Worker download, and a Search Console and GA4 connection. Tests in `scripts/test-growth.mts` | Built. Needs the latest `schema.sql` and the settings below |

Everything above passes the type check and `npm test`. The full `schema.sql` was run twice on a local Postgres 2026-11-10: row level security is on for every table with no policies, the public key can't read tables or call `bump_usage`, and deleting a team deletes all its data. Nothing has run yet against a real Supabase project, Stripe account or mail server.

## Setup the owner has to do

- Supabase → Authentication → URL Configuration: set the Site URL and add `/auth/callback` for every domain (for example `http://localhost:3000/auth/callback`).
- Run the latest `supabase/schema.sql`.
- Set `FEATURE_ACCOUNTS=1` in `.env.local` and restart.
- Separate app address: point `app.crawlvane.com` at the same server, add it to Supabase's redirect URLs (`https://app.crawlvane.com/auth/callback`), set Supabase's Site URL to it, then set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.crawlvane.com` before building.
- Sign-in emails: in Supabase → Authentication → Emails, add your own SMTP (Resend, Postmark or similar). Supabase's built-in sender only mails your Supabase team and a few emails an hour. In the "Magic Link" template, include the code as well as the link, for example `Your code is {{ .Token }}` above `{{ .ConfirmationURL }}`, so people can type the code on any device.
- Google sign-in: create OAuth credentials in Google Cloud (OAuth consent screen, then a "Web application" client with Supabase's callback URL), paste them into Supabase → Authentication → Providers → Google, then set `NEXT_PUBLIC_AUTH_GOOGLE=1`.
- Microsoft sign-in: in the Azure portal → App registrations, register an app for "Accounts in any organizational directory and personal Microsoft accounts", add Supabase's callback URL as a Web redirect URI, create a client secret (note when it expires), paste the ID and secret into Supabase → Providers → Azure with tenant URL `https://login.microsoftonline.com/common`, then set `NEXT_PUBLIC_AUTH_MICROSOFT=1`. Publisher verification removes the "unverified" warning some work accounts show.
- GitHub sign-in: GitHub → Settings → Developer settings → OAuth Apps, set the callback to Supabase's callback URL, paste the ID and secret into Supabase → Providers → GitHub, then set `NEXT_PUBLIC_AUTH_GITHUB=1`.
- Apple sign-in is left out on purpose: it needs the $99-a-year Apple Developer Program and a key renewed every 6 months. Add it if there's ever an iPhone app.
- Custom report domains: set `CUSTOM_REPORT_DOMAINS=1`. Each agency domain must also be added to your hosting with an SSL certificate (on cPanel, as an alias or addon domain).
- Stripe: create the products and prices, then set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_PRICE_REPORT` and `STRIPE_PRICE_CREDITS`. Add a webhook to `https://YOUR_DOMAIN/api/billing/webhook` for `checkout.session.completed` and `customer.subscription.created`, `.updated` and `.deleted`, then set `STRIPE_WEBHOOK_SECRET`. Switch on the customer portal in Stripe's settings.
- Set `PAYWALL_ENABLED=1` only when Stripe works. Until then every plan limit is off.
- Emails (sign-in aside, which Supabase sends) need `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS`. Without them, invites show a link to copy instead.
- Weekly checks, tracking and scheduled reports run from `/api/cron`. Call it at least daily with `CRON_SECRET`.
- Stripe extras: add `customer.subscription.trial_will_end` to the webhook's events (trial-ending email). For Agency add-ons, create two recurring monthly prices and set `STRIPE_PRICE_EXTRA_SEAT` and `STRIPE_PRICE_EXTRA_SITES`. To sell one report before sign-in, set `PRICE_REPORT_LABEL` (uses `STRIPE_PRICE_REPORT`).
- Search Console and GA4: set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY` (steps in `.env.example`). Google's consent screen needs the Search Console and Analytics read-only scopes, and while it's in "testing" only listed test users can connect.
- "Fix it for me" prices: fill in `FIX_PRICES` in `lib/fixPrices.ts`. Until then reports show the quote form only.
- Sample reports: add one with `POST /api/admin/samples` and the `x-admin-key` header: `{ "reportId", "site", "title", "summary", "permission" }`, where permission records who agreed and when. Add `/examples` to the Resources menu in `components/navLinks.ts` once there's at least one.
- WordPress plugin: zip `integrations/wordpress/crawlvane-fixes` and install it, or publish it on wordpress.org. It needs a team API key (Pro or Agency).
