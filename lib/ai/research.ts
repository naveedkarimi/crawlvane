/**
 * ADVANCED (deepResearch): Claude researches the site's niche on the web.
 */
import { callClaude, parseJsonLoose } from "./anthropic";
import type { PageSummary, ResearchResult } from "../reportTypes";

const SYSTEM = `You are an SEO and AI-search research analyst. Use web search to research the niche of the website described.
Find:
1. 12-20 real questions the target audience asks (from forums, "People also ask", Reddit, Q&A sites, AI answers). For each, judge whether the site's existing page titles appear to cover it.
2. 5-10 sources that search engines and AI assistants commonly cite in this niche (directories, publications, review sites, communities) and why they matter (e.g. get listed, earn mentions).
3. Content gaps: topics competitors/cited sources cover that this site doesn't.
4. A content plan of 6-10 pieces, each targeting a specific question, with a recommended format (guide, comparison, FAQ, calculator, case study, statistics page...).
Only state things supported by your research; don't invent statistics.
Reply ONLY with JSON:
{"niche": string, "audienceQuestions":[{"question":string,"intent":"informational"|"commercial"|"transactional"|"navigational","coveredOnSite":boolean}], "trustedSources":[{"name":string,"url":string,"why":string}], "contentGaps":[string], "contentPlan":[{"title":string,"format":string,"targetQuestion":string,"why":string}]}`;

export async function runResearch(opts: { url: string; title: string; description: string; pages: PageSummary[] }): Promise<ResearchResult> {
  const pageList = opts.pages
    .filter((p) => p.status === 200 && p.title)
    .slice(0, 60)
    .map((p) => `- ${p.title.slice(0, 90)} (${new URL(p.url).pathname})`)
    .join("\n");
  const r = await callClaude({
    feature: "research",
    system: SYSTEM,
    user: `Website: ${opts.url}\nTitle: ${opts.title}\nDescription: ${opts.description}\n\nExisting pages:\n${pageList || "- (homepage only)"}`,
    maxTokens: 16000,
    webSearch: 8,
    timeoutMs: 240000,
  });
  const j = parseJsonLoose<Omit<ResearchResult, "sources">>(r.text);
  return {
    niche: String(j.niche ?? ""),
    audienceQuestions: Array.isArray(j.audienceQuestions) ? j.audienceQuestions : [],
    trustedSources: Array.isArray(j.trustedSources) ? j.trustedSources : [],
    contentGaps: Array.isArray(j.contentGaps) ? j.contentGaps.map(String) : [],
    contentPlan: Array.isArray(j.contentPlan) ? j.contentPlan : [],
    sources: r.citations.slice(0, 40),
  };
}
