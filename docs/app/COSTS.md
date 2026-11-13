# What it costs to run Crawlvane

> **Prices are rough ballparks written on 2026-11-12, not checked against each provider's site.** Confirm every price before you buy, and update this file when you do. How to set each account up is in [ACCOUNTS-TO-CREATE.md](ACCOUNTS-TO-CREATE.md).

## Summary

| | Monthly | Yearly or one-off |
|---|---|---|
| **Minimum to launch** (domain, hosting, email, AI) | about $10–40 plus AI usage | domain about $15 a year; lawyer review one-off |
| **Recommended** (add Supabase Pro and business email) | about $45–80 plus AI usage | + trademark filing |
| **With optional features** (AI visibility engines, App Check, JS rendering, analytics) | add roughly $70–150 plus usage | — |

AI usage is pay-as-you-go and grows with users. Set a monthly spend limit in the Anthropic console (and the other AI consoles) before launch.

## Needed before launch

| Item | Cost | Notes |
|---|---|---|
| Domain `crawlvane.com` | about $10–20 a year | `.ai` or `.io` versions cost more and are optional |
| Hosting | about $5–20 a month (VPS), about $20 a month (Vercel Pro) | Shared cPanel works for testing |
| Email sending (Resend or Postmark) | free tier to start; about $15–20 a month as volume grows | Sign-in codes and alerts |
| Anthropic API | pay as you go | Each AI feature costs 1–10 credits (see `CREDIT_COST` in `lib/entitlements.ts`); paid plans include credits so heavy use is paid for |
| Lawyer review of privacy and terms | one-off, typically a few hundred to a couple of thousand dollars | Before taking money |

## Strongly recommended

| Item | Cost | Notes |
|---|---|---|
| Supabase Pro | about $25 a month | Free projects pause when idle and have no daily backups |
| Trademark filing | a few hundred dollars per class, plus any attorney fee | Before spending on marketing |
| Business email (Google Workspace or similar) | about $6–8 per user a month | `privacy@`, `support@` |

## Only for features you switch on

| Item | Cost | Feature |
|---|---|---|
| OpenAI API | pay as you go | ChatGPT in AI visibility tracking |
| Perplexity API | pay as you go | Perplexity in AI visibility tracking |
| Gemini API | pay as you go (has a free tier) | Gemini in AI visibility tracking |
| SerpApi | small free tier; paid about $50–75 a month | Google Play in App Check |
| Browserless | about $50 a month and up, or free self-hosted | JavaScript rendering |
| Plausible Analytics | about $9 a month | Visitor stats |
| Sentry | free tier to start | Error tracking |

## Free (account only)

Stripe (no monthly fee; about 2.9% + 30¢ per US card payment, more for international cards), Google Cloud (sign-in, PageSpeed key, Search Console and GA4 APIs within free quotas), Microsoft Azure app registration, GitHub OAuth app, Cloudflare, Slack, and wordpress.org plugin listing.

## Not needed now

| Item | Cost | Why not |
|---|---|---|
| Apple Developer Program | $99 a year | Apple sign-in left out; only needed for an iPhone app |
| Keyword, ranking or backlink data (DataForSEO, Semrush or Ahrefs APIs) | often $50–500+ a month | Those modules aren't built; never estimate their numbers |

## Keeping costs under control

- Spend limits in every AI console, plus `AI_DAILY_TOKEN_CAP` and `AI_TOOLS_DAILY_CAP` in `.env.local`.
- Free AI tools are capped per visitor and per day; AI helpers on paid plans use credits.
- Keep `PAYWALL_ENABLED` off until Stripe works, but note that everything is free (including AI) while it's off.
