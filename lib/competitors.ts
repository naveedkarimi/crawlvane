import { runAudit } from "./audit";
import type { AuditResult, Status } from "./types";
import type { CompetitorGap, CompetitorResult } from "./reportTypes";

export async function auditCompetitor(url: string, render = false): Promise<CompetitorResult> {
  try {
    const r = await runAudit(url, { render });
    return {
      url: r.facts.finalUrl,
      ok: true,
      scores: r.scores,
      statuses: Object.fromEntries(r.checks.map((c) => [c.id, c.status])),
      wordCount: r.facts.wordCount,
      schemaTypes: r.facts.schemaTypes,
      questionHeadings: r.facts.questionHeadings,
      llmsTxt: r.facts.llmsTxtFound,
      aiBotsBlocked: r.facts.bots.filter((b) => !b.allowed).map((b) => b.bot),
    };
  } catch (e) {
    return { url, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const rank: Record<Status, number> = { pass: 3, info: 2, warn: 1, fail: 0 };

/** Checks where at least one competitor passes and you don't. */
export function findGaps(you: AuditResult, competitors: CompetitorResult[]): CompetitorGap[] {
  const gaps: CompetitorGap[] = [];
  for (const c of you.checks) {
    if (c.status === "pass" || c.status === "info") continue;
    const passing = competitors.filter((k) => k.ok && k.statuses?.[c.id] === "pass").map((k) => new URL(k.url).hostname);
    if (passing.length) gaps.push({ id: c.id, title: c.title, category: c.category, you: c.status, competitorsPassing: passing, fix: c.fix });
  }
  return gaps.sort(
    (a, b) => b.competitorsPassing.length - a.competitorsPassing.length || rank[a.you] - rank[b.you],
  );
}
