# Crawlvane roadmap

Written 2026-11-08. Work from top to bottom: each step assumes the ones above it are done. Details and background stay in `TODO.md` and `FEATURES.md`.

Effort is a rough guess. "You" means only you can do it (accounts, money, decisions). "Claude" means it can be built here.

**The main idea:** launch free first and get real users before building payments. The free product is already far ahead of the audience it has, which is zero, because the site isn't live.

## Stage 0: Protect the work and decide (this week)

| # | Task | Who | Effort | Done when |
|---|---|---|---|---|
| 1 | Create a private GitHub repo and push this project | You approve, Claude does it | 10 min | The code is no longer only on this laptop |
| 2 | Name chosen: Crawlvane. Check social handles and trademark, then buy crawlvane.com | You | 1 to 2 days | Domain bought |
| 3 | Choose hosting. Recommended: a small VPS. Reports run as long background jobs, and cPanel can stop idle apps | You | 1 hour | Server ordered |

## Stage 1: Go live (week 1)

| # | Task | Who | Effort | Done when |
|---|---|---|---|---|
| 4 | `PAGESPEED_API_KEY` is done. Get `ANTHROPIC_API_KEY` with a monthly spend limit, a mailbox for SMTP, and a Plausible account | You | 1 hour | Keys ready |
| 5 | Set the name and domain, `ADMIN_KEY`, `CRON_SECRET` and `AI_DAILY_TOKEN_CAP` | Claude | 30 min | Production settings complete |
| 6 | Write VPS deployment steps and deploy (Node 20.18.1 or newer, HTTPS, automatic restart) | Claude, with your server access | Half a day | Site opens on the real domain |
| 7 | Schedule `/api/cron` hourly. The privacy policy promises 30-day report deletion | Claude | 15 min | Old reports really get deleted |
| 8 | Add Sentry error tracking | Claude | 1 hour | A test error shows up |
| 9 | Test everything live: audit, full report, every free tool, widget, emails, PDF | Claude | Half a day | Checklist passes |
| 10 | Lawyer review of `/privacy` and `/terms`, plus a governing-law clause | You | 1 to 2 weeks, start now | Approved |
| 11 | Keyboard, VoiceOver and NVDA pass of the report page | You, Claude fixes | 2 hours | Accessibility statement holds up |
| 12 | Audit your own site, fix what it finds, publish it as the sample report | Claude | Half a day | Sample report linked |

## Stage 2: First users, still free (weeks 2 to 4)

| # | Task | Who | Effort | Done when |
|---|---|---|---|---|
| 13 | Soft launch to 50 to 100 people and collect feedback | You | 1 week | Top complaints listed |
| 14 | Free "How does AI describe my business?" tool with email gate and daily cap. Competitors already offer this free | Claude | 2 days | Live and capped |
| 15 | "Email me this result" on free tools | Claude | 1 day | Emails being collected |
| 16 | Publish guides on AEO and GEO | Claude drafts, you approve | Ongoing | First guides linked |
| 17 | Comparison pages (vs Otterly, vs Peec, SEOptimer alternative). Decide how to word competitor claims first | You decide, Claude writes | 2 days | Published |
| 18 | Public launch: Product Hunt, Show HN, Reddit, LinkedIn | You | 1 week | Launched |
| 19 | Collect real testimonials. Never invent them | You | Ongoing | First 3 on the site |
| 20 | **Decision point.** Suggested test: at least 500 audits, 100 waitlist sign-ups, or 10 people asking to pay. If not, fix the positioning before building payments | You | 1 hour | Decision made |

## Stage 3: Take money (months 2 to 3)

| # | Task | Who | Effort | Done when |
|---|---|---|---|---|
| 21 | Supabase is connected, and leads, widget leads, newsletter sign-ups and site statistics have their own tables. Move reports and monitors out of the `documents` JSON table, and add users, projects and AI visibility runs | Claude | 3 days | JSON store retired |
| 22 | Job queue, shared rate limits and system scheduled jobs | Claude | 2 days | Survives a restart mid-report |
| 23 | Sign-up and login, saved sites, report history, dashboard with score trends | Claude | 1 week | `FEATURE_ACCOUNTS` on |
| 24 | Confirm plans on competitor pages: Free, about $39 one-off report, Pro $29 to 49, Agency $49 to 79 and up, done-for-you quote | You | 2 hours | Prices fixed |
| 25 | Stripe checkout and customer portal, `planAllows()`, usage limits, AI credits | Claude | 1 week | `PAYWALL_ENABLED` on, test payment works |
| 26 | Decide whether email is required before the full report or PDF | You | 30 min | Decided |
| 27 | Switch on paid features: AI visibility test (Claude and Perplexity first, then OpenAI and Gemini), deep research, social posts, JavaScript rendering | Claude, you add keys | 1 day | Features on, costs tracked |

## Stage 4: Reasons to come back (months 3 to 4)

| # | Task | Who | Effort | Done when |
|---|---|---|---|---|
| 28 | Switch on monitoring and change alerts (`FEATURE_MONITORING`) | Claude | Half a day | Alerts arrive |
| 29 | Weekly AI prompt tracking: trends per engine, share of voice, sentiment, sources cited, prompt gaps, drop alerts | Claude | 2 weeks | Trend charts live |
| 30 | Event emails: score dropped, new AI crawler blocked, fix verified. Slack alerts after that | Claude | 2 days | Emails firing |
| 31 | Search Console: real clicks and impressions next to findings | You create OAuth app, Claude builds | 1 week | Connected on a real site |
| 32 | GA4: organic and AI referral traffic | Claude | 3 days | Connected |
| 33 | Bing Webmaster Tools and IndexNow | Claude | 2 days | Submission works |

## Stage 5: Agencies (months 4 to 5)

| # | Task | Who | Effort | Done when |
|---|---|---|---|---|
| 34 | White-label web and PDF reports, with app branding removed on Agency plans | Claude | 3 days | `FEATURE_WHITE_LABEL` on |
| 35 | Agency branding on widget reports, and each agency's own lead dashboard | Claude | 3 days | Agency logs in and sees leads |
| 36 | Scheduled monthly client reports | Claude | 2 days | Report emailed on schedule |
| 37 | Agency custom report domain (reports.agency.com) | Claude | 3 days | One domain working |
| 38 | Team invites and roles (owner, editor, viewer), assigning issues | Claude | 3 days | Roles enforced |
| 39 | Direct Jira, Linear and GitHub issue export; MCP server | Claude | 1 week | Issue created from a report |

## Stage 6: Apply the fixes (months 5 to 7)

| # | Task | Who | Effort | Done when |
|---|---|---|---|---|
| 40 | WordPress plugin: schema, robots.txt, meta fixes in one click, without clashing with Yoast or Rank Math | You provide a test site, Claude builds | 2 to 3 weeks | Listed on WordPress.org |
| 41 | GitHub app that opens a pull request with the fixes | You create the app, Claude builds | 1 week | PR opened on a test repo |
| 42 | Cloudflare Worker template: fixed headers, Markdown pages, live AI bot counts | Claude | 3 days | Running on one site |

## Add whenever there's a gap

Small, independent improvements. None block the stages above.

| Task | Effort |
|---|---|
| Topic coverage (fan-out) check | 2 days |
| Uncited claims check | Half a day |
| Filler and low-density content check | Half a day |
| Load-speed hints (`fetchpriority`, prerender, Speculation Rules) | Half a day |
| CrUX trends and LCP breakdown | 1 day |
| Entity check (Wikidata, knowledge panel, consistent profiles) | 2 days |
| Internal link suggestions from the crawl | 2 days |
| Check that hreflang alternates link back | 1 day |
| Google Business Profile comparison (needs Places API) | 2 days |
| Sample reports gallery, with permission | 1 day |
| "State of AI readiness" report and industry benchmarks from anonymised audits (needs real volume) | 1 week |
| WebMCP detection (standard still experimental) | Half a day |

## Not doing

| Item | Why |
|---|---|
| Keyword databases, backlink indexes, rank tracking | Semrush and Ahrefs own these and the data is expensive |
| Shopify app | Crowded: several apps at about $14.50 to $19/mo. Revisit if Shopify users ask |
| FAQ builder with FAQPage schema | Google stopped showing FAQ rich results on 2026-05-07 |
| AI rewriting of answers for AI search | Google's AI guide says rewriting content for AI isn't needed |
