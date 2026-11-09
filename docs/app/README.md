# Crawlvane: SEO + AEO + GEO audit app

A self-hosted app that audits websites for search engines, answer engines and AI search. It crawls whole sites, compares competitors, generates ready-to-paste fixes and writes an AI fix plan.

- **Everything the app does, the pricing plan and the marketing plan:** [APP-FEATURES.md](APP-FEATURES.md)
- **Deploying to cPanel:** [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md)
- **All settings:** [.env.example](../../.env.example)

## Develop

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY, ADMIN_KEY
npm run dev                     # http://localhost:3000
npm test                        # analyzer, robots, private-network blocking and AI-parsing tests
npm run smoke -- https://example.com 10   # real crawl from the command line
```

## Ship to cPanel

```bash
npm run package:cpanel          # → dist/seo-app-cpanel.zip
```

Upload the zip, extract it, and point cPanel's Node.js app to `app.js`. See DEPLOY-CPANEL.md.

## Domain and brand name

Both come from two settings in `.env`: `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_NAME` (read in `lib/brand.ts`). Set them before `npm run build`, because pages, sitemap, robots.txt, llms.txt and the share image are rendered at build time. To move to a new domain: change them, rebuild, deploy, and 301-redirect the old domain if it was ever public.

## Feature switches

Live features are on by default. Advanced features are built but show "Coming soon" until you set `FEATURE_…=1`. Preview them privately with `?admin=YOUR_ADMIN_KEY`. Everything is free while `PAYWALL_ENABLED=0`. See `lib/config.ts`.
