// Tests the request sent to Claude and how its stop reasons are handled: `npm test`
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "x";
delete process.env.ANTHROPIC_MODEL;
delete process.env.ANTHROPIC_WEB_SEARCH_TOOL;
delete process.env.AI_DAILY_TOKEN_CAP;

const bodies: any[] = [];
let replies: unknown[] = [];
globalThis.fetch = (async (_input: RequestInfo | URL, init: RequestInit = {}) => {
  bodies.push(JSON.parse(String(init.body)));
  return new Response(JSON.stringify(replies.shift()), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const { callClaude } = await import("../lib/ai/anthropic");
const text = (t: string, stop_reason = "end_turn") => ({ content: [{ type: "text", text: t }], stop_reason, usage: {} });

replies = [text("ok")];
assert.equal((await callClaude({ system: "s", user: "u" })).text, "ok");
assert.equal(bodies[0].max_tokens, 12000);
assert.deepEqual(bodies[0].output_config, { effort: "medium" });
console.log("✓ Claude call leaves room for thinking");

bodies.length = 0;
replies = [text("ok")];
await callClaude({ system: "s", user: "u", webSearch: 3 });
assert.equal(bodies[0].tools[0].type, "web_search_20260209");
console.log("✓ Claude call uses the current web search tool");

bodies.length = 0;
replies = [text("part one ", "pause_turn"), text("part two")];
assert.equal((await callClaude({ system: "s", user: "u", webSearch: 3 })).text, "part one part two");
assert.equal(bodies.length, 2);
assert.equal(bodies[1].messages[1].role, "assistant");
console.log("✓ Claude call resumes a paused turn");

replies = [text('{"cut', "max_tokens")];
await assert.rejects(callClaude({ system: "s", user: "u" }), /cut off/);
replies = [text("", "refusal")];
await assert.rejects(callClaude({ system: "s", user: "u" }), /declined/);
console.log("✓ Claude call reports cut-off and declined replies");
