/**
 * Internal link suggestions from a full-site crawl, without AI: for each page with few links
 * pointing at it, find the related pages (by shared words in titles, headings and descriptions)
 * that don't link to it yet, and suggest anchor text. Runs in the browser and on the server.
 */
export interface LinkPage { url: string; title: string; h1: string; description: string; inlinks: number; noindex?: boolean; status?: number }
export interface LinkSuggestion { target: string; targetTitle: string; inlinks: number; anchor: string; from: { url: string; title: string }[] }

const STOP = new Set("about after also and any are been best but can could does each even every from have here home how into just like more most much need only other our over page same should some such than that their them then there these they this those through very want what when where which while who why will with without your yours".split(" "));

export function topicWords(...parts: string[]): Set<string> {
  const words = parts.join(" ").toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/);
  return new Set(words.filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)).map((w) => w.replace(/(ies)$/, "y").replace(/(?<=[a-z]{3})s$/, "")));
}

/** Share of words two pages have in common (Jaccard), 0 to 1. */
export function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let both = 0;
  for (const w of a) if (b.has(w)) both++;
  return both / (a.size + b.size - both);
}

const isHome = (u: string) => { try { return new URL(u).pathname.replace(/\/+$/, "") === ""; } catch { return false; } };
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * @param linksTo existing links: target URL → the pages that already link to it
 * @param maxTargets how many under-linked pages to suggest links for
 */
export function suggestLinks(pages: LinkPage[], linksTo: Map<string, Set<string>> | Record<string, string[]>, maxTargets = 12, perTarget = 3): LinkSuggestion[] {
  const has = (target: string, source: string) => (linksTo instanceof Map ? linksTo.get(target)?.has(source) : linksTo[target]?.includes(source)) ?? false;
  const usable = pages.filter((p) => !p.noindex && (p.status ?? 200) < 400 && (p.title || p.h1));
  const words = new Map(usable.map((p) => [p.url, topicWords(p.title, p.h1, p.h1, p.description)]));
  const out: LinkSuggestion[] = [];
  const targets = usable.filter((p) => !isHome(p.url) && p.inlinks <= 2).sort((a, b) => a.inlinks - b.inlinks);
  for (const t of targets) {
    const tw = words.get(t.url)!;
    const from = usable
      .filter((s) => s.url !== t.url && !has(t.url, s.url))
      .map((s) => ({ s, score: overlap(tw, words.get(s.url)!) }))
      .filter((x) => x.score >= 0.12)
      .sort((a, b) => b.score - a.score)
      .slice(0, perTarget)
      .map(({ s }) => ({ url: s.url, title: clean(s.title || s.h1).slice(0, 120) }));
    if (from.length) out.push({ target: t.url, targetTitle: clean(t.title || t.h1).slice(0, 120), inlinks: t.inlinks, anchor: clean(t.h1 || t.title).slice(0, 80), from });
    if (out.length >= maxTargets) break;
  }
  return out;
}
