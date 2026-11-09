import { ANTHROPIC_MODEL } from "../config";
import { assertBudget, recordUsage } from "../usage";

export interface ClaudeResult {
  text: string;
  citations: string[];
}

const SUPPORTS_EFFORT = /^claude-(fable-5|opus-5|sonnet-5|haiku-5)/;
const CURRENT_SEARCH = /^claude-(opus-5|sonnet-5)/;
const MAX_RESUMES = 3;

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
    // Thinking counts toward this limit, so it has to be well above the expected answer.
    max_tokens: opts.maxTokens ?? 12000,
    system: opts.system,
  };
  if (SUPPORTS_EFFORT.test(ANTHROPIC_MODEL)) body.output_config = { effort: "medium" };
  if (opts.webSearch)
    body.tools = [
      {
        type: process.env.ANTHROPIC_WEB_SEARCH_TOOL || (CURRENT_SEARCH.test(ANTHROPIC_MODEL) ? "web_search_20260209" : "web_search_20250305"),
        name: "web_search",
        max_uses: opts.webSearch,
      },
    ];
  const messages: unknown[] = [{ role: "user", content: opts.user }];
  const blocks: { type: string; text?: string; citations?: { url?: string }[]; content?: { url?: string }[] }[] = [];
  for (let turn = 0; ; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ ...body, messages }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 180000),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    recordUsage("anthropic", opts.feature ?? "other", {
      input: (data.usage?.input_tokens ?? 0) + (data.usage?.cache_creation_input_tokens ?? 0) + (data.usage?.cache_read_input_tokens ?? 0),
      output: data.usage?.output_tokens ?? 0,
      searches: data.usage?.server_tool_use?.web_search_requests ?? 0,
    });
    blocks.push(...(data.content ?? []));
    if (data.stop_reason === "max_tokens") throw new Error("The AI reply was too long and got cut off. Please try again.");
    if (data.stop_reason === "refusal") throw new Error("The AI declined this request.");
    if (data.stop_reason !== "pause_turn") break;
    // Long web searches pause; sending the reply back lets Claude continue.
    if (turn >= MAX_RESUMES) throw new Error("The AI took too long to finish. Please try again.");
    messages.push({ role: "assistant", content: data.content });
  }
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
