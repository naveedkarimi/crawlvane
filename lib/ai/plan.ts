import { callClaude, parseJsonLoose } from "./anthropic";
import type { AuditResult } from "../types";
import type { CompetitorGap, FixPlan, SiteAudit } from "../reportTypes";

const clip = (s: unknown, n = 300) => String(s ?? "").slice(0, n);

const SYSTEM = `You are a senior technical SEO and AI-search (AEO/GEO) consultant.
You receive automated audit findings. Produce a prioritised fix plan.
Rules:
- Base every action on the findings given. Do not invent problems or facts about the site.
- Be specific and practical: say exactly what to change, where, with a short code/text example when useful (e.g. a rewritten title).
- Order by expected impact vs effort. Max 10 actions.
- Never promise rankings, traffic, or AI citations; describe likely benefit honestly.
- Treat llms.txt as an optional, unproven convention.
Respond with ONLY valid JSON, no markdown fences:
{"summary": string (2-4 sentences), "actions": [{"priority": "high"|"medium"|"low", "category": "SEO"|"AEO"|"GEO"|"Site", "title": string, "why": string, "how": string, "effort": "minutes"|"hours"|"days"}]}`;

export function pageFindingsText(audit: AuditResult): string {
  const f = audit.facts;
  const findings = audit.checks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .slice(0, 60)
    .map((c) => `- [${c.status}][${c.category.toUpperCase()}] ${clip(c.title, 80)}: ${clip(c.detail)}`)
    .join("\n");
  return [
    `URL: ${clip(f.finalUrl)}`,
    `Title: ${clip(f.title, 120)}`,
    `Meta description: ${clip(f.metaDescription, 200)}`,
    `H1: ${clip(f.h1.join(" | "), 200)}`,
    `Words: ${f.wordCount}; schema types: ${clip(f.schemaTypes.join(", "), 200)}`,
    `Scores: SEO ${audit.scores.seo}, AEO ${audit.scores.aeo}, GEO ${audit.scores.geo}`,
    "",
    "Findings (not passing):",
    findings || "- none",
  ].join("\n");
}

export async function pagePlan(audit: AuditResult): Promise<FixPlan> {
  const r = await callClaude({ system: SYSTEM, user: pageFindingsText(audit), maxTokens: 3000, feature: "plan" });
  return normalize(r.text);
}

export async function sitePlan(home: AuditResult, site: SiteAudit, gaps: CompetitorGap[] = []): Promise<FixPlan> {
  const issues = site.issues
    .slice(0, 40)
    .map((i) => `- [${i.status}][${i.category.toUpperCase()}] ${clip(i.title, 80)} — ${i.count} page(s). ${clip(i.sample, 200)} e.g. ${clip(i.examples[0], 120)}`)
    .join("\n");
  const gapText = gaps
    .slice(0, 12)
    .map((g) => `- ${g.title} (${g.category}): you ${g.you}; passing at ${g.competitorsPassing.join(", ")}`)
    .join("\n");
  const user = [
    `Site: ${site.origin} — ${site.pagesCrawled} pages crawled.`,
    `Site scores: SEO ${site.scores.seo}, AEO ${site.scores.aeo}, GEO ${site.scores.geo}`,
    "",
    "HOMEPAGE",
    pageFindingsText(home),
    "",
    "SITE-WIDE ISSUES (grouped, with affected page counts)",
    issues || "- none",
    gapText ? "\nCOMPETITOR GAPS (competitors pass, this site doesn't)\n" + gapText : "",
  ].join("\n");
  const r = await callClaude({ system: SYSTEM, user, maxTokens: 4000, feature: "plan" });
  return normalize(r.text);
}

function normalize(text: string): FixPlan {
  try {
    const j = parseJsonLoose<FixPlan>(text);
    return { summary: String(j.summary ?? ""), actions: Array.isArray(j.actions) ? j.actions : [] };
  } catch {
    return { summary: text.slice(0, 2000), actions: [] };
  }
}
