import type { AuditFacts } from "./types";

/**
 * "What AI sees": the verdict and the AI crawler list, shared by the report page (components/AiView.tsx)
 * and the Markdown download, so both always say the same thing. No imports with side effects.
 */
export type AiVerdict = { tone: "info" | "bad" | "warn" | "good"; text: string };

export function aiViewVerdict(facts: Pick<AuditFacts, "wordCount" | "rendered" | "rawWordCount">): AiVerdict {
  if (facts.rendered && facts.rawWordCount !== undefined) {
    const people = facts.wordCount.toLocaleString("en-US"), ai = facts.rawWordCount.toLocaleString("en-US");
    if (facts.rawWordCount < 50 && facts.wordCount >= 150) return { tone: "bad", text: `People see ${people} words, but AI crawlers get ${ai}: most of the content only appears after JavaScript runs.` };
    if (facts.rawWordCount < facts.wordCount * 0.5) return { tone: "warn", text: `People see ${people} words; AI crawlers get ${ai}. Over half the text needs JavaScript, which most AI crawlers don't run.` };
    return { tone: "good", text: `People see ${people} words and AI crawlers get ${ai}: the content is in the HTML.` };
  }
  const words = facts.wordCount;
  if (facts.rendered) return { tone: "info", text: "This audit ran JavaScript first, so the text below is what a browser sees. Run it without JavaScript rendering to see what most AI crawlers get." };
  if (words < 50) return { tone: "bad", text: `AI crawlers get almost nothing: ${words} words of text in the HTML. The content most likely appears only after JavaScript runs.` };
  if (words < 250) return { tone: "warn", text: `AI crawlers get a thin page: ${words} words of text in the HTML. Add the key facts and answers as plain HTML text.` };
  return { tone: "good", text: `AI crawlers can read your content: ${words} words of text are in the HTML.` };
}

/** The crawlers AI assistants use to answer and to fetch pages for people (not training bots). */
export const answerBots = (facts: Pick<AuditFacts, "bots">) => facts.bots.filter((b) => b.purpose === "search" || b.purpose === "user-fetch");

/** The "What AI sees" section of the Markdown download. */
export function aiViewMarkdown(facts: AuditFacts): string[] {
  const L = ["## What AI sees", "", `_${facts.finalUrl}_`, "", aiViewVerdict(facts).text, ""];
  L.push(`**Title:** ${facts.title || "(none)"}  `, `**Description:** ${facts.metaDescription || "(none)"}`, "");
  const outline = (facts.outline ?? []).slice(0, 15);
  if (outline.length) L.push("**Headings AI reads**", "", ...outline.map((h) => `${"  ".repeat(Math.max(0, h.level - 1))}- H${h.level}: ${h.text}`), "");
  const bots = answerBots(facts);
  if (bots.length) L.push(`**AI crawlers allowed:** ${bots.filter((b) => b.allowed).length} of ${bots.length}`, "", ...bots.map((b) => `- ${b.allowed ? "✓" : "✗"} ${b.bot} (${b.owner})`), "");
  const excerpt = (facts.textExcerpt ?? "").trim().replace(/\s+/g, " ").slice(0, 700);
  if (excerpt) L.push("**The start of the text AI gets**", "", `> ${excerpt}${(facts.textExcerpt ?? "").length > 700 ? "…" : ""}`, "");
  return L;
}
