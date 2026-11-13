/**
 * Single-page tools that work on the raw HTML (what most AI crawlers get):
 * link preview, answer readiness (AEO), page to Markdown and AI agent readiness.
 */
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { answerAfter, QUESTION_START, words } from "../analyze";

export type Tone = "pass" | "warn" | "fail" | "info";
export interface ToolCheck { status: Tone; title: string; detail: string; fix?: string }

const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").replace(/\s+([,.;:!?])(?=\s|$)/g, "$1").trim();
const abs = (u: string, base: string) => {
  try {
    return u ? new URL(u, base).toString() : "";
  } catch {
    return "";
  }
};

/** Main content: <main>, else <article>, else <body>, without page chrome. */
function mainContent($: cheerio.CheerioAPI) {
  $("script,style,noscript,template,svg,iframe").remove();
  const main = $("main").first().length ? $("main").first() : $("article").first().length ? $("article").first() : $("body");
  return main;
}

// ---------------------------------------------------------------- link preview

export interface LinkPreview {
  url: string;
  host: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imageWidth: number | null;
  imageHeight: number | null;
  siteName: string;
  twitterCard: string;
  favicon: string;
  checks: ToolCheck[];
}

export function linkPreview(html: string, pageUrl: string): LinkPreview {
  const $ = cheerio.load(html);
  const meta = (sel: string) => norm($(sel).attr("content"));
  const docTitle = norm($("title").first().text());
  const ogTitle = meta('meta[property="og:title"]');
  const desc = meta('meta[name="description" i]');
  const ogDesc = meta('meta[property="og:description"]');
  const image = abs(meta('meta[property="og:image"]') || meta('meta[property="og:image:url"]') || meta('meta[name="twitter:image" i]'), pageUrl);
  const w = Number(meta('meta[property="og:image:width"]')) || null;
  const h = Number(meta('meta[property="og:image:height"]')) || null;
  const twitterCard = meta('meta[name="twitter:card" i]');
  const favicon = abs($('link[rel~="icon" i]').first().attr("href") ?? "/favicon.ico", pageUrl);
  const title = ogTitle || docTitle;
  const description = ogDesc || desc;

  const checks: ToolCheck[] = [];
  checks.push(
    !docTitle
      ? { status: "fail", title: "Page title", detail: "No <title> tag.", fix: "Add a 30 to 60 character title that says what the page is about." }
      : docTitle.length > 60
        ? { status: "warn", title: "Page title", detail: `${docTitle.length} characters. Google usually cuts titles at about 60 characters (600 pixels).`, fix: "Put the important words first, or shorten it." }
        : { status: "pass", title: "Page title", detail: `${docTitle.length} characters.` },
  );
  checks.push(
    !desc
      ? { status: "warn", title: "Meta description", detail: "None. Google will pick text from the page instead.", fix: "Add a 120 to 160 character summary that makes people want to click." }
      : desc.length > 160
        ? { status: "warn", title: "Meta description", detail: `${desc.length} characters. Google usually cuts at about 155 to 160.`, fix: "Shorten it so the end isn't cut off." }
        : { status: "pass", title: "Meta description", detail: `${desc.length} characters.` },
  );
  checks.push(
    ogTitle && ogDesc
      ? { status: "pass", title: "Open Graph title and description", detail: "Set, so LinkedIn, Facebook, Slack and WhatsApp show your own wording." }
      : { status: "warn", title: "Open Graph title and description", detail: `Missing ${[!ogTitle && "og:title", !ogDesc && "og:description"].filter(Boolean).join(" and ")}. Platforms fall back to the page title and description, or guess.`, fix: 'Add <meta property="og:title"> and <meta property="og:description">.' },
  );
  checks.push(
    !image
      ? { status: "fail", title: "Share image", detail: "No og:image. Shared links show no picture, or a random one.", fix: 'Add a 1200 × 630 pixel image: <meta property="og:image" content="https://...">.' }
      : !/^https:/i.test(image)
        ? { status: "warn", title: "Share image", detail: "The image URL isn't https. Some platforms won't load it.", fix: "Serve the image over https." }
        : w && h && (w < 600 || Math.abs(w / h - 1.91) > 0.25)
          ? { status: "warn", title: "Share image", detail: `Declared as ${w} × ${h}. The recommended size is 1200 × 630 (ratio 1.91:1); other shapes get cropped.`, fix: "Use a 1200 × 630 pixel image." }
          : { status: "pass", title: "Share image", detail: w && h ? `${w} × ${h}.` : "Set. Add og:image:width and og:image:height so platforms can show it straight away." },
  );
  checks.push(
    twitterCard
      ? { status: "pass", title: "X (Twitter) card", detail: `twitter:card is "${twitterCard}".` }
      : { status: "warn", title: "X (Twitter) card", detail: "No twitter:card tag, so X shows a small preview or none.", fix: '<meta name="twitter:card" content="summary_large_image">' },
  );
  const ogUrl = meta('meta[property="og:url"]');
  const canonical = abs($('link[rel="canonical" i]').attr("href") ?? "", pageUrl);
  if (ogUrl && canonical && ogUrl.replace(/\/$/, "") !== canonical.replace(/\/$/, ""))
    checks.push({ status: "warn", title: "og:url and canonical differ", detail: `og:url is ${ogUrl} but the canonical is ${canonical}. Shares and likes can be split between them.`, fix: "Make og:url the same as the canonical URL." });

  let host = "";
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  return { url: pageUrl, host, title, description, image, imageAlt: meta('meta[property="og:image:alt"]'), imageWidth: w, imageHeight: h, siteName: meta('meta[property="og:site_name"]'), twitterCard, favicon, checks };
}

// ---------------------------------------------------------------- answer readiness

export interface AnswerRow {
  heading: string;
  level: number;
  answer: string;
  words: number;
  verdict: "good" | "long" | "short" | "missing";
}

export interface AnswerReport {
  questions: AnswerRow[];
  /** H2/H3 headings that aren't questions, as candidates to rephrase. */
  otherHeadings: string[];
  lead: { text: string; words: number };
  lists: number;
  tables: number;
  faqSchema: boolean;
  score: number;
  checks: ToolCheck[];
}

export function answerReadiness(html: string): AnswerReport {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  $('script[type="application/ld+json" i]').each((_, el) => {
    const t = $(el).contents().text();
    for (const m of t.matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) for (const x of m[1].matchAll(/"([^"]+)"/g)) types.add(x[1]);
  });
  const main = mainContent($);
  main.find("nav,header,footer,aside,form").remove();

  const questions: AnswerRow[] = [];
  const otherHeadings: string[] = [];
  main.find("h2,h3,h4,h5,h6").each((_, el) => {
    const text = norm($(el).text());
    if (!text) return;
    const level = Number((el as Element).tagName.slice(1));
    if (text.endsWith("?") || QUESTION_START.test(text)) {
      const answer = answerAfter($, el as AnyNode);
      const n = words(answer);
      questions.push({ heading: text, level, answer: answer.slice(0, 400), words: n, verdict: n === 0 ? "missing" : n < 8 ? "short" : n > 90 ? "long" : "good" });
    } else if (level <= 3 && otherHeadings.length < 8) otherHeadings.push(text);
  });
  const firstPara = main.find("p").map((_, p) => norm($(p).text())).get().find((t) => words(t) >= 5) ?? "";
  const leadWords = words(firstPara);
  const lists = main.find("ul,ol").length;
  const tables = main.find("table").length;
  const faqSchema = ["FAQPage", "QAPage", "HowTo"].some((t) => types.has(t));
  const good = questions.filter((q) => q.verdict === "good").length;

  const checks: ToolCheck[] = [
    questions.length >= 3
      ? { status: "pass", title: "Question headings", detail: `${questions.length} headings are phrased as questions.` }
      : { status: questions.length ? "warn" : "fail", title: "Question headings", detail: `${questions.length} heading${questions.length === 1 ? " is" : "s are"} phrased as a question.`, fix: "Rephrase key subheadings as the questions people ask, e.g. \"How much does it cost?\"." },
    questions.length === 0
      ? { status: "info", title: "Direct answers", detail: "No question headings to check." }
      : good / questions.length >= 0.7
        ? { status: "pass", title: "Direct answers", detail: `${good} of ${questions.length} questions have a short answer right under them.` }
        : { status: good ? "warn" : "fail", title: "Direct answers", detail: `${good} of ${questions.length} questions have a short answer (8 to 90 words) right under them.`, fix: "Put a 40 to 60 word answer directly under each question, then add detail." },
    leadWords >= 20 && leadWords <= 120
      ? { status: "pass", title: "Answer-first opening", detail: `The first paragraph is ${leadWords} words.` }
      : { status: "warn", title: "Answer-first opening", detail: leadWords ? `The first paragraph is ${leadWords} words.` : "No opening paragraph found in the HTML.", fix: "Open with a 2 to 4 sentence summary that answers the page's main question." },
    lists + tables > 0
      ? { status: "pass", title: "Lists and tables", detail: `${lists} list${lists === 1 ? "" : "s"} and ${tables} table${tables === 1 ? "" : "s"} in the content.` }
      : { status: "warn", title: "Lists and tables", detail: "None in the main content.", fix: "Use numbered steps, bullet lists and comparison tables; answer engines lift them directly." },
    { status: "info", title: "FAQ or Q&A markup", detail: `${faqSchema ? "Found" : "None"}. Reported, not scored: Google no longer shows FAQ or HowTo rich results, and the markup is safe to keep.` },
  ];
  const scored = checks.filter((c) => c.status !== "info");
  const score = Math.round((scored.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / scored.length) * 100);
  return { questions: questions.slice(0, 30), otherHeadings, lead: { text: firstPara.slice(0, 500), words: leadWords }, lists, tables, faqSchema, score, checks };
}

// ---------------------------------------------------------------- page to Markdown

export interface MarkdownResult {
  title: string;
  markdown: string;
  words: number;
  /** Rough token count (about 0.75 words per token for English). */
  tokens: number;
  source: "main" | "article" | "body";
}

export function pageToMarkdown(html: string, pageUrl: string): MarkdownResult {
  const $ = cheerio.load(html);
  const title = norm($("title").first().text());
  const source = $("main").length ? "main" : $("article").length ? "article" : "body";
  const root = mainContent($);
  root.find("nav,header,footer,aside,form,button,dialog,[hidden],[aria-hidden=true]").remove();

  const inline = (el: AnyNode): string => {
    if (el.type === "text") return (el as unknown as { data: string }).data.replace(/\s+/g, " ");
    if (el.type !== "tag") return "";
    const e = el as Element;
    const kids = () => e.children.map(inline).join("");
    switch (e.tagName) {
      case "br": return "\n";
      case "strong": case "b": { const t = kids().trim(); return t ? `**${t}**` : ""; }
      case "em": case "i": { const t = kids().trim(); return t ? `*${t}*` : ""; }
      case "code": return `\`${$(e).text()}\``;
      case "a": {
        const t = kids().trim();
        const href = abs(e.attribs.href ?? "", pageUrl);
        return t && href && !href.startsWith("javascript:") ? `[${t}](${href})` : t;
      }
      case "img": { const alt = norm(e.attribs.alt); const src = abs(e.attribs.src ?? "", pageUrl); return alt && src ? `![${alt}](${src})` : ""; }
      // Spans and other wrappers are often laid out as separate lines with CSS: keep a space between them.
      default: return ` ${kids()} `;
    }
  };
  const out: string[] = [];
  /** A list and its nested lists as one block of indented lines. */
  const listLines = (list: Element, depth: number): string[] =>
    $(list).children("li").toArray().flatMap((li, i) => {
      const kids = (li as Element).children;
      const isList = (c: AnyNode) => c.type === "tag" && /^(ul|ol)$/.test((c as Element).tagName);
      const t = norm(kids.filter((c) => !isList(c)).map(inline).join(""));
      const nested = kids.filter(isList).flatMap((c) => listLines(c as Element, depth + 1));
      return [...(t ? [`${"  ".repeat(depth)}${list.tagName === "ol" ? `${i + 1}.` : "-"} ${t}`] : []), ...nested];
    });
  const block = (el: AnyNode, depth = 0): void => {
    if (el.type === "text") {
      const t = norm((el as unknown as { data: string }).data);
      if (t) out.push(t);
      return;
    }
    if (el.type !== "tag") return;
    const e = el as Element;
    const tag = e.tagName;
    const text = () => norm(e.children.map(inline).join(""));
    if (/^h[1-6]$/.test(tag)) { const t = text(); if (t) out.push(`${"#".repeat(Number(tag[1]))} ${t}`); return; }
    if (tag === "summary" && $(e).find("h1,h2,h3,h4,h5,h6").length) { e.children.forEach((c) => block(c, depth)); return; }
    if (tag === "p" || tag === "figcaption" || tag === "summary") { const t = text(); if (t) out.push(t); return; }
    if (tag === "pre") { out.push("```\n" + $(e).text().replace(/\n+$/, "") + "\n```"); return; }
    if (tag === "blockquote") { const t = text(); if (t) out.push(t.split("\n").map((l) => `> ${l}`).join("\n")); return; }
    if (tag === "ul" || tag === "ol") {
      const lines = listLines(e, depth);
      if (lines.length) out.push(lines.join("\n"));
      return;
    }
    if (tag === "table") {
      const rows = $(e).find("tr").map((_, tr) => [$(tr).children("th,td").map((__, c) => norm($(c).text()).replace(/\|/g, "\\|")).get()]).get() as string[][];
      if (rows.length) {
        const n = Math.max(...rows.map((r) => r.length));
        const line = (r: string[]) => `| ${Array.from({ length: n }, (_, i) => r[i] ?? "").join(" | ")} |`;
        out.push([line(rows[0]), `| ${Array(n).fill("---").join(" | ")} |`, ...rows.slice(1).map(line)].join("\n"));
      }
      return;
    }
    if (tag === "img") { const t = inline(e); if (t) out.push(t); return; }
    // Containers (div, section, span...): walk children; join loose inline text into one paragraph.
    let buf = "";
    const flush = () => { const t = norm(buf); if (t) out.push(t); buf = ""; };
    for (const c of e.children) {
      const isBlock = c.type === "tag" && /^(h[1-6]|p|ul|ol|pre|blockquote|table|div|section|article|figure|figcaption|details|summary|dl|main|header|footer|li)$/.test((c as Element).tagName);
      if (isBlock) { flush(); block(c, depth); } else buf += inline(c);
    }
    flush();
  };
  root.each((_, el) => block(el));
  const markdown = (title ? `# ${title}\n\nSource: ${pageUrl}\n\n` : "") + out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  const w = words(out.join(" "));
  return { title, markdown, words: w, tokens: Math.round(w / 0.75), source };
}

// ---------------------------------------------------------------- AI agent readiness

export interface AgentReport { score: number; checks: ToolCheck[] }

export function agentReadiness(html: string): AgentReport {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  $('script[type="application/ld+json" i]').each((_, el) => {
    for (const m of $(el).contents().text().matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) for (const x of m[1].matchAll(/"([^"]+)"/g)) types.add(x[1]);
  });
  const bodyText = norm(mainContent(cheerio.load(html)).text());
  const checks: ToolCheck[] = [];

  const landmarks = { main: $("main,[role=main]").length > 0, nav: $("nav,[role=navigation]").length > 0, header: $("header,[role=banner]").length > 0, footer: $("footer,[role=contentinfo]").length > 0 };
  const missing = Object.entries(landmarks).filter(([, v]) => !v).map(([k]) => `<${k}>`);
  checks.push(missing.length === 0
    ? { status: "pass", title: "Page landmarks", detail: "header, nav, main and footer are all marked up, so an agent can find the main content." }
    : { status: landmarks.main ? "warn" : "fail", title: "Page landmarks", detail: `Missing ${missing.join(", ")}.`, fix: "Wrap the page's main content in <main>, menus in <nav>, and use <header> and <footer>." });

  const h1 = $("h1").length;
  checks.push(h1 === 1 ? { status: "pass", title: "One main heading", detail: "Exactly one H1." } : { status: "warn", title: "One main heading", detail: `${h1} H1 headings.`, fix: "Use one H1 that says what the page is for." });

  // Hidden fields (spam honeypots, inert sections) aren't for people or agents, so they don't need a label.
  const fields = $("input,select,textarea").filter((_, el) => {
    const f = $(el);
    if (/^(hidden|submit|button|reset|image)$/i.test(f.attr("type") ?? "")) return false;
    if (f.closest('[aria-hidden="true"], [hidden], [inert]').length) return false;
    return !(f.attr("aria-hidden") === "true" && f.attr("tabindex") === "-1");
  });
  const unlabelled = fields.filter((_, el) => {
    const f = $(el);
    const id = f.attr("id");
    return !(f.attr("aria-label") || f.attr("aria-labelledby") || f.attr("title") || f.closest("label").length || (id && $(`label[for="${id.replace(/"/g, '\\"')}"]`).length));
  });
  checks.push(fields.length === 0
    ? { status: "info", title: "Form labels", detail: "No form fields in the HTML. If your forms are added by JavaScript, check them separately." }
    : unlabelled.length === 0
      ? { status: "pass", title: "Form labels", detail: `All ${fields.length} form fields have a label.` }
      : { status: "fail", title: "Form labels", detail: `${unlabelled.length} of ${fields.length} form fields have no label. A placeholder isn't a label.`, fix: "Give every field a <label for=...> (or aria-label) that says what to enter." });

  const buttons = $("button,[role=button],input[type=submit],input[type=button]");
  const nameless = buttons.filter((_, el) => {
    const b = $(el);
    return !(norm(b.text()) || b.attr("aria-label") || b.attr("aria-labelledby") || b.attr("title") || b.attr("value") || b.find("img[alt]").filter((__, i) => !!norm($(i).attr("alt"))).length);
  });
  checks.push(buttons.length === 0
    ? { status: "info", title: "Button names", detail: "No buttons in the HTML." }
    : nameless.length === 0
      ? { status: "pass", title: "Button names", detail: `All ${buttons.length} buttons say what they do.` }
      : { status: "warn", title: "Button names", detail: `${nameless.length} of ${buttons.length} buttons have no name (often icon-only buttons).`, fix: 'Add visible text or aria-label, e.g. aria-label="Open menu".' });

  const links = $("a[href]");
  const emptyLinks = links.filter((_, el) => {
    const a = $(el);
    return !(norm(a.text()) || a.attr("aria-label") || a.attr("title") || a.find("img").filter((__, i) => !!norm($(i).attr("alt"))).length);
  });
  checks.push(links.length === 0
    ? { status: "warn", title: "Link text", detail: "No links in the HTML, so an agent can't move to other pages without running JavaScript.", fix: "Render your navigation as real <a href> links in the HTML." }
    : emptyLinks.length === 0
    ? { status: "pass", title: "Link text", detail: `All ${links.length} links have text.` }
    : { status: "warn", title: "Link text", detail: `${emptyLinks.length} of ${links.length} links have no text an agent can read.`, fix: "Give icon links an aria-label, and image links a meaningful alt." });

  const hasContact = $('a[href^="mailto:" i],a[href^="tel:" i]').length > 0 || /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{8,}\d/.test(bodyText);
  checks.push(hasContact
    ? { status: "pass", title: "Contact details as text", detail: "An email address or phone number is on the page." }
    : { status: "warn", title: "Contact details as text", detail: "No email address or phone number on this page.", fix: "Show at least one way to contact you as text, or link a Contact page from every page." });

  const price = /(?:[$€£¥₹]\s?\d[\d,.]*|\d[\d,.]*\s?(?:USD|EUR|GBP|CAD|AUD)\b|\bfree\b)/i.test(bodyText);
  checks.push(price
    ? { status: "pass", title: "Prices as text", detail: "Prices (or \"free\") appear as text an agent can compare." }
    : { status: "info", title: "Prices as text", detail: "No prices found. If you sell something, show prices as text, not only in images or after a click." });

  const entity = ["Organization", "LocalBusiness", "Person", "Product", "Service", "Offer", "SoftwareApplication", "WebApplication"].filter((t) => types.has(t) || [...types].some((x) => x.endsWith(t)));
  checks.push(entity.length
    ? { status: "pass", title: "Structured data about you", detail: `Found: ${entity.join(", ")}.` }
    : { status: "warn", title: "Structured data about you", detail: "No Organization, LocalBusiness, Product or Service schema.", fix: "Add JSON-LD that names your business and what you offer; try the free schema generator." });

  const w = words(bodyText);
  checks.push(w >= 250
    ? { status: "pass", title: "Content in the HTML", detail: `${w} words of text arrive without JavaScript.` }
    : { status: w < 50 ? "fail" : "warn", title: "Content in the HTML", detail: `Only ${w} words of text arrive without JavaScript.`, fix: "Render your main content on the server so agents that don't run JavaScript can read it." });

  checks.push({ status: $("html").attr("lang") ? "pass" : "warn", title: "Page language", detail: $("html").attr("lang") ? `lang="${$("html").attr("lang")}"` : "No lang attribute on <html>.", fix: '<html lang="en">' });

  const scored = checks.filter((c) => c.status !== "info");
  const score = Math.round((scored.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / scored.length) * 100);
  return { score, checks };
}
