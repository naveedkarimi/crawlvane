/**
 * ADVANCED (aiVisibility): ask real AI assistants buyer questions and record
 * whether the brand is mentioned and the domain cited.
 *
 * Each engine needs its own API key; engines without a key are skipped.
 *   Claude      ANTHROPIC_API_KEY   (web search tool)
 *   ChatGPT     OPENAI_API_KEY      (Responses API + web_search tool)  OPENAI_MODEL
 *   Perplexity  PERPLEXITY_API_KEY  (sonar)                            PERPLEXITY_MODEL
 *   Gemini      GEMINI_API_KEY      (Google Search grounding)          GEMINI_MODEL
 *
 * API answers approximate, but don't exactly equal, what users see in the apps.
 */
import { assertBudget, recordUsage } from "../usage";
import { callClaude, parseJsonLoose } from "./anthropic";
import type { VisibilityResult } from "../reportTypes";

interface EngineAnswer {
  text: string;
  urls: string[];
}
type Engine = { name: string; enabled: () => boolean; ask: (q: string) => Promise<EngineAnswer> };

const SYSTEM_USER =
  "Answer the user's question helpfully as you normally would, recommending specific businesses, products or websites by name where relevant. Use web search.";

const engines: Engine[] = [
  {
    name: "ChatGPT",
    enabled: () => !!process.env.OPENAI_API_KEY,
    ask: async (q) => {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5-mini",
          tools: [{ type: process.env.OPENAI_WEB_SEARCH_TOOL || "web_search" }],
          input: q,
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const d = await res.json();
      recordUsage("openai", "visibility", { input: d.usage?.input_tokens ?? 0, output: d.usage?.output_tokens ?? 0, searches: 1 });
      let text = d.output_text ?? "";
      const urls: string[] = [];
      for (const item of d.output ?? [])
        for (const c of item.content ?? []) {
          if (c.type === "output_text") {
            if (!d.output_text) text += c.text ?? "";
            for (const a of c.annotations ?? []) if (a.url) urls.push(a.url);
          }
        }
      return { text, urls };
    },
  },
  {
    name: "Claude",
    enabled: () => !!process.env.ANTHROPIC_API_KEY,
    ask: async (q) => {
      const r = await callClaude({ system: SYSTEM_USER, user: q, maxTokens: 8000, webSearch: 3, feature: "visibility" });
      return { text: r.text, urls: r.citations };
    },
  },
  {
    name: "Perplexity",
    enabled: () => !!process.env.PERPLEXITY_API_KEY,
    ask: async (q) => {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.PERPLEXITY_MODEL || "sonar", messages: [{ role: "user", content: q }] }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const d = await res.json();
      recordUsage("perplexity", "visibility", { input: d.usage?.prompt_tokens ?? 0, output: d.usage?.completion_tokens ?? 0, searches: 1 });
      const urls: string[] = [
        ...(d.citations ?? []),
        ...((d.search_results ?? []) as { url?: string }[]).map((s) => s.url ?? "").filter(Boolean),
      ];
      return { text: d.choices?.[0]?.message?.content ?? "", urls };
    },
  },
  {
    name: "Gemini",
    enabled: () => !!process.env.GEMINI_API_KEY,
    ask: async (q) => {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY!, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: q }] }], tools: [{ google_search: {} }] }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const d = await res.json();
      recordUsage("gemini", "visibility", { input: d.usageMetadata?.promptTokenCount ?? 0, output: d.usageMetadata?.candidatesTokenCount ?? 0, searches: 1 });
      const cand = d.candidates?.[0];
      const text = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
      // Grounding chunks use redirect URIs; the title holds the source domain.
      const urls = ((cand?.groundingMetadata?.groundingChunks ?? []) as { web?: { uri?: string; title?: string } }[])
        .map((c) => (c.web?.title && /\./.test(c.web.title) ? `https://${c.web.title}` : c.web?.uri ?? ""))
        .filter(Boolean);
      return { text, urls };
    },
  },
];

export function availableEngines(): string[] {
  return engines.filter((e) => e.enabled()).map((e) => e.name);
}

/** Suggest realistic buyer questions for the site using Claude. */
export async function suggestPrompts(brand: string, domain: string, summary: string, n = 8): Promise<string[]> {
  const r = await callClaude({
    feature: "prompts",
    system:
      'You write realistic questions that potential customers type into ChatGPT or Perplexity when looking for a business like this one. Do NOT include the brand name. Mix "best X in Y", comparisons, how-to and problem questions. Reply ONLY with JSON: {"prompts": string[]}',
    user: `Brand: ${brand}\nDomain: ${domain}\nWhat the site is about: ${summary.slice(0, 1500)}\nWrite ${n} questions.`,
    maxTokens: 4000,
  });
  const j = parseJsonLoose<{ prompts: string[] }>(r.text);
  return (j.prompts ?? []).map(String).filter(Boolean).slice(0, n);
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export async function runVisibility(opts: {
  brand: string;
  domain: string;
  prompts: string[];
  competitors: { name: string; domain: string }[];
  onProgress?: (done: number, total: number) => void | Promise<void>;
}): Promise<VisibilityResult> {
  const active = engines.filter((e) => e.enabled());
  if (!active.length) throw new Error("No AI engine API keys configured.");
  await assertBudget();
  const domain = opts.domain.replace(/^www\./, "");
  const brandRe = new RegExp(`\\b${opts.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b|${domain.replace(/\./g, "\\.")}`, "i");
  const rows: VisibilityResult["rows"] = [];
  const total = active.length * opts.prompts.length;
  let done = 0;

  // Engines in parallel, prompts sequentially per engine (gentle on rate limits)
  await Promise.all(
    active.map(async (engine) => {
      for (const prompt of opts.prompts) {
        try {
          const a = await engine.ask(prompt);
          const hosts = [...new Set(a.urls.map(host).filter(Boolean))];
          const competitorsMentioned = opts.competitors
            .filter((c) => new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(a.text) || hosts.some((h) => h.endsWith(c.domain)))
            .map((c) => c.name);
          rows.push({
            engine: engine.name,
            prompt,
            mentioned: brandRe.test(a.text),
            cited: hosts.some((h) => h === domain || h.endsWith("." + domain)),
            citedUrls: [...new Set(a.urls)].slice(0, 12),
            competitorsMentioned,
            answerExcerpt: a.text.replace(/\s+/g, " ").slice(0, 600),
          });
        } catch (e) {
          rows.push({
            engine: engine.name, prompt, mentioned: false, cited: false, citedUrls: [], competitorsMentioned: [],
            answerExcerpt: "", error: e instanceof Error ? e.message : String(e),
          });
        }
        done++;
        await opts.onProgress?.(done, total);
      }
    }),
  );

  const summary = active.map((e) => {
    const rs = rows.filter((r) => r.engine === e.name && !r.error);
    const n = Math.max(1, rs.length);
    return {
      engine: e.name,
      answered: rs.length,
      mentionRate: Math.round((rs.filter((r) => r.mentioned).length / n) * 100),
      citationRate: Math.round((rs.filter((r) => r.cited).length / n) * 100),
    };
  });
  const sov = [{ name: opts.brand, mentions: rows.filter((r) => r.mentioned).length }];
  for (const c of opts.competitors) sov.push({ name: c.name, mentions: rows.filter((r) => r.competitorsMentioned.includes(c.name)).length });

  return {
    brand: opts.brand,
    domain,
    prompts: opts.prompts,
    engines: active.map((e) => e.name),
    rows,
    summary,
    shareOfVoice: sov.sort((a, b) => b.mentions - a.mentions),
  };
}
