import { readJson, writeJson } from "./store";

/**
 * AI API usage per day, per provider and feature, so prices can be set from real numbers.
 * Token counts come from each provider's response. Cost is estimated only when you set
 * your current prices (US dollars per million tokens, per 1,000 web searches), e.g.
 *   AI_PRICE_ANTHROPIC_IN=…  AI_PRICE_ANTHROPIC_OUT=…  AI_PRICE_ANTHROPIC_SEARCH=…
 * Optional safety net: AI_DAILY_TOKEN_CAP stops all AI calls for the rest of the day (UTC)
 * once input + output tokens pass it.
 */
export type Provider = "anthropic" | "openai" | "perplexity" | "gemini";
export interface Tally { calls: number; input: number; output: number; searches: number }
type Day = Record<string, Tally>; // key: "provider:feature"

const day = (d = new Date()) => d.toISOString().slice(0, 10);
const empty = (): Tally => ({ calls: 0, input: 0, output: 0, searches: 0 });

// One save at a time, otherwise simultaneous AI calls overwrite each other's counts.
let queue: Promise<void> = Promise.resolve();

export function recordUsage(provider: Provider, feature: string, u: Partial<Tally>): Promise<void> {
  queue = queue.then(() => saveUsage(provider, feature, u));
  return queue;
}

async function saveUsage(provider: Provider, feature: string, u: Partial<Tally>): Promise<void> {
  try {
    const id = "d" + day().replace(/-/g, "");
    const d = (await readJson<Day>("usage", id)) ?? {};
    const k = `${provider}:${feature}`;
    const t = (d[k] ??= empty());
    t.calls++;
    t.input += u.input ?? 0;
    t.output += u.output ?? 0;
    t.searches += u.searches ?? 0;
    await writeJson("usage", id, d);
  } catch {
    /* usage tracking must never break a feature */
  }
}

export async function tokensToday(): Promise<number> {
  const d = (await readJson<Day>("usage", "d" + day().replace(/-/g, ""))) ?? {};
  return Object.values(d).reduce((n, t) => n + t.input + t.output, 0);
}

/** Throws when the optional daily cap is reached. Call before any paid AI request. */
export async function assertBudget(): Promise<void> {
  const cap = Number(process.env.AI_DAILY_TOKEN_CAP ?? 0);
  if (cap > 0 && (await tokensToday()) >= cap) throw new Error("The AI features have reached today's limit. Please try again tomorrow.");
}

const price = (p: Provider, kind: "IN" | "OUT" | "SEARCH") => {
  const v = Number(process.env[`AI_PRICE_${p.toUpperCase()}_${kind}`]);
  return Number.isFinite(v) && v > 0 ? v : null;
};

export function estimateCost(provider: Provider, t: Tally): number | null {
  const pin = price(provider, "IN");
  const pout = price(provider, "OUT");
  if (pin === null || pout === null) return null;
  const ps = price(provider, "SEARCH") ?? 0;
  return (t.input / 1e6) * pin + (t.output / 1e6) * pout + (t.searches / 1000) * ps;
}

export interface UsageRow extends Tally { date: string; provider: Provider; feature: string; cost: number | null }

export async function usageReport(days = 30): Promise<{ rows: UsageRow[]; totalCost: number | null; tokens: number }> {
  const rows: UsageRow[] = [];
  for (let i = 0; i < days; i++) {
    const date = day(new Date(Date.now() - i * 86400_000));
    const d = await readJson<Day>("usage", "d" + date.replace(/-/g, ""));
    if (!d) continue;
    for (const [k, t] of Object.entries(d)) {
      const [provider, feature] = k.split(":") as [Provider, string];
      rows.push({ date, provider, feature, ...t, cost: estimateCost(provider, t) });
    }
  }
  const costs = rows.map((r) => r.cost);
  const totalCost = costs.length && costs.every((c) => c !== null) ? costs.reduce((a, b) => a! + b!, 0) : null;
  return { rows, totalCost, tokens: rows.reduce((n, r) => n + r.input + r.output, 0) };
}
