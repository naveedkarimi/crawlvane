/**
 * Accessibility (ADA / WCAG 2.2) checks that can be read from a page's HTML.
 * Automated checks find only part of the problems (roughly a third, by most estimates);
 * contrast in context, keyboard use and screen-reader flow need a browser and a person.
 */
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { ToolCheck } from "./pageTools";

export interface A11yCheck extends ToolCheck { wcag: string }
export interface A11yReport { score: number; checks: A11yCheck[]; counts: { images: number; fields: number; buttons: number; links: number } }

const text = ($: cheerio.CheerioAPI, el: Element) => $(el).text().replace(/\s+/g, " ").trim();
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function a11yReport(html: string): A11yReport {
  const $ = cheerio.load(html || "");
  const checks: A11yCheck[] = [];
  const add = (c: A11yCheck) => checks.push(c);
  const labelled = (el: Element) => {
    const $el = $(el);
    if ($el.attr("aria-label")?.trim() || $el.attr("title")?.trim()) return true;
    const by = $el.attr("aria-labelledby");
    if (by && by.split(/\s+/).some((id) => $(`[id="${id}"]`).length)) return true;
    return false;
  };

  // Language and title (3.1.1, 2.4.2)
  const lang = $("html").attr("lang")?.trim();
  add(lang
    ? { status: "pass", title: "Page language", detail: `lang="${lang}"`, wcag: "3.1.1" }
    : { status: "fail", title: "Page language", detail: "No lang attribute on <html>, so screen readers may read the page in the wrong voice.", fix: '<html lang="en">', wcag: "3.1.1" });
  const title = $("title").first().text().trim();
  add(title
    ? { status: "pass", title: "Page title", detail: `"${title.slice(0, 70)}"`, wcag: "2.4.2" }
    : { status: "fail", title: "Page title", detail: "No <title>. It's the first thing a screen reader announces.", fix: "Add a title that says what the page is.", wcag: "2.4.2" });

  // Zoom (1.4.4)
  const vp = ($('meta[name="viewport" i]').attr("content") ?? "").toLowerCase();
  const maxScale = Number(vp.match(/maximum-scale\s*=\s*([\d.]+)/)?.[1] ?? 10);
  add(/user-scalable\s*=\s*(no|0)/.test(vp) || maxScale < 2
    ? { status: "fail", title: "Zoom allowed", detail: `The viewport tag blocks zooming (${vp}). People with low vision can't enlarge the text on phones.`, fix: 'Use <meta name="viewport" content="width=device-width, initial-scale=1"> without user-scalable=no or maximum-scale.', wcag: "1.4.4" }
    : { status: "pass", title: "Zoom allowed", detail: "Pinch-zoom isn't blocked.", wcag: "1.4.4" });

  // Images (1.1.1)
  const imgs = $("img").toArray();
  const noAlt = imgs.filter((e) => $(e).attr("alt") === undefined && $(e).attr("role") !== "presentation" && $(e).attr("aria-hidden") !== "true" && !labelled(e));
  const fileAlt = imgs.filter((e) => /\.(jpe?g|png|gif|webp|svg|avif)$|^(img|image|photo|picture)[-_ ]?\d*$/i.test(($(e).attr("alt") ?? "").trim()));
  add(!imgs.length
    ? { status: "info", title: "Image text alternatives", detail: "No images in the HTML.", wcag: "1.1.1" }
    : noAlt.length
      ? { status: "fail", title: "Image text alternatives", detail: `${noAlt.length} of ${imgs.length} images have no alt attribute, e.g. ${$(noAlt[0]).attr("src")?.slice(0, 80) ?? "(no src)"}.`, fix: 'Describe each meaningful image in alt="…"; use alt="" for decorative ones so screen readers skip them.', wcag: "1.1.1" }
      : fileAlt.length
        ? { status: "warn", title: "Image text alternatives", detail: `${fileAlt.length} images use a file name or "image" as alt text, e.g. "${$(fileAlt[0]).attr("alt")}".`, fix: "Write what the image shows or does instead.", wcag: "1.1.1" }
        : { status: "pass", title: "Image text alternatives", detail: `All ${imgs.length} images have an alt attribute.`, wcag: "1.1.1" });

  // Forms (1.3.1, 4.1.2)
  const fields = $("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), select, textarea")
    .toArray()
    .filter((f) => !$(f).closest('[aria-hidden="true"], [hidden], [inert]').length && !($(f).attr("aria-hidden") === "true" && $(f).attr("tabindex") === "-1"));
  const unlabelled = fields.filter((f) => {
    const id = $(f).attr("id");
    return !labelled(f) && !(id && $(`label[for="${id}"]`).length) && !$(f).closest("label").length;
  });
  add(!fields.length
    ? { status: "info", title: "Form labels", detail: "No form fields in the HTML.", wcag: "1.3.1" }
    : unlabelled.length
      ? { status: "fail", title: "Form labels", detail: `${unlabelled.length} of ${plural(fields.length, "field")} have no label (a placeholder isn't one).`, fix: "Give each field a <label for> or aria-label.", wcag: "1.3.1" }
      : { status: "pass", title: "Form labels", detail: `All ${plural(fields.length, "field")} are labelled.`, wcag: "1.3.1" });

  // Buttons and links (4.1.2, 2.4.4)
  const buttons = $("button, [role=button], input[type=submit], input[type=button]").toArray();
  const nameless = buttons.filter((b) => !text($, b) && !labelled(b) && !$(b).attr("value") && !$(b).find("img[alt]:not([alt=''])").length);
  add(!buttons.length
    ? { status: "info", title: "Button names", detail: "No buttons in the HTML.", wcag: "4.1.2" }
    : nameless.length
      ? { status: "fail", title: "Button names", detail: `${nameless.length} of ${plural(buttons.length, "button")} have no name, so a screen reader just says "button".`, fix: 'Add text or aria-label, e.g. aria-label="Open menu".', wcag: "4.1.2" }
      : { status: "pass", title: "Button names", detail: `All ${plural(buttons.length, "button")} have a name.`, wcag: "4.1.2" });
  const links = $("a[href]").toArray();
  const emptyLinks = links.filter((a) => !text($, a) && !labelled(a) && !$(a).find("img[alt]:not([alt=''])").length);
  const vague = links.filter((a) => /^(click here|here|read more|more|learn more|link)$/i.test(text($, a)) && !labelled(a));
  add(emptyLinks.length
    ? { status: "fail", title: "Link names", detail: `${emptyLinks.length} of ${plural(links.length, "link")} have no text (often icon links).`, fix: "Give icon links an aria-label and image links a meaningful alt.", wcag: "2.4.4" }
    : vague.length
      ? { status: "warn", title: "Link names", detail: `${vague.length} links only say things like "${text($, vague[0])}", which means nothing out of context.`, fix: 'Say where the link goes: "Read the pricing guide".', wcag: "2.4.4" }
      : { status: links.length ? "pass" : "info", title: "Link names", detail: links.length ? `All ${plural(links.length, "link")} have text.` : "No links in the HTML.", wcag: "2.4.4" });

  // Structure (1.3.1, 2.4.1, 2.4.6)
  const h1 = $("h1").length;
  const levels = $("h1,h2,h3,h4,h5,h6").toArray().map((h) => Number(h.tagName[1]));
  let skips = 0;
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skips++;
  const emptyH = $("h1,h2,h3,h4,h5,h6").toArray().filter((h) => !text($, h) && !$(h).find("img[alt]:not([alt=''])").length).length;
  add(h1 !== 1 || emptyH
    ? { status: h1 === 0 || emptyH ? "fail" : "warn", title: "Headings", detail: [h1 !== 1 && `${h1} H1 headings`, emptyH && `${emptyH} empty headings`, skips && `${skips} skipped levels`].filter(Boolean).join(", ") + ".", fix: "Use one H1, go down one level at a time, and never leave a heading empty. Screen-reader users jump between headings.", wcag: "1.3.1" }
    : skips
      ? { status: "warn", title: "Headings", detail: `${skips} places skip a heading level (e.g. H2 to H4).`, fix: "Go down one level at a time.", wcag: "1.3.1" }
      : { status: "pass", title: "Headings", detail: `One H1 and ${levels.length - 1} other headings in order.`, wcag: "1.3.1" });
  const main = $("main, [role=main]").length;
  const skip = $('a[href^="#"]').toArray().slice(0, 5).some((a) => /skip|jump to|main content/i.test(text($, a)));
  add(main
    ? { status: "pass", title: "Main landmark and skip link", detail: `<main> is marked up${skip ? " and there's a skip link" : ". No skip link, but landmarks let screen-reader users jump to it"}.`, wcag: "2.4.1" }
    : { status: skip ? "warn" : "fail", title: "Main landmark and skip link", detail: skip ? "A skip link but no <main> element." : "No <main> element and no skip link, so keyboard users tab through the whole menu on every page.", fix: 'Wrap the content in <main id="main"> and add <a href="#main">Skip to content</a> as the first link.', wcag: "2.4.1" });

  // Frames and tables (4.1.2, 1.3.1)
  const frames = $("iframe").toArray().filter((f) => $(f).attr("aria-hidden") !== "true");
  const untitled = frames.filter((f) => !$(f).attr("title")?.trim() && !labelled(f));
  if (frames.length)
    add(untitled.length
      ? { status: "fail", title: "Frame titles", detail: `${untitled.length} of ${plural(frames.length, "iframe")} have no title (videos, maps and embeds).`, fix: 'Add title="…" saying what each frame holds, e.g. title="Map of our office".', wcag: "4.1.2" }
      : { status: "pass", title: "Frame titles", detail: `All ${plural(frames.length, "iframe")} have a title.`, wcag: "4.1.2" });
  const tables = $("table").toArray().filter((t) => $(t).attr("role") !== "presentation" && $(t).find("tr").length > 1);
  const noTh = tables.filter((t) => !$(t).find("th").length);
  if (tables.length)
    add(noTh.length
      ? { status: "warn", title: "Table headers", detail: `${noTh.length} of ${plural(tables.length, "table")} have no header cells.`, fix: "Mark the header row or column with <th>.", wcag: "1.3.1" }
      : { status: "pass", title: "Table headers", detail: `All ${plural(tables.length, "data table")} have header cells.`, wcag: "1.3.1" });

  // ARIA and keyboard (4.1.2, 2.4.3, 2.1.1)
  const broken = $("[aria-labelledby], [aria-describedby], [aria-controls]").toArray().filter((e) =>
    ["aria-labelledby", "aria-describedby"].some((a) => {
      const v = $(e).attr(a);
      return v && v.split(/\s+/).some((id) => id && !$(`[id="${id}"]`).length);
    }),
  );
  const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]";
  const reachable = (el: Element) => $(el).is(FOCUSABLE) && $(el).attr("tabindex") !== "-1";
  const hiddenFocus = $('[aria-hidden="true"]').toArray().filter((e) => !$(e).closest("[inert]").length && (reachable(e) || $(e).find(FOCUSABLE).toArray().some(reachable)));
  const posTab = $("[tabindex]").toArray().filter((e) => Number($(e).attr("tabindex")) > 0);
  const aria = [broken.length && `${broken.length} ARIA references point to missing ids`, hiddenFocus.length && `${hiddenFocus.length} aria-hidden areas contain links or buttons keyboard users can still reach`, posTab.length && `${posTab.length} elements use a positive tabindex, which scrambles the tab order`].filter(Boolean) as string[];
  add(aria.length
    ? { status: broken.length || hiddenFocus.length ? "fail" : "warn", title: "ARIA and keyboard order", detail: aria.join("; ") + ".", fix: "Point aria-labelledby/-describedby at real ids, don't put focusable things inside aria-hidden, and use tabindex 0 or -1 only.", wcag: "4.1.2" }
    : { status: "pass", title: "ARIA and keyboard order", detail: "No broken ARIA references, hidden focusable content or positive tabindex.", wcag: "4.1.2" });

  // Media (1.4.2, 1.2.2)
  const autoplay = $("video[autoplay], audio[autoplay]").toArray().filter((m) => m.tagName === "audio" || $(m).attr("muted") === undefined);
  const videos = $("video").toArray();
  const noCaptions = videos.filter((v) => !$(v).find('track[kind="captions"], track[kind="subtitles"]').length && $(v).attr("muted") === undefined);
  if (autoplay.length || videos.length)
    add(autoplay.length
      ? { status: "fail", title: "Media", detail: `${plural(autoplay.length, "audio or video element")} autoplay with sound.`, fix: "Don't autoplay sound; if video must autoplay, mute it and give a pause button.", wcag: "1.4.2" }
      : noCaptions.length
        ? { status: "warn", title: "Media", detail: `${noCaptions.length} of ${plural(videos.length, "video")} have no captions track.`, fix: 'Add <track kind="captions" src="…vtt">. For YouTube embeds, turn on captions there.', wcag: "1.2.2" }
        : { status: "pass", title: "Media", detail: "No autoplaying sound, and videos have captions or are muted.", wcag: "1.4.2" });

  const scored = checks.filter((c) => c.status !== "info");
  const score = Math.round((scored.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / Math.max(1, scored.length)) * 100);
  return { score, checks, counts: { images: imgs.length, fields: fields.length, buttons: buttons.length, links: links.length } };
}
