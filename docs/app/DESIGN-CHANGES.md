# Design changes to bring back into Design System 2.0

The live site (`app/globals.css`) has moved on from the files in `design/Design System 2.0/`. These are the changes, as of 2026-11-11, so the design files can be updated to match. Tokens are the ones in `crawlvane-tokens.css`.

## 1. Colour rules

**Signal Red is one colour.** Use `#C1292E` at full strength everywhere, on light and dark backgrounds. Drop the lighter reds for dark backgrounds (`#E0484D`, `#E67F82`), the pale tints (`--red-50` to `--red-300`) and any see-through red.

- The logo needle is `#C1292E` on dark backgrounds too. The dark-background logo files, favicons and app icon were recoloured from `#E0484D`.
- Red is a brand accent only. It is never used for scores, checkmarks, progress, alerts or result filters, because red already means "failed" there.

**Where red is used:**

| Element | How |
|---|---|
| Logo needle | `#C1292E` on every background |
| Home hero headline, second line ("and in AI.") | Solid `#C1292E` text on the navy hero |
| Section kickers on light pages, and the sparkles beside page titles | `#C1292E` |
| Feature, tool-card and menu icons | Solid `#C1292E` circle (or 10 px rounded square in menus) with a white icon |
| Selected tab underline | 3 px `#C1292E`. Exception: tabs that filter by result (Failed, Warnings) keep a Vane Blue underline |
| Dashboard sidebar, selected item | 3 px `#C1292E` bar on the item's left edge |
| "AI-powered" badge next to the logo | `#C1292E` text on a white pill (thin `--line` border on light backgrounds) |
| Arrow in buttons (see "Arrow circle" below) | White arrow in a solid `#C1292E` circle |

**Tried and rejected, so don't add:** red kicker dashes on dark sections, red pillar icons, a red border on the featured pricing card, a red FAQ open icon, and red side bars on callout boxes.

**Accent on light vs dark.** `--signal` is Vane Blue `#235789` on light backgrounds and pale blue `#8BB2DC` inside dark sections (footer, home hero, dashboard sidebar, mobile menu).

**Home hero uses solid colours, not see-through ones:**
- Page check / Full site report switch: solid `--ink-2` background with a `--ink-3` border.
- The Run audit button stays solid Vane Blue, even while the URL box is empty (no faded disabled state).

## 2. Shape

- **Every button is a pill** (`border-radius: 999px`), at its existing height. So are the hero search box, the Page check / Full site report switch, and any email field that sits next to a button.
- **Kept as they were:** tabs, dashboard sidebar items, list rows and cards.
- The phone menu button is a circle.

## 3. Components

**Arrow circle.** This is the signature button detail: a 28 px solid `#C1292E` circle with a white arrow (14 px, stroke 2.5) at the end of the button label. The button's right padding drops to 4–6 px so the circle sits evenly inside the pill's rounded end. On hover the arrow turns 45°. It's used on:
- Header Sign in
- Pricing buttons
- "Run a free audit" in the band above the footer

**Header Sign in button.** A white pill, 40 px tall, 0.875 rem semibold navy (`--ink`) text, padding `0 6px 0 18px`, with the arrow circle (an up-right arrow). On light pages it has a 1 px `--line` border and a small shadow; over the dark hero it has a white border. On hover the background turns `--blue-50`.

**Header menu.** Product ▾ · Solutions ▾ · Free tools ▾ · Resources ▾ · Pricing.
- Each drop-down is a white panel with 24 px corners.
- Items are grouped under small uppercase red titles.
- Each item has a 34 px red icon tile, a bold label and a two-line grey description.
- A footer link sits below a divider (for example "See all features →").
- On phones, each menu becomes an expandable section on the navy panel.

**Band above the footer.**
- Full width, one flat colour: Vane Blue `#235789`. No gradient or decoration; it must look clearly different from the navy footer.
- 36 px top and bottom padding.
- Content: gold uppercase kicker, white heading at about 1.75 rem, a one-line `--blue-100` sub-line, then a white pill button with the arrow circle and an outlined light pill button.

**Footer.**
- Logo, tagline and two round icon links.
- Four columns: Product, Solutions, Free tools, Resources.
- Bottom row: copyright on the left, Privacy · Terms · Accessibility · Credits on the right.
- No newsletter and no disclaimer line.

**Newsletter box (blog pages only).** A light `--surface` card with 16 px corners, holding:
- A 48 px solid red circle with a white mail icon
- The title "Get new guides by email" and one line of text
- A pill email field with a Vane Blue Subscribe button

**Pricing cards (light page).** The original layout, fine-tuned:
- White cards with 24 px corners and a small shadow that grows on hover.
- The highlighted plan has a Vane Blue border plus a 1 px Vane Blue ring.
- The price is set in the display font at 2.6 rem.
- Check marks are 20 px circles: a `--blue-50` fill with a Vane Blue check.
- Buttons are pills with the arrow circle: primary for the highlighted plan, outlined for the others.

**Pricing cards (dark home section).**
- Faint navy cards; the highlighted plan has a pale-blue tint and border.
- A green "Available now" badge.
- Round check marks: a light-blue tint with a pale-blue check.

**Sign-in card.** A white card, 420 px wide, with 24 px corners and a large shadow, containing:
1. Social buttons as white outlined pills with each company's logo: "Continue with Google", "Continue with Microsoft" and "Continue with GitHub".
2. An "or" divider.
3. An "Email" label, a pill email field and a primary "Continue with email" button.
4. A line of small print.

The second step shows a round mail icon, the heading "Check your email", a centred code field in the mono font (large, letter-spaced), a "Sign in" button, and two links: "Use a different email" and "Send a new code".

**FAQ.** The "Still have a question?" card is gone. The left column is only the kicker, heading and intro.

## 4. Copy and structure

- **Tagline:** "Get found on search engines and in AI." (changed from "… Get cited by AI." on 2026-11-13). On the home hero and share image it splits after "engines", with "and in AI." in red. Say "search engines" in marketing copy, and name Google only for facts about Google itself.
- **Home page order:**
  1. Hero with the audit box
  2. Engines strip
  3. How it works
  4. The report
  5. Three pillars
  6. Real example
  7. Pricing
  8. FAQ

  The features grid and "Who it's for" moved to a new Features page.
- **Example screenshots:** these are a real audit of naveedkarimi.com (overall 90, SEO 99, answers 69, AI search 93).
