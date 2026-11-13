import { callClaude, parseJsonLoose } from "./anthropic";
import type { AuditFacts } from "../types";

/**
 * AI helpers for one checked page: topic coverage, answer rewrites, an FAQ builder, meta tag ideas,
 * "how does AI describe this business?", and content briefs for AI visibility gaps.
 * Every prompt works from the page's own text and says to use [placeholders] instead of inventing facts.
 */
export type HelperKind = "topics" | "answers" | "faq" | "meta";
export const HELPER_KINDS: HelperKind[] = ["topics", "answers", "faq", "meta"];

/** The page facts the helpers need, cleaned and capped so a client can't send a huge prompt. */
export interface PageInput { url: string; title: string; metaDescription: string; outline: { level: number; text: string }[]; textExcerpt: string }

export function pageInput(f: Partial<AuditFacts> & { url?: string }): PageInput {
  const str = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const outline = Array.isArray(f.outline) ? f.outline.slice(0, 60).map((h) => ({ level: Math.min(6, Math.max(1, Number(h?.level) || 2)), text: str(h?.text, 160) })).filter((h) => h.text) : [];
  return { url: str(f.finalUrl ?? f.url, 400), title: str(f.title, 200), metaDescription: str(f.metaDescription, 400), outline, textExcerpt: str(f.textExcerpt, 4000) };
}

export function pageContext(p: PageInput): string {
  return [
    `URL: ${p.url}`,
    `Title: ${p.title || "(none)"}`,
    `Meta description: ${p.metaDescription || "(none)"}`,
    `Headings:\n${p.outline.map((h) => `${"  ".repeat(h.level - 1)}H${h.level} ${h.text}`).join("\n") || "(none)"}`,
    `Page text (excerpt):\n${p.textExcerpt || "(no text in the HTML)"}`,
  ].join("\n\n");
}

const RULES = `Write in plain, friendly English for a small business owner. Use only facts that appear in the page text.
Never invent prices, numbers, names, dates, awards, reviews or claims. Where a real detail is needed but isn't on the page,
write a placeholder in square brackets, like [your price] or [years in business]. Reply with JSON only, no prose before or after.`;

const ask = async <T>(feature: string, task: string, page: PageInput, maxTokens = 6000): Promise<T> => {
  const r = await callClaude({ system: `You are an SEO and answer-engine optimization editor. ${RULES}`, user: `${task}\n\n---\n${pageContext(page)}`, maxTokens, feature, timeoutMs: 120000 });
  return parseJsonLoose<T>(r.text);
};

// ---------- Topic coverage ----------
export interface TopicCoverage { topic: string; questions: { question: string; covered: "yes" | "partly" | "no"; where: string }[]; summary: string }

export async function topicCoverage(page: PageInput): Promise<TopicCoverage> {
  const r = await ask<TopicCoverage>("topic-coverage", `AI search tools split one question into many smaller ones ("query fan-out") and build an answer from pages that cover each.
Work out the main topic this page is about, then list the 8 to 12 sub-questions a searcher would expect a complete page on that topic to answer.
For each, say whether this page answers it: "yes", "partly" or "no", and in "where" name the heading that covers it (or "" if none).
Return {"topic": string, "summary": one sentence on how complete the page is, "questions": [{"question", "covered", "where"}]}.`, page);
  const ok = new Set(["yes", "partly", "no"]);
  return {
    topic: String(r.topic ?? "").slice(0, 160),
    summary: String(r.summary ?? "").slice(0, 400),
    questions: (Array.isArray(r.questions) ? r.questions : []).slice(0, 14).map((q) => ({
      question: String(q.question ?? "").slice(0, 200),
      covered: ok.has(q.covered) ? q.covered : "no",
      where: String(q.where ?? "").slice(0, 160),
    })).filter((q) => q.question),
  };
}

// ---------- Answer rewrites ----------
export interface AnswerRewrite { heading: string; answer: string; words: number }
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export async function answerRewrites(page: PageInput): Promise<AnswerRewrite[]> {
  const r = await ask<{ answers: { heading: string; answer: string }[] }>("answer-rewrites", `Answer engines and AI Overviews quote short, direct answers that sit right under a heading.
For up to 6 of the page's headings that a searcher would ask about (prefer question-style headings; otherwise turn the heading into the question it answers),
write the answer that should open that section: 40 to 60 words, starting with the direct answer, using only facts from the page text.
Return {"answers": [{"heading": the question as it should read, "answer": string}]}.`, page);
  return (Array.isArray(r.answers) ? r.answers : []).slice(0, 6).map((a) => {
    const answer = String(a.answer ?? "").trim().slice(0, 600);
    return { heading: String(a.heading ?? "").slice(0, 160), answer, words: wordCount(answer) };
  }).filter((a) => a.heading && a.answer);
}

// ---------- FAQ builder ----------
export interface FaqItem { question: string; answer: string }
export interface FaqResult { items: FaqItem[]; jsonLd: string; html: string }

const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** FAQPage JSON-LD and plain HTML for a list of questions and answers. */
export function faqMarkup(items: FaqItem[]): { jsonLd: string; html: string } {
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })) }, null, 2);
  const html = [`<section>`, `  <h2>Frequently asked questions</h2>`, ...items.flatMap((i) => [`  <h3>${escHtml(i.question)}</h3>`, `  <p>${escHtml(i.answer)}</p>`]), `</section>`].join("\n");
  return { jsonLd: `<script type="application/ld+json">\n${jsonLd.replace(/</g, "\\u003c")}\n</script>`, html };
}

export async function faqBuilder(page: PageInput): Promise<FaqResult> {
  const r = await ask<{ items: FaqItem[] }>("faq-builder", `Write an FAQ section for this page: the 5 to 7 questions a customer is most likely to ask before buying or acting,
each answered in 1 to 3 sentences using only facts from the page text (placeholders where a fact is missing). Don't repeat questions the page's headings already answer in full.
Return {"items": [{"question": string, "answer": string}]}.`, page);
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, 8).map((i) => ({ question: String(i.question ?? "").trim().slice(0, 200), answer: String(i.answer ?? "").trim().slice(0, 700) })).filter((i) => i.question && i.answer);
  return { items, ...faqMarkup(items) };
}

// ---------- Meta title and description ----------
export const TITLE_MAX = 60;
export const DESC_MIN = 110;
export const DESC_MAX = 160;
export interface MetaIdeas { titles: string[]; descriptions: string[] }

/** Keeps only suggestions that fit what search results show, without duplicates. */
export function fitMeta(r: Partial<MetaIdeas>): MetaIdeas {
  const clean = (list: unknown, ok: (s: string) => boolean) => [...new Set((Array.isArray(list) ? list : []).map((s) => String(s ?? "").replace(/\s+/g, " ").trim()).filter(ok))].slice(0, 4);
  return { titles: clean(r.titles, (s) => s.length >= 15 && s.length <= TITLE_MAX), descriptions: clean(r.descriptions, (s) => s.length >= DESC_MIN && s.length <= DESC_MAX) };
}

export async function metaIdeas(page: PageInput): Promise<MetaIdeas> {
  const r = await ask<MetaIdeas>("meta-writer", `Suggest a better title tag and meta description for this page.
Titles: 5 options, each 30 to ${TITLE_MAX} characters, with the main topic first and the brand last if it fits.
Descriptions: 5 options, each ${DESC_MIN + 10} to ${DESC_MAX - 5} characters, saying what the page offers and why to click, with no quotation marks.
Count characters carefully. Return {"titles": string[], "descriptions": string[]}.`, page, 3000);
  return fitMeta(r);
}

// ---------- How does AI describe this business? ----------
export interface BrandDescription {
  known: "well" | "some" | "not";
  aiSays: string;
  siteSays: string;
  matches: string[];
  wrong: string[];
  missing: string[];
  fixes: string[];
}

export async function describeBrand(brand: string, page: PageInput): Promise<BrandDescription> {
  const r = await callClaude({
    system: `You compare what an AI assistant believes about a business with what the business's own website says. Be honest about uncertainty. ${RULES}`,
    user: `Step 1: Without looking anything up, write what you, an AI assistant, would tell someone who asks "What is ${brand} (${page.url})?" from your own knowledge.
If you don't know this business, say so plainly instead of guessing.
Step 2: Summarise what the website below says the business is and does.
Step 3: Compare them.
Return {"known": "well" | "some" | "not", "aiSays": your step-1 answer (2-4 sentences), "siteSays": step-2 summary (1-2 sentences),
"matches": [points where they agree], "wrong": [things you believed that the site contradicts], "missing": [important things on the site you didn't know],
"fixes": [3-5 specific changes to the website that would help AI assistants describe it correctly, such as clearer About text, Organization schema or consistent profiles]}.

---
${pageContext(page)}`,
    maxTokens: 5000,
    feature: "brand-description",
    timeoutMs: 120000,
  });
  const j = parseJsonLoose<BrandDescription>(r.text);
  const list = (v: unknown) => (Array.isArray(v) ? v : []).map((x) => String(x ?? "").slice(0, 300)).filter(Boolean).slice(0, 6);
  return {
    known: j.known === "well" || j.known === "some" ? j.known : "not",
    aiSays: String(j.aiSays ?? "").slice(0, 900),
    siteSays: String(j.siteSays ?? "").slice(0, 600),
    matches: list(j.matches),
    wrong: list(j.wrong),
    missing: list(j.missing),
    fixes: list(j.fixes),
  };
}

// ---------- Content brief for an AI visibility gap ----------
export interface GapBrief { title: string; angle: string; mustCover: string[]; sources: string[]; schema: string }

export async function gapBrief(opts: { brand: string; domain: string; prompt: string; competitors: string[] }): Promise<GapBrief> {
  const r = await callClaude({
    system: `You write short content briefs that help a business get mentioned in AI assistant answers. ${RULES}`,
    user: `When people ask AI assistants "${opts.prompt.slice(0, 300)}", the answers mention ${opts.competitors.slice(0, 5).join(", ") || "other businesses"} but not ${opts.brand} (${opts.domain}).
Write a brief for one page ${opts.brand} could publish so assistants have a reason to include it.
Return {"title": a page title, "angle": 1-2 sentences on what makes this page worth citing, "mustCover": [5-8 points or questions the page must answer],
"sources": [kinds of evidence to include, such as original numbers, case studies or comparisons], "schema": the schema.org type(s) to add}.`,
    maxTokens: 3500,
    feature: "gap-brief",
    timeoutMs: 90000,
  });
  const j = parseJsonLoose<GapBrief>(r.text);
  const list = (v: unknown) => (Array.isArray(v) ? v : []).map((x) => String(x ?? "").slice(0, 240)).filter(Boolean).slice(0, 8);
  return { title: String(j.title ?? "").slice(0, 160), angle: String(j.angle ?? "").slice(0, 500), mustCover: list(j.mustCover), sources: list(j.sources), schema: String(j.schema ?? "").slice(0, 120) };
}
