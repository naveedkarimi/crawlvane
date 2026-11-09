import { ANTHROPIC_MODEL } from "../config";
import { assertBudget, recordUsage } from "../usage";

export interface ClaudeResult {
  text: string;
  citations: string[];
}

/** Call the Anthropic Messages API. Optionally enables server-side web search. */
export async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  webSearch?: number; // max searches, 0/undefined = off
  timeoutMs?: number;
  /** Label for usage tracking, e.g. "plan" or "visibility". */
  feature?: string;
}): Promise<ClaudeResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  await assertBudget();
  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 3000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  };
  if (opts.webSearch)
    body.tools = [
      {
        type: process.env.ANTHROPIC_WEB_SEARCH_TOOL || "web_search_20250305",
        name: "web_search",
        max_uses: opts.webSearch,
      },
    ];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 90000),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  recordUsage("anthropic", opts.feature ?? "other", {
    input: (data.usage?.input_tokens ?? 0) + (data.usage?.cache_creation_input_tokens ?? 0) + (data.usage?.cache_read_input_tokens ?? 0),
    output: data.usage?.output_tokens ?? 0,
    searches: data.usage?.server_tool_use?.web_search_requests ?? 0,
  });
  const blocks: { type: string; text?: string; citations?: { url?: string }[]; content?: { url?: string }[] }[] = data.content ?? [];
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const citations = new Set<string>();
  for (const b of blocks) {
    b.citations?.forEach((c) => c.url && citations.add(c.url));
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach((c) => c.url && citations.add(c.url));
  }
  return { text, citations: [...citations] };
}

/** Pull the first JSON object out of a model reply. */
export function parseJsonLoose<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON in model reply");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
