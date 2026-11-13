import { callClaude, parseJsonLoose } from "./anthropic";
import { faqMarkup, wordCount, type FaqItem } from "./helpers";
import { db } from "../store";

/**
 * AI writer: a full article draft for one topic, built for search engines, answer engines and AI
 * assistants (a direct answer up top, question headings, short answers under each, an FAQ with
 * schema). It uses only the facts the user gives and the saved site's details; anything else it
 * needs becomes a [placeholder], so nothing is invented. Drafts are saved per team.
 */
export type ArticleLength = "short" | "medium" | "long";
export const LENGTH_WORDS: Record<ArticleLength, number> = { short: 600, medium: 1000, long: 1500 };

export interface ArticleInput { topic: string; notes: string; audience: string; length: ArticleLength; brand: string; domain: string }

export interface Article {
  title: string;
  metaDescription: string;
  slug: string;
  /** The article in Markdown, starting below the title. */
  markdown: string;
  faq: FaqItem[];
  faqJsonLd: string;
  words: number;
  /** Placeholders the writer left for facts it didn't have, like [your price]. */
  placeholders: string[];
}

export class WriterError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function cleanInput(raw: Partial<Record<keyof ArticleInput, unknown>>): Omit<ArticleInput, "brand" | "domain"> {
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const topic = str(raw.topic, 160);
  if (topic.length < 3) throw new WriterError("Give the article a topic or keyword, at least 3 characters.");
  const length = (["short", "medium", "long"] as const).includes(raw.length as ArticleLength) ? (raw.length as ArticleLength) : "medium";
  return { topic, notes: str(raw.notes, 4000), audience: str(raw.audience, 200), length };
}

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);
/** Every [placeholder] the draft still needs filling in. */
export const findPlaceholders = (s: string) => [...new Set((s.match(/\[[^\]\n]{2,60}\](?!\()/g) ?? []).filter((p) => !/^\[\d+\]$/.test(p)))];

const SYSTEM = `You are a senior content writer who writes for search engines, answer engines (featured snippets, AI Overviews) and AI assistants.
Write in plain, friendly English. Use only the facts in the brief and the notes. Never invent prices, numbers, statistics, names, dates, awards,
reviews, quotes or claims about the business. Where a real detail would help but isn't given, write a short placeholder in square brackets,
like [your price] or [number of years in business]. General, widely known information about the topic is fine; anything specific to the
business must come from the notes. Reply with JSON only.`;

export async function writeArticle(input: ArticleInput): Promise<Article> {
  const target = LENGTH_WORDS[input.length];
  const r = await callClaude({
    system: SYSTEM,
    feature: "ai-writer",
    maxTokens: 16000,
    timeoutMs: 180000,
    user: `Write an article about: ${input.topic}
Business: ${input.brand} (${input.domain})
Audience: ${input.audience || "people searching for this topic"}
Length: about ${target} words.
Notes from the business (the only source for facts about the business):
${input.notes || "(none: use placeholders for business-specific details)"}

Structure:
- Start with a 40 to 60 word paragraph that directly answers the main question.
- Then 4 to 7 sections with H2 headings phrased the way people ask (questions where natural). Open each section with a direct 1 to 2 sentence answer.
- Use short paragraphs, and a list or a table where it genuinely helps.
- End with a short next step mentioning ${input.brand}, without hype.
Don't include the title in the markdown, and don't write an FAQ section in the markdown: put 4 to 6 FAQs in "faq" instead.

Return {"title": under 60 characters, "metaDescription": 120 to 155 characters, "markdown": string, "faq": [{"question": string, "answer": 1 to 3 sentences}]}.`,
  });
  const j = parseJsonLoose<{ title?: string; metaDescription?: string; markdown?: string; faq?: FaqItem[] }>(r.text);
  const markdown = String(j.markdown ?? "").trim();
  if (wordCount(markdown) < 150) throw new WriterError("The AI didn't return a full article. Try again.", 502);
  const faq = (Array.isArray(j.faq) ? j.faq : []).slice(0, 6).map((f) => ({ question: String(f.question ?? "").slice(0, 200), answer: String(f.answer ?? "").slice(0, 700) })).filter((f) => f.question && f.answer);
  const title = String(j.title ?? input.topic).trim().slice(0, 90);
  return {
    title,
    metaDescription: String(j.metaDescription ?? "").trim().slice(0, 200),
    slug: slugify(title),
    markdown,
    faq,
    faqJsonLd: faq.length ? faqMarkup(faq).jsonLd : "",
    words: wordCount(markdown),
    placeholders: findPlaceholders(`${title} ${markdown} ${faq.map((f) => f.answer).join(" ")}`),
  };
}

// ---------- Saved drafts ----------
export interface ArticleRow { id: string; topic: string; title: string; words: number; siteId: string | null; createdAt: string }

export async function saveArticle(orgId: string, siteId: string | null, topic: string, a: Article): Promise<string> {
  const { data, error } = await db().from("articles").insert({ org_id: orgId, site_id: siteId, topic, title: a.title, words: a.words, body: a }).select("id").single();
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return data.id as string;
}

export async function listArticles(orgId: string): Promise<ArticleRow[]> {
  const { data, error } = await db().from("articles").select("id, topic, title, words, site_id, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(`Database read failed: ${error.message}`);
  return (data ?? []).map((r) => ({ id: r.id, topic: r.topic, title: r.title, words: r.words, siteId: r.site_id, createdAt: r.created_at }));
}

export async function getArticle(orgId: string, id: string): Promise<Article | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("articles").select("body").eq("org_id", orgId).eq("id", id).maybeSingle();
  return (data?.body as Article) ?? null;
}

export async function deleteArticle(orgId: string, id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await db().from("articles").delete().eq("org_id", orgId).eq("id", id);
}
