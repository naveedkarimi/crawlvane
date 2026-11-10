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
- **OPEN: 53 Python scripts from the old plugin are still in `scripts/`.** The app doesn't use them. Decide whether to delete them. (2026-11-08)

## AI

- **Thinking counts toward `max_tokens`.** Sonnet 5.5 thinks by default, so limits of 3,000 to 4,000 tokens could cut a plan off and break its JSON. Limits are now 4,000 to 16,000, effort is `medium`, and a cut-off reply shows a clear error. You pay for tokens used, not the limit. Set `AI_DAILY_TOKEN_CAP` as a safety limit. (2026-11-08)
- **Long web searches can return `pause_turn`.** Send the reply back to continue. `callClaude` does this up to 3 times. (2026-11-08)

## Settings and secrets

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

- **`PGRST202: Could not find the function` means the SQL hasn't run.** The app reached Supabase, but the function isn't there. Run the current `supabase/schema.sql`, which ends by refreshing Supabase's function list. Check you're in the right project. (2026-11-08)
- **Editing `schema.sql` changes nothing by itself.** Every change has to be run in the Supabase SQL Editor. The script is safe to run repeatedly. (2026-11-08)
- **Create tables before adding the secret key.** With the key set and tables missing, forms show "We couldn't save that just now" and the submission is lost. (2026-11-08)
- **Supabase is the only database.** There is no local file storage, so the app needs `SUPABASE_URL` and `SUPABASE_SECRET_KEY` even in development. Old files in `data/` are no longer read. (2026-11-08)
- **Forms go straight to Supabase, so new form submissions send no email alert.** Check the `leads` table, or add a Supabase database webhook. (2026-11-08)
- **Crawling, AI and speed tests can't move to the browser.** Browsers can't read other websites, and those steps use private keys. They run on the server and save straight to Supabase. (2026-11-08)
- **Keep tables closed to the public key.** Row level security stays on with no policies. The forms work through `security definer` functions, so nobody can read the list, forge unsubscribe tokens, or test whether an email is on it. (2026-11-08)
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
- **Use a real 404, not a redirect.** Sending missing pages to the homepage counts as a soft 404. `app/not-found.tsx` returns status 404 with noindex, no canonical and no schema, and links back into the site. (2026-11-08)

## Testing here

- **"Another next dev server is already running."** Only one can run per project. To test a build, copy the project somewhere temporary and build there. (2026-11-08)
- **Don't send test submissions to a running dev server.** They land in your real Supabase tables. Use the fake-API test scripts, or delete the test rows afterwards. (2026-11-08)
- **zsh differs from bash.** A command stored in a variable isn't split into words, and `$PIPESTATUS` is empty. Use functions, and check `$?` on commands without a pipe. (2026-11-08)
- **Don't run parallel shell commands that use `cd`.** They can race and run in the wrong folder. (2026-11-08)

## Design

- **The design token file uses `--surface` differently.** In `crawlvane-tokens.css`, `--surface` is white and `--surface-2` is the alternate section colour. The app uses `--surface` for alternate sections, so copying the file over turns those sections white. Map by role, not by name. (2026-11-09)
- **Don't redefine `--font-mono`, `--font-sans` or `--font-display`.** `next/font` sets those to load the fonts. Alias them instead (`--font-head: var(--display)`). (2026-11-09)
- **Apple touch icons need square corners and PNG format.** iOS rounds the corners itself, and transparent corners show as black. (2026-11-09)

- **Check visual changes with headless Chrome screenshots.** Take before and after shots of the running dev server (`Google Chrome --headless=new --screenshot=... --window-size=1366,2200`). Headless Chrome won't go narrower than about 500 px, so check phone layouts in a real browser. (2026-11-09)
- **Don't recolour the link preview tool.** Its `.lp-*` styles copy Google, Facebook and WhatsApp on purpose. (2026-11-09)

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
