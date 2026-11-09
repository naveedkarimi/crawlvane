# Crawlvane

Crawlvane audits websites for search engines (SEO), answer engines (AEO) and AI assistants (GEO), then gives ready-to-paste fixes. It's a free, self-hosted web app that hasn't launched yet.

Stack: Next.js 16 (App Router, standalone output), React 19, TypeScript, Supabase. Node 20.18.1 or newer.

## Commands

| Command | Use |
|---|---|
| `npm run dev` | Local server on port 3000 |
| `npm test` | All test scripts, using mocked APIs |
| `npx tsc --noEmit --incremental false` | Type check |
| `npm run smoke -- https://example.com 10` | Real crawl from the command line |
| `npm run package:cpanel` | Build `dist/seo-app-cpanel.zip` |

Run the type check and `npm test` after every change. Tests use a fake Supabase. `npm run smoke` writes to the real database.

## Layout

| Path | What's there |
|---|---|
| `app/` | Pages and API routes (`app/api/*`). `/api/v1/audit` is the public API |
| `components/` | React components. `ReportView` and `ReportProgress` drive full reports |
| `lib/audit.ts`, `lib/analyze.ts`, `lib/crawl.ts` | Page fetching, checks and site crawling |
| `lib/report.ts` | Full site report job and its progress log |
| `lib/store.ts` | Server access to Supabase: JSON documents and the dedicated tables. There is no local file storage |
| `lib/supabasePublic.ts` | Forms that go straight from the browser to Supabase |
| `lib/ai/` | Claude and other AI providers |
| `lib/retention.ts` | Deletes old data on the schedule the privacy policy promises |
| `lib/config.ts` | Feature flags and limits |
| `lib/brand.ts` | Product name, domain and legal details |
| `supabase/schema.sql` | Database tables and functions. Safe to re-run |
| `docs/` | Documentation. Start at `docs/README.md` |

`scripts/*.mts` are the app's tests and tools. `scripts/*.py` are leftovers from an older plugin that the app doesn't use.

## Rules

- **User-supplied URLs:** fetch them only through `lib/safeFetch.ts` (`assertPublicUrl`, `safeFetch`). It blocks private addresses and DNS rebinding.
- **Secrets:** settings live in `.env.local` in the main folder. Never commit them or add `NEXT_PUBLIC_` to a secret.
- **Database changes:** update `supabase/schema.sql` and tell the user to run it. It doesn't apply itself.
- **Browser access:** the browser only calls the form functions in `schema.sql`. Never add a table policy or a key that lets it read data.
- **Data changes:** if a change affects what's collected, stored, shared or kept, update `app/privacy/page.tsx` in the same piece of work.
- **Personal data in statistics:** `site_checks` stores domain and path only. Never a query string, IP address or email.
- **Honesty:** never score an error page, add fake progress, or invent testimonials or numbers.
- **Branding:** use `BRAND` from `lib/brand.ts`. Don't hardcode the product name, domain or a person's name.
- **Git:** commit or push only when the user asks. `origin` is `naveedkarimi/crawlvane`.

## Lessons Learned

Read `docs/LESSONS-LEARNED.md` before changing setup, data storage, the crawler or deployment. When you find a new gotcha or lesson, or fix an open problem, update that file in the same piece of work.
