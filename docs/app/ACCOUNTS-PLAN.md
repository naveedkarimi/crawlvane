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
| 7 | Dashboard redesign to match `design/Crawlvane Dashboard (standalone).html`: sidebar, Overview with score chart, alerts, fixes and AI crawler table | Built (2026-11-10). Preview without signing in at `/dashboard?demo=1` |
| 8 | The rest (2026-11-10): reports kept 365 days for paid teams (`prune_reports`), API keys per team, agency widgets, team report branding and white-label reports without our header, custom report domains, AI answer sentiment and a chart per engine, Google sign-in, change email, data download, a first-run checklist, paid plans on /pricing, and a separate app address (`proxy.ts`, `lib/hosts.ts`) | Built. Needs the settings in `.env.example` and the latest `schema.sql` |
| 9 | Visitor → free → Pro → Agency ladder (2026-11-10): `lib/tiers.ts` (one table for gates and the pricing comparison), `SIGNUP_GATE` (visitors see the first 3 fixes; AI plan, downloads and full reports need a free account), one free weekly check, sign-up and upgrade prompts (`components/Upsell.tsx`), near-limit nudge, Stripe trial and yearly prices, header button is Sign in / Dashboard | Built. Turn on with `SIGNUP_GATE=1`; trial and yearly need their Stripe settings |

Everything above passes the type check and `npm test`. The full `schema.sql` was run twice on a local Postgres 2026-11-10: row level security is on for every table with no policies, the public key can't read tables or call `bump_usage`, and deleting a team deletes all its data. Nothing has run yet against a real Supabase project, Stripe account or mail server.

## Setup the owner has to do

- Supabase → Authentication → URL Configuration: set the Site URL and add `/auth/callback` for every domain (for example `http://localhost:3000/auth/callback`).
- Run the latest `supabase/schema.sql`.
- Set `FEATURE_ACCOUNTS=1` in `.env.local` and restart.
- Separate app address: point `app.crawlvane.com` at the same server, add it to Supabase's redirect URLs (`https://app.crawlvane.com/auth/callback`), set Supabase's Site URL to it, then set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.crawlvane.com` before building.
- Google sign-in: create OAuth credentials in Google Cloud, paste them into Supabase → Authentication → Providers → Google, then set `NEXT_PUBLIC_AUTH_GOOGLE=1`.
- Custom report domains: set `CUSTOM_REPORT_DOMAINS=1`. Each agency domain must also be added to your hosting with an SSL certificate (on cPanel, as an alias or addon domain).
- Stripe: create the products and prices, then set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_PRICE_REPORT` and `STRIPE_PRICE_CREDITS`. Add a webhook to `https://YOUR_DOMAIN/api/billing/webhook` for `checkout.session.completed` and `customer.subscription.created`, `.updated` and `.deleted`, then set `STRIPE_WEBHOOK_SECRET`. Switch on the customer portal in Stripe's settings.
- Set `PAYWALL_ENABLED=1` only when Stripe works. Until then every plan limit is off.
- Emails (sign-in aside, which Supabase sends) need `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS`. Without them, invites show a link to copy instead.
- Weekly checks, tracking and scheduled reports run from `/api/cron`. Call it at least daily with `CRON_SECRET`.
