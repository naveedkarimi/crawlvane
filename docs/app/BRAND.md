# Crawlvane brand guide

The name, tagline and links live in `lib/brand.ts`. Colours, type and spacing live at the top of `app/globals.css`. Change them there and the whole app follows.

> **Before you commit to the name:** Crawlvane was chosen on 2026-11-08. On that date crawlvane.com, crawlvane.ai and crawlvane.io were unregistered and the GitHub username was free. Still to do before spending money: a trademark search (USPTO, plus CIPO if you're in Canada), social handles, and buying the domain. The name comes from `NEXT_PUBLIC_APP_NAME` (see `lib/brand.ts`).

## Positioning

- **One line:** Get found on search engines and in AI. Say "search engines", not "Google", in marketing copy; name Google only for facts about Google itself
- **What it is:** a website audit for search engines, answer engines and AI assistants that hands you the fixes.
- **Difference:** most AI visibility tools only track numbers. Crawlvane tells you what to change and gives you the code.
- **Voice:** plain, confident, practical. Short sentences. No hype, no guarantees about rankings or citations.

## Design system v2.0 (current, 2026-11-10)

The source files are in `design/Design System 2.0/`: the brand guide, foundations, components, screens, dashboard, `crawlvane-tokens.css` and every logo file. The teal v1.0 files are kept in `design/Design System 2.0/archive/v1-teal/`. The app's tokens at the top of `app/globals.css` come from `crawlvane-tokens.css`, keeping the app's own meaning for `--surface` (alternate sections) and `--surface-2` (tracks and wells).

## Logo

The C-Vane: an open ring that forms the C and echoes the score ring, with a needle pointing up and to the right.

- Light backgrounds: Vane Blue ring (`#235789`), Signal Red needle (`#C1292E`). Dark backgrounds: Paper ring (`#FDFFFC`), the same Signal Red needle
- In the app: `components/Logo.tsx` draws the mark; set `--logo-ring` and `--logo-needle` to recolour it. Dark sections already do this (see "Dark sections" in `app/globals.css`)
- Favicon: `public/icon.svg` (the 32 px tile version). iOS: `public/apple-touch-icon.png`, rendered from `app-icon.svg` with square corners
- Wordmark: "Crawlvane" in Figtree Bold, letter-spacing -0.03em
- Clear space: half the mark's height. Minimum size: 20 px for the mark, 96 px for the lockup
- Most logo SVG files carry C2PA content credentials. Keep them when you copy the files. The dark-background files, favicons and app icon were recoloured from the design's `#E0484D` needle to `#C1292E` on 2026-11-11, which removed their credentials

### Logo files on the site

| File | Use |
|---|---|
| `/brand/crawlvane-lockup.svg`, `-dark-bg`, `-mono`, `-mono-white` | Full logo for documents and partners |
| `/brand/crawlvane-lockup.png`, `-dark-bg.png` | Full logo where SVG isn't accepted (908 px wide) |
| `/brand/crawlvane-mark*.svg`, `crawlvane-mark-512.png` | The mark alone, for avatars and social profiles |
| `/brand/crawlvane-wordmark*.svg` | The name alone |
| `/brand/app-icon.svg`, `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` | App icons and the web app manifest (`app/manifest.ts`) |
| `/favicon.ico` (16, 32, 48 px), `/icon.svg`, `/favicon-16.svg`, `/apple-touch-icon.png` | Browser tabs and phone home screens |
| `/icon-512.png` | Organization logo in structured data |

The PNGs and `favicon.ico` are rendered from the SVGs with `sharp`. Re-render them whenever the logo SVGs change.

## Status colours

Audit results use their own colours, never brand red or brand blue, and always come with an icon and a word: `--good` #2E7A30, `--warn` #A35400, `--bad` #B42318, `--info` #6B3FA0 (purple, so it can't be mistaken for a link or button), plus `-bg` and `-solid` versions for backgrounds, bars and rings.

## Colour: "Vane Blue / Signal Red / Paper" (2026-11-10)

| Token | Value | Use |
|---|---|---|
| `--cta`, `--link` | #235789 Vane Blue | Buttons, links, focus rings. The header Sign in is white with a white arrow in a Signal Red circle |
| `--ink` | #122E49 Deep Navy | Dark sections, home hero, footer, dashboard sidebar |
| `--signal` | #235789 on light, #8BB2DC on dark | Accent fills and icons: checks, step icons, progress |
| `--signal-2`, `--secondary` | #C1292E Signal Red | Logo needle and brand moments: the "and in AI." headline line, kickers, sparkles, feature and menu icons, step circles, the selected tab underline, the Sign in arrow and the dashboard's selected sidebar item. Never for scores, checks, alerts or result filters |
| `--gold` | #F8E16C Straw Gold | Highlights only |
| `--bg` | #FDFFFC Paper | Page background |
| `--surface` | #F1F5FA Pale Blue | Alternate sections |
| `--text` | #0F1E2D | Body text and headings |

Red means "brand" here, but audits also use red for failures, so keep Signal Red away from scores. Use the one red, `#C1292E`, at full strength everywhere: no lighter shades, pink tints or see-through versions, on light or dark backgrounds. The "AI-powered" badge is red text on white.

## Colour: "Tropical Fusion" (2026-11-06, previous)

| Token | Value | Use |
|---|---|---|
| `--cta` | #156064 Stormy Teal | Buttons, links on dark |
| `--ink` | #0C3B3E | Dark sections, home hero, footer |
| `--signal` | #00C49A Mint Leaf | Accent: icons, "Get cited by AI.", checks |
| `--signal-2` | #00765D | Small accent text (contrast on white) |
| `--gold` | #F8E16C Straw Gold | Highlights only (kickers on dark, sparkles) |
| `--surface` | #F2FAF7 | Alternate sections |
| `--text` | #0F2F31 | Body text and headings |

Buttons stay teal, not bright, on purpose.

## Colour: "Rustic Autumn", refined (previous)

Lighter and cleaner than the first version: mostly white, a very light cream for alternate sections, espresso for text and buttons, Golden Chestnut only as a small accent (icons, kickers, the "Get cited by AI." headline).

| Token | Value | Use |
|---|---|---|
| `--bg` | #FFFFFF | Page background, cards |
| `--surface` | #FAF6F1 | Alternate sections, soft cards |
| `--text` | #3B2016 | Body text and headings |
| `--cta` | #5E3023 | Buttons (white text 11:1) |
| `--ink` | #3B2016 | Dark sections and footer |
| `--signal` | #C08552 | Small accents only |

The original palette below is kept for reference.


| Token | Hex | Use |
|---|---|---|
| Golden Chestnut (`--signal`) | `#C08552` | Logo lens, icons, check circles, glows |
| Large chestnut (`--accent-lg`) | `#A86B3A` | The chestnut headline ("Get cited by AI.") on light backgrounds |
| Deep chestnut (`--cta`) | `#9C5F30` | Button fill |
| Small accent text (`--signal-2`, `--link`) | `#8F5629` | Section labels, links |
| Espresso (`--ink`, `--espresso`) | `#5E3023` | Dark sections, footer, logo background, step numbers |
| Linen (`--linen`, `--surface`) | `#F3E9DC` | Alternate sections, cards, logo spark, light text on dark |
| Text | `#2E1A13` | Headings and body text |
| Good / Warn / Bad | `#067647` / `#B54708` / `#D92D20` | Audit statuses only |

**Why some text uses deeper chestnut:** Golden Chestnut `#C08552` is only 3.1:1 against white and 2.6:1 against Linen, below WCAG AA for text. The deeper shades keep the same hue and pass (buttons 5.1:1 with white text, small text 5.0:1 on Linen). To use the exact Golden Chestnut on buttons anyway, set `--cta: #c08552` in `app/globals.css`.

## Navigation (2026-11-11)

- **Header menu, in order:** Product ▾ · Solutions ▾ · Free tools ▾ · Resources ▾ · Pricing. Product holds only things you can use (Audit a website: Page check, Full site report, Bulk audit; Audit an app: App Check; For developers: API), with "See all features" at the bottom. Solutions is who it's for. Resources is Learn (Blog and guides, FAQ) and Help (Contact). "How it works" isn't in the menu: it's a home page section and is repeated on `/features`. This follows how Ahrefs, Semrush, Peec AI, Profound and Otterly organise theirs (checked 2026-11-11). Phones get the same groups as expandable sections.
- **Footer columns:** Product, Solutions, Free tools, Resources, in the menu order, plus All features, Pricing and llms.txt. They come from the same list as the header, `components/navLinks.ts`, so change menus there.
- **Home page, in order:** hero with the audit box, engines strip, How it works, the report, the three pillars, a real example, pricing, FAQ. The features grid and "Who it's for" live on `/features`, and the newsletter signup is on the blog.

## Type

- **Figtree** for headings, weight 600
- **DM Sans** for body text, 16 px, line-height 1.6
- **Geist Mono** for code and crawler names
- All three load with `next/font` in `app/layout.tsx`

## Components

- Buttons: fully rounded pill shape (`--r-pill`), like the header Sign in, with sentence-case labels. The hero search box, the Page check / Full site report switch and email boxes next to a button are pills too. Tabs, sidebar items and list rows keep their own shapes. Heights 48 px (default), 44 px (`.btn-sm`) and 56 px (`.btn-lg`, hero). Vane Blue primary, outlined secondary
- Radius: `--r-sm` 6 px, `--r` 10 px (buttons, inputs), `--r-lg` 16 px (cards), `--r-pill` for chips and badges only. Inputs are 48 px tall (56 px for the big URL field)
- Tabs: a 3 px Vane Blue underline and bold text on the selected tab, so it doesn't rely on colour
- Icons: Lucide at stroke width 2, using `currentColor`
- Text: never below 12 px. Scores use Figtree 800 with tabular figures
- Photos: real people working (Pexels, Unsplash), never as the hero. The hero shows the product.

## Photos in use

- **Product shots are real.** `public/images/app-*.webp` are screenshots of a real Crawlvane page check of naveedkarimi.com (2026-11-11): `app-product-shot.webp` shows the scores and What AI sees, `app-example-issues.webp` the issues. The home page numbers in `app/(site)/page.tsx` must match them. Re-capture them after big UI changes.
- **People photos come from Pexels** (free commercial use, no attribution needed). The list with photo links is in `FEATURES.md`, section 6.
- To add more: download from pexels.com or unsplash.com, resize to about 1200 px wide, save as JPG under 150 KB in `public/images/`, and add a row to that table.

---|---|---|
| `public/images/teamwork-pexels.jpg` | Pexels | "Who it's for" section |
| `public/images/seo-analytics-unsplash.jpg` | Unsplash | "How it works" section |

Both licences allow free commercial use without attribution. To add more, download from pexels.com or unsplash.com, resize to about 1400 px wide, save as JPG under 200 KB in `public/images/`, and add a row here.

---

## Prompt for Claude Design

Paste this if you want to explore other brand directions in Claude Design. It describes the product, so you can drop the current Crawlvane choices and ask for alternatives.

```
Design a brand identity and marketing website for a SaaS product.

PRODUCT
A website audit tool for the AI-search era. You enter a URL and it checks whether the
site is ready for:
- SEO: Google and Bing can crawl, index and rank it
- AEO (answer engines): featured snippets, voice assistants and Google AI Overviews can
  lift direct answers from it
- GEO (generative engines): ChatGPT, Claude, Perplexity and Gemini can read, trust and
  cite it
It runs about 50 checks, scores each area 0 to 100, shows which AI crawlers are blocked in
robots.txt, and generates ready-to-paste fixes (robots.txt, llms.txt, JSON-LD schema)
plus an AI-written fix plan. Full-site crawls and competitor comparison are included.

POSITIONING
Most AI visibility tools (Otterly, Peec AI, Profound) only track numbers. This one tells
you what to change and hands you the fix. Free during launch; Pro and Agency plans
(monitoring, AI visibility tracking, white-label reports, embeddable audit widget) later.

AUDIENCE
Small business owners, marketers, SEO consultants and agencies. They want to look
credible to clients, so the brand must feel like an established software company, not
a side project.

WORKING NAME AND TAGLINE
"Crawlvane" - "Get found on Google. Get cited by AI." Suggest 5 alternative names too
(short, ownable, .com or .ai plausible), with a one-line rationale each.

BRAND DELIVERABLES
1. Logo: mark plus wordmark, light and dark versions, favicon at 32 px
2. Use this palette ("Rustic Autumn"): Linen #F3E9DC (warm backgrounds), Golden Chestnut
   #C08552 (accent), Espresso #5E3023 (dark sections, footer). Add neutrals and status
   colours (pass, warning, fail) for audit results, and keep button text at WCAG AA
   contrast
3. Type pairing (one sans family plus a mono for code and crawler names)
4. Voice: 5 do and don't examples. Plain, confident, no hype, never promise rankings

WEBSITE (desktop and mobile)
Warm, friendly and professional: linen hero with a wavy bottom edge, pill-shaped
buttons and inputs, rounded 24 px cards, big faint numbers on cards, espresso sections
with a soft chestnut glow, lots of whitespace. Pages:
1. Home:
   - Hero with headline and a large URL input as the main action
     (tabs: "Page check" / "Full site report")
   - Strip naming the engines covered: Google, Bing, ChatGPT, Claude, Perplexity,
     Gemini, AI Overviews
   - Product section with a realistic report mockup: overall score ring, SEO / Answer /
     AI bars, 3 check rows (fail, warn, pass), AI crawler chips, a code block with a fix
   - Dark section with three pillars: Search-ready, Answer-ready, AI-ready
   - How it works in 3 steps
   - Feature grid (6 features with icons)
   - Who it's for (site owners, consultants, agencies) beside a team photo
   - FAQ accordion
   - Final call to action band
   - Footer with Product, Resources and Company columns
2. Pricing: Launch ($0, available now), Pro (coming soon), Agency (coming soon), plus a
   "Done for you" implementation row and a short FAQ
3. Report page: score summary, category cards, tabs (Overview, Issues, Pages,
   Competitors, Fixes, AI plan), issue rows with status pills and a highlighted fix box

RULES
- Accessible contrast (WCAG AA), visible focus states
- No fake testimonials, customer logos or usage numbers
- Use real-looking but generic data in mockups (yourbusiness.com)
- Photos only where they support the message, never as the hero
```
