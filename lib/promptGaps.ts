/** Pure helpers for AI visibility runs, safe to use in the browser. */

/** A question where AI answers name competitors but never the brand. */
export interface PromptGap { prompt: string; engines: string[]; competitors: string[] }

/** From one run's answers: the questions to win back, most competitors first. */
export function promptGaps(rows: { prompt: string; engine: string; mentioned: boolean; competitorsMentioned?: string[]; error?: string | null }[]): PromptGap[] {
  const byPrompt = new Map<string, { mentioned: boolean; engines: Set<string>; competitors: Set<string> }>();
  for (const r of rows) {
    if (r.error) continue;
    const g = byPrompt.get(r.prompt) ?? { mentioned: false, engines: new Set<string>(), competitors: new Set<string>() };
    if (r.mentioned) g.mentioned = true;
    if (r.competitorsMentioned?.length) {
      g.engines.add(r.engine);
      r.competitorsMentioned.forEach((c) => g.competitors.add(c));
    }
    byPrompt.set(r.prompt, g);
  }
  return [...byPrompt.entries()]
    .filter(([, g]) => !g.mentioned && g.competitors.size > 0)
    .map(([prompt, g]) => ({ prompt, engines: [...g.engines].sort(), competitors: [...g.competitors].sort() }))
    .sort((a, b) => b.competitors.length - a.competitors.length || b.engines.length - a.engines.length);
}

type Row = { prompt: string; engine: string; mentioned: boolean; cited?: boolean; citedUrls?: string[]; competitorsMentioned?: string[]; error?: string | null; corrected?: boolean };

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** The domains AI answers cite most, other than your own, with the questions they were cited for. */
export function citedSources(rows: Row[], ownDomain: string, limit = 10): { domain: string; times: number; prompts: string[] }[] {
  const own = ownDomain.replace(/^www\./, "").toLowerCase();
  const m = new Map<string, { times: number; prompts: Set<string> }>();
  for (const r of rows) {
    if (r.error) continue;
    for (const d of new Set((r.citedUrls ?? []).map(hostOf).filter(Boolean))) {
      if (d === own || d.endsWith("." + own)) continue;
      const e = m.get(d) ?? { times: 0, prompts: new Set<string>() };
      e.times++;
      e.prompts.add(r.prompt);
      m.set(d, e);
    }
  }
  return [...m.entries()].map(([domain, e]) => ({ domain, times: e.times, prompts: [...e.prompts] })).sort((a, b) => b.times - a.times).slice(0, limit);
}

/** Mention and citation rates per assistant, counted the same way as a tracking run. */
export function recountSummary(rows: Row[]): { engine: string; answered: number; mentionRate: number; citationRate: number }[] {
  const engines = [...new Set(rows.map((r) => r.engine))];
  return engines.map((engine) => {
    const rs = rows.filter((r) => r.engine === engine && !r.error);
    const n = Math.max(1, rs.length);
    return { engine, answered: rs.length, mentionRate: Math.round((rs.filter((r) => r.mentioned).length / n) * 100), citationRate: Math.round((rs.filter((r) => r.cited).length / n) * 100) };
  });
}

/** Share of voice, counted the same way as a tracking run. */
export function recountShareOfVoice(rows: Row[], brand: string, competitors: { name: string }[]): { name: string; mentions: number }[] {
  return [{ name: brand, mentions: rows.filter((r) => r.mentioned).length }, ...competitors.map((c) => ({ name: c.name, mentions: rows.filter((r) => r.competitorsMentioned?.includes(c.name)).length }))];
}
