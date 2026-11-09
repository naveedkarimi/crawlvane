import type { Metadata } from "next";
import DocPage from "@/components/DocPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Accessibility statement",
  description: `How ${BRAND.name} works toward WCAG 2.2 AA, how we test it, and how to tell us about a problem.`,
  alternates: { canonical: "/accessibility" },
};

const UPDATED = "2026-11-06";

const body = `
## Our goal

We want everyone to be able to use ${BRAND.name}, including people who use a screen reader, a keyboard, voice control, zoom or high-contrast settings. We aim to meet the **Web Content Accessibility Guidelines (WCAG) 2.2 at level AA**, the standard referred to under the Americans with Disabilities Act (ADA) and the European Accessibility Act.

## What we've done

- Every page has a skip link, landmarks (header, navigation, main, footer) and headings in order.
- Text and controls meet AA contrast, and links in text are underlined, not shown by colour alone.
- Everything works with a keyboard, focus is visible, and menus close with Escape.
- Form fields have labels, errors are announced, and buttons say what they do.
- Pinch-zoom is never blocked, and pages reflow on small screens without sideways scrolling.
- Animations stop when your device asks for reduced motion.
- Scrollable areas such as code samples and wide tables can be reached with the keyboard.

## How we test

Each release is checked with the axe-core accessibility engine against WCAG 2.2 A and AA rules on every public page, at phone and desktop sizes, and with our own accessibility checker. Automated tools find only part of the problems. Keyboard checks of the main flows are part of each release; a full manual review with screen readers (VoiceOver and NVDA) is planned before we leave launch.

Last automated check: ${new Date(UPDATED + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}, with no WCAG 2.2 AA violations found.

## Known limitations

- Score rings and pass, warning and fail labels use a number, icon or word as well as colour. Tell us if any are unclear.
- Reports include content from other websites (their titles, text and screenshots). We can't make that content accessible.
- Third-party services we link to (such as Google PageSpeed) have their own accessibility.

## Tell us about a problem

If something on ${BRAND.name} is hard to use, [contact us](${BRAND.contactUrl}) and tell us the page and what happened. We aim to reply within two working days and to fix accessibility problems as a priority.
`;

export default function Page() {
  return <DocPage title="Accessibility statement" dek={`How ${BRAND.name} works toward WCAG 2.2 AA, and how to tell us about a problem.`} updated={UPDATED} body={body} />;
}
