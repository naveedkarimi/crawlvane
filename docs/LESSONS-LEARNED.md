# Lessons learned and gotchas

Keep this file current. Read it before changing setup, data storage, the crawler or deployment.

## How to add to this file

Add an entry whenever something surprises you, wastes time, or breaks in a way the code doesn't make obvious. Put it under the closest heading, using this format:

```
- **Short name.** What you see, why it happens, and what to do. (YYYY-MM-DD)
```

- Mark a problem that still exists with **OPEN**. When it's fixed, remove the mark and say how, or delete the entry if it no longer helps anyone.
- Write down symptoms as people actually see them, such as the exact error text, so they can be searched.
- Never paste real keys, passwords or customer details here.

## Open problems

- **OPEN: Claude changes haven't run against the real API.** `ANTHROPIC_API_KEY` isn't set, so the higher token limits, `medium` effort, the new web search tool and paused-turn handling are only tested against a fake. Run one AI fix plan and one web search feature when the key is in. (2026-11-08)
- **OPEN: Bing Webmaster Tools hasn't run against a real API key.** `lib/bing.ts` follows Bing's documented JSON API (`GetUserSites`, `GetRankAndTrafficStats`, `GetQueryStats`, `GetPageStats`, answers wrapped in `d`), but only the adding-up is tested. Connect one real site and check the numbers match Bing's own dashboard. (2026-11-13)
- **OPEN: keywords, backlinks and the AI writer haven't run for real.** Rank tracking reads Search Console (`gscQuery`) and the backlinks read Bing's `GetLinkCounts` and `GetUrlLinks`; only the helpers are tested. Run the latest `schema.sql`, track a few keywords on a site linked to Search Console, open Backlinks on a site linked to Bing, and write one article with the Anthropic key in. Positions are Search Console's 7-day averages, never estimates; a keyword with no impressions shows "Not ranking". (2026-11-13)
- **OPEN: the job queue hasn't run on the real database.** `JOB_QUEUE=1` sends full reports through `claim_job` in Supabase. Only the worker loop is tested (with fakes). Before turning it on: run `schema.sql`, start two reports, restart the server mid-report and check `/api/cron` picks it up again. The worker runs inside the Node process, so it needs a long-running server, not serverless functions. (2026-11-13)
- **OPEN: 53 Python scripts from the old plugin are still in `scripts/`.** The app doesn't use them. Decide whether to delete them. (2026-11-08)

## AI

- **Thinking counts toward `max_tokens`.** Sonnet 5.5 thinks by default, so limits of 3,000 to 4,000 tokens could cut a plan off and break its JSON. Limits are now 4,000 to 16,000, effort is `medium`, and a cut-off reply shows a clear error. You pay for tokens used, not the limit. Set `AI_DAILY_TOKEN_CAP` as a safety limit. (2026-11-08)
- **Long web searches can return `pause_turn`.** Send the reply back to continue. `callClaude` does this up to 3 times. (2026-11-08)

## Settings and secrets

- **An empty line in `.env.local` wipes out a value set above it.** Next.js reads the file top to bottom and later lines win, even when they're empty. A pasted template block (`SUPABASE_URL=` with nothing after it) silently turned off sign-in and the database. Keep one line per setting; to check what the app sees, run `node -e 'require("@next/env").loadEnvConfig(process.cwd())'` and look at `process.env`. (2026-11-11)
- **Only the main folder's env files count.** Next.js reads `crawlvane/.env.local`. Anything in `supabase/.env*` is ignored, which caused "daily quota is used up" even though a valid Google key existed. (2026-11-08)
- **"This form isn't set up yet" means the public settings are gone.** Replacing the contents of `.env.local` can remove `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Add new lines below the existing ones, then restart. (2026-11-08)
- **Don't leave example values active.** A placeholder `ANTHROPIC_API_KEY` counts as set, so AI features call the API and fail. Comment it out until the real key is ready. (2026-11-08)
- **Two Supabase keys do different jobs.** `SUPABASE_SECRET_KEY` must be the `service_role` key and stays on the server. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the public key for the newsletter form. The app refuses a public key in the secret setting, and the build refuses a secret key in the public setting. (2026-11-08)
- **`NEXT_PUBLIC_` values are public and fixed at build time.** They ship to every browser. Set them before `npm run build` or `npm run package:cpanel`. (2026-11-08)
- **A blank number means 0.** The limits use `Number(process.env.X ?? 50)`, and a blank value isn't caught by `??`. Keep optional settings commented out in `.env.example`. (2026-11-08)
- **`.env.example` is a template, with no real values.** `npm run package:cpanel` copies the main folder's file into the upload, and the build fails if it's missing. A copy of real keys was once saved as `supabase/.env.example`. (2026-11-08)
- **Selecting a key in the editor can share it with Claude.** Highlighted lines are sent to the chat. Rotate any key that gets exposed this way. (2026-11-08)
- **"Daily quota is used up" means no Google key was found.** Without `PAGESPEED_API_KEY`, requests share Google's anonymous quota. Leave the key's application restriction on None or a server IP, because a website restriction blocks server calls. (2026-11-08)

## Supabase

- **New columns can arrive before the owner runs the new `schema.sql`.** Code that reads a new column must still work without it: load the organisation with `select("*")` (`ensureAccount`), and only write new columns once their feature is configured (the webhook writes add-on columns only when add-on prices are set). Otherwise a schema that hasn't been run yet breaks sign-in or plan changes. (2026-11-12)
- **`PGRST202: Could not find the function` means the SQL hasn't run.** The app reached Supabase, but the function isn't there. Run the current `supabase/schema.sql`, which ends by refreshing Supabase's function list. Check you're in the right project. (2026-11-08)
- **Editing `schema.sql` changes nothing by itself.** Every change has to be run in the Supabase SQL Editor. The script is safe to run repeatedly. (2026-11-08)
- **Create tables before adding the secret key.** With the key set and tables missing, forms show "We couldn't save that just now" and the submission is lost. (2026-11-08)
- **Supabase is the only database.** There is no local file storage, so the app needs `SUPABASE_URL` and `SUPABASE_SECRET_KEY` even in development. Old files in `data/` are no longer read. (2026-11-08)
- **Forms go straight to Supabase, so new form submissions send no email alert.** Check the `leads` table, or add a Supabase database webhook. (2026-11-08)
- **Crawling, AI and speed tests can't move to the browser.** Browsers can't read other websites, and those steps use private keys. They run on the server and save straight to Supabase. (2026-11-08)
- **Keep tables closed to the public key.** Row level security stays on with no policies. The forms work through `security definer` functions, so nobody can read the list, forge unsubscribe tokens, or test whether an email is on it. (2026-11-08)
- **Rate limits are shared through Supabase.** `rateLimit()` is async now: always `await` it. Keys are HMAC-hashed so IPs never reach the database. Until `hit_rate_limit` exists (run the latest `schema.sql`), it quietly uses the old per-process limiter and logs that once. The bot-hit endpoint stays per-process on purpose, because it's too busy for a database call per request. (2026-11-13)
- **The browser can't be rate limited per visitor.** Newsletter sign-ups and other forms each have a cap of 30 per minute across the whole site instead. A flood can block real sign-ups for a minute. (2026-11-08)
- **`site_checks` saves in the background.** If saving fails, the check still works and the error only appears in the server log. (2026-11-08)

## App store checker

- **Apple's lookup service has no subtitle.** The subtitle is read from the public App Store page, which can change its markup. When it can't be read, the check says so instead of failing. (2026-11-09)
- **Google Play needs a provider.** Google has no public listing API, and reading Play pages directly risks breaking its terms. Without `SERPAPI_KEY`, Play checks show a clear message. SerpApi's data has no full description, version or feature graphic, so those checks are skipped for Play. (2026-11-09)
- **Apple doesn't use the description for search.** It ranks on the name, subtitle and a hidden keywords field. Don't tell people to stuff keywords into an App Store description. Google Play does use it. (2026-11-09)

## Data and retention

- **Deletion doesn't rely on cron alone.** `lib/retention.ts` runs at server start and every 6 hours in production, and from `/api/cron`. Add new retention periods there. It doesn't run under `npm run dev`. (2026-11-08)
- **Read, change, save needs a queue.** Simultaneous AI calls overwrote each other's usage counts, so `recordUsage` saves one at a time. (2026-11-08)

## Crawler and reports

- **A very fast report is a warning sign.** A 2-second, one-page "report" turned out to be a score for a `403 Forbidden` page. Audits now stop on HTTP 400 and above with a clear message. Don't try to get around a block: the site owner has to allow the crawler. (2026-11-08)
- **403 from several sites on one server points to a block on your IP.** Compare the IP from `dig` across sites, and test a site on a different host. `fambasket.app`, `afghosting.com` and `naveedkarimi.com` all returned 403, while sites elsewhere loaded. Reports before the honest error existed looked fine because they scored the 403 page. (2026-11-08)
- **Don't add fake work to make things feel slower.** The crawl pauses before each page to be polite to the site, and the progress view paces real log lines so they can be read. (2026-11-08)
- **Count finished pages, not started ones.** With two workers, counting at the start repeats numbers like (3/6), (3/6). (2026-11-08)
- **Don't record cached results.** Otherwise someone can fill `site_checks` without limit by repeating a cached request. (2026-11-08)
- **Save paths, never query strings.** Anything after `?` can hold tokens or personal details. The privacy page promises this. (2026-11-08)

## Next.js and the browser

- **LastPass can cause a hydration error.** If the diff shows `data-lastpass-icon-root`, the extension changed the page before React loaded. It's harmless, and it doesn't happen in a private window with extensions off. Email-only fields carry `data-lpignore` to reduce it. (2026-11-08)
- **Don't vertically centre a hero whose content changes height.** The home hero was centred, so switching between Page check, Full site report and App Check moved the headline up and down. It's now top-aligned with a minimum height for the form area. (2026-11-09)
- **Keep tab text the same weight when selected.** A bold selected tab changes every tab's width, so the row shifts sideways. Show selection with background or the underline instead. (2026-11-09)
- **The dashboard and the public site have separate layouts.** Public pages live in `app/(site)/` and get the header and footer from its layout. The dashboard lives in `app/(app)/`. The brackets aren't part of the URL. `app/not-found.tsx` is shown from the root layout, so it wraps itself in `SiteChrome`. Don't hide the header with CSS: it still loads and flashes. (2026-11-10)
- **The sign-in pages have their own layout.** `/login`, `/signup`, `/forgot-password` and `/reset-password` live in `app/(auth)/`, so they're full screen with the brand panel and no site header. New sign-in routes must also go in `APP_PATHS` in `lib/hosts.ts`, or the landing address won't send them to the app. After moving a route folder, the running dev server kept rendering the old component on the server, which showed as a hydration error whose diff had the old markup. Restart `npm run dev` after moving route folders. (2026-11-12)
- **Supabase's own email links only work in the browser that asked for them.** `{{ .ConfirmationURL }}` uses PKCE, so a password reset requested on a laptop and opened on a phone fails with "link expired". Our templates link to `/auth/callback?token_hash={{ .TokenHash }}&type=…` instead, which `verifyOtp` checks on the server. Sign-up with an email that already has an account returns a user with no identities and sends nothing; the sign-up page shows "already exists" for that. (2026-11-13)
- **A dashboard that won't load after an update usually means the SQL hasn't run.** Missing tables or columns ("Could not find the table 'public.alerts' in the schema cache", "column sites.client_name does not exist") broke the dashboard, while sign-in still worked because the Phase 1 tables existed. The server log now says to run `supabase/schema.sql`. A `head` count request doesn't reliably report a missing table, so test with a real select. (2026-11-10)
- **Use a real 404, not a redirect.** Sending missing pages to the homepage counts as a soft 404. `app/not-found.tsx` returns status 404 with noindex, no canonical and no schema, and links back into the site. (2026-11-08)

## Testing here

- **"Another next dev server is already running."** Only one can run per project. To test a build, copy the project somewhere temporary and build there. (2026-11-08)
- **Don't send test submissions to a running dev server.** They land in your real Supabase tables. Use the fake-API test scripts, or delete the test rows afterwards. (2026-11-08)
- **Test the dev server at `localhost`, not `127.0.0.1`.** Next.js 16's dev server blocks its browser code for other hosts, so nothing becomes interactive and every "it doesn't work" result is false. Production builds aren't affected. (2026-11-09)
- **Read the live page state with Chrome's debugging protocol.** Start Chrome with `--remote-debugging-port=9333 '--remote-allow-origins=*'` (quote it in zsh) and evaluate JavaScript over the WebSocket to click, scroll and measure. Screenshots alone can't show interactivity. (2026-11-09)
- **zsh differs from bash.** A command stored in a variable isn't split into words, and `$PIPESTATUS` is empty. Use functions, and check `$?` on commands without a pipe. (2026-11-08)
- **Turbopack won't build with a linked `node_modules`.** In a scratch copy, a symlink gives "Could not find the Next.js package (next/package.json)". Copy it instead with `cp -Rc`, which is instant on APFS. (2026-11-10)
- **Local Postgres in the scratch folder needs `-k ''`.** The scratch path is too long for a Unix socket ("is too long (maximum 103 bytes)"), so start it TCP-only with `pg_ctl -o "-p 54399 -k ''"` and connect to `localhost`. (2026-11-10)
- **Don't run parallel shell commands that use `cd`.** They can race and run in the wrong folder. (2026-11-08)

## Design

- **Input borders need 3:1, so "very light" has a limit.** The sign-in pages first used #dce3eb, which looks clean but is only 1.3:1 and fails WCAG 1.4.11. Every `.field` now uses `--field-border` (#7690ae, a steel blue at 3:1 on white and on #f4f6f9) with 12px corners, a white fill, a darker border on hover and a Vane Blue ring on focus. Don't go lighter than that token; make inputs feel clean with space, corners and the focus ring instead. (2026-11-13)

- **The design token file uses `--surface` differently.** In `crawlvane-tokens.css`, `--surface` is white and `--surface-2` is the alternate section colour. The app uses `--surface` for alternate sections, so copying the file over turns those sections white. Map by role, not by name. (2026-11-09)
- **Don't redefine `--font-mono`, `--font-sans` or `--font-display`.** `next/font` sets those to load the fonts. Alias them instead (`--font-head: var(--display)`). (2026-11-09)
- **Apple touch icons need square corners and PNG format.** iOS rounds the corners itself, and transparent corners show as black. (2026-11-09)

- **Check visual changes with headless Chrome screenshots.** Take before and after shots of the running dev server (`Google Chrome --headless=new --screenshot=... --window-size=1366,2200`). Headless Chrome won't go narrower than about 500 px, so check phone layouts in a real browser. (2026-11-09)
- **Don't recolour the link preview tool.** Its `.lp-*` styles copy Google, Facebook and WhatsApp on purpose. (2026-11-09)
- **`--signal` changes with the background.** In design system v2.0 the accent is Vane Blue on light and pale blue (#8BB2DC) on dark. The "Dark sections" rule in `app/globals.css` swaps it, plus the logo colours, for the footer, home hero, dashboard sidebar and other dark blocks. Add any new dark block to that rule, or its icons and logo will be too dark to see. (2026-11-10)
- **Signal Red is brand, not status.** Audits use red for failures, so keep `--signal-2` (#C1292E) to the logo and small labels like kickers. Use `--cta` or `--good` for checkmarks, progress and "better than before". Tab groups that filter by result use `.status-tabs`, which keeps the selected underline blue. (2026-11-10)

## Accounts

- **Sign-in links need the redirect URL allowed in Supabase.** Add `/auth/callback` for every domain under Authentication → URL Configuration, or the email link fails. (2026-11-09)
- **The design file is a bundle, not readable CSS.** `design/Design System 2.0/Crawlvane Dashboard (standalone).html` packs its code, so read it by screenshot. Its example card shows 54 as "Needs work", but the app's bands are Good from 85, Needs work from 60 and Poor below 60. The dashboard follows the app so it agrees with reports. (2026-11-10)
- **The dashboard preview must stay honest.** `/dashboard?demo=1` shows example data with a visible banner, and every button that would change something is disabled or asks you to sign in. (2026-11-10)
- **Retention covers the account tables too.** Team invites are deleted after 14 days (when they expire), alerts after 180 days and Stripe event IDs after 90. Add any new account table with a time limit to `lib/retention.ts` and the privacy page. (2026-11-10)
- **A sign-in link that lands on the home page with `?code=` means the redirect URL isn't allowed.** Supabase falls back to the Site URL when `/auth/callback` isn't in its allow list. `proxy.ts` now forwards `/?code=` to `/auth/callback` so the user still reaches the dashboard, but add the callback URL in Supabase anyway. (2026-11-10)
- **The dashboard is the app; the public pages are the landing site.** Page checks, full reports, App Check and report viewing all run inside `/dashboard` (`?tab=check`, `?tab=report&id=`). Shared components take a prop or check the path to stay in the app (`ReportForm` `onStarted`, `lib/appLinks.ts`). Public report links (`/report/[id]`) still work for sharing. (2026-11-10)
- **The app can live on its own address.** `NEXT_PUBLIC_APP_URL` (e.g. `https://app.crawlvane.com`) moves `/dashboard`, `/login`, `/auth` and `/invite` there; everything else redirects back to the main site. Without `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.crawlvane.com` the sign-in cookie stays on the app address, so the landing header shows "Sign in" even when you're signed in. Both are `NEXT_PUBLIC_`, so set them before building. `npm run dev` ignores both, so Sign in and other app links stay on localhost even with the live values in `.env.local`. (2026-11-10)
- **Supabase's `service_role` needs table access for `prune_reports` and `bump_usage`.** They aren't `security definer`, so they run with the caller's rights. Supabase grants that by default; a bare local Postgres doesn't, which shows as "permission denied for table documents". (2026-11-10)
- **Custom report domains need hosting work too.** The app checks the agency's DNS points at us, but the server must also accept the domain and have an SSL certificate for it, or browsers show a certificate error. (2026-11-10)
- **Change what each level gets in `lib/tiers.ts` and `lib/entitlements.ts`, nowhere else.** The pricing comparison is generated from them, so the page can't promise something the app doesn't enforce. Visitor gates are server-side (`/api/audit` strips locked fixes, `/api/advice` and `/api/reports` answer 401 with `signup: true`); the browser only adds prompts. (2026-11-10)
- **Don't give away what the free account sells.** The old email-only weekly monitor on the page check let visitors skip sign-up. With accounts on, `/api/monitors` now asks for a free account; monitors made before keep running. (2026-11-10)
- **Account data goes through the server, never the browser.** The browser only signs in and out. API routes check the session with `currentUser()`, then read with the secret key, so row level security stays closed. (2026-11-09)

## Repo

- **There's no git history yet.** Deleted or overwritten files can't be restored until the first commit, and plugin folders once disappeared with no way to recover them. Make the first commit soon. (2026-11-08)
- **Check a duplicate lockfile before deleting it.** See which one `package.json` and `node_modules` agree with. (2026-11-08)
- **Files ending in " 2" are copy collisions.** Copying a project over this one renamed the app's `scripts/` to `scripts 2/`, which broke `npm test` and packaging. Compare before deleting, because they can hold the real files. (2026-11-08)
- **Search can't see text inside images.** After removing a name or domain, check screenshots too. One product screenshot still showed the old URL. (2026-11-08)

## Lessons learned

- **Check the code before trusting the docs.** The roadmap and to-do list fell behind within days. (2026-11-08)
- **Tests against a fake database don't prove the real one works.** Run SQL on real Postgres, send one real submission, and say clearly what wasn't tested. (2026-11-08)
- **Change the privacy page in the same piece of work as the data change.** New storage, new services and new retention periods all need it. The Terms once banned the product's own bulk tool. (2026-11-08)
- **Set the order of manual steps for people.** Say which step comes first when the wrong order breaks something. (2026-11-08)
- **Fix the cause when a symptom looks like a design problem.** "Reports are too fast" led to a real bug that a progress bar alone would have hidden. (2026-11-08)
