// Tests AI response parsing with mocked provider APIs: npx tsx scripts/test-ai-mocks.mts
import assert from "node:assert/strict";
process.env.ANTHROPIC_API_KEY = "x"; process.env.OPENAI_API_KEY = "x"; process.env.PERPLEXITY_API_KEY = "x"; process.env.GEMINI_API_KEY = "x";
const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input); const body = JSON.parse(String(init?.body ?? "{}"));
  if (url.includes("anthropic")) {
    const sys = String(body.system);
    if (sys.includes("research analyst")) return json({ content: [{ type: "web_search_tool_result", content: [{ url: "https://src.com/a" }] }, { type: "text", text: 'Here: {"niche":"coffee","audienceQuestions":[{"question":"best grinder?","intent":"commercial","coveredOnSite":false}],"trustedSources":[{"name":"SCA","url":"https://sca.coffee","why":"standards"}],"contentGaps":["water"],"contentPlan":[{"title":"Grinder guide","format":"comparison","targetQuestion":"best grinder?","why":"demand"}]}' }] });
    if (sys.includes("social media marketer")) return json({ content: [{ type: "text", text: '{"posts":[{"network":"LinkedIn","text":"Hello","hashtags":["coffee"],"tip":"post at 9am"}]}' }] });
    if (sys.includes("realistic questions")) return json({ content: [{ type: "text", text: '{"prompts":["best coffee shop in Austin","how to brew pour over"]}' }] });
    if (sys.includes("fix plan")) return json({ content: [{ type: "text", text: '```json\n{"summary":"Do X","actions":[{"priority":"high","category":"SEO","title":"Fix title","why":"w","how":"h","effort":"minutes"}]}\n```' }] });
    return json({ content: [{ type: "text", text: "Try Acme Coffee and Bean Co.", citations: [{ url: "https://www.acme.coffee/menu" }] }] });
  }
  if (url.includes("openai")) return json({ output: [{ type: "message", content: [{ type: "output_text", text: "Bean Co is great", annotations: [{ type: "url_citation", url: "https://beanco.com" }] }] }] });
  if (url.includes("perplexity")) return json({ choices: [{ message: { content: "Acme Coffee [1]" } }], citations: ["https://acme.coffee/about"] });
  if (url.includes("generativelanguage")) return json({ candidates: [{ content: { parts: [{ text: "Nothing relevant" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://vertexaisearch/redirect", title: "yelp.com" } }] } }] });
  throw new Error("unexpected " + url);
}) as typeof fetch;

const { runVisibility, suggestPrompts, availableEngines } = await import("../lib/ai/visibility");
const { runResearch } = await import("../lib/ai/research");
const { writeSocialPosts } = await import("../lib/social");
const { pagePlan } = await import("../lib/ai/plan");

assert.deepEqual(availableEngines(), ["ChatGPT", "Claude", "Perplexity", "Gemini"]);
const prompts = await suggestPrompts("Acme Coffee", "acme.coffee", "coffee shop");
assert.equal(prompts.length, 2);
const v = await runVisibility({ brand: "Acme Coffee", domain: "acme.coffee", prompts, competitors: [{ name: "Bean Co", domain: "beanco.com" }] });
const by = (e: string) => v.summary.find((s) => s.engine === e)!;
assert.equal(by("Claude").mentionRate, 100); assert.equal(by("Claude").citationRate, 100);
assert.equal(by("Perplexity").citationRate, 100);
assert.equal(by("ChatGPT").mentionRate, 0);
assert.equal(by("Gemini").mentionRate, 0);
assert.equal(v.shareOfVoice.find((x) => x.name === "Bean Co")!.mentions, 4); // ChatGPT ×2 + Claude ×2
console.log("✓ AI visibility parsing (4 engines)", v.summary);
const rs = await runResearch({ url: "https://acme.coffee", title: "Acme", description: "", pages: [] });
assert.equal(rs.contentPlan.length, 1); assert.deepEqual(rs.sources, ["https://src.com/a"]);
console.log("✓ deep research parsing");
const sp = await writeSocialPosts({ url: "https://acme.coffee", title: "t", description: "d", excerpt: "e", brand: "Acme" });
assert.equal(sp.posts[0].network, "LinkedIn");
console.log("✓ social posts parsing");
const plan = await pagePlan({ url: "u", auditedAt: "", scores: { overall: 1, seo: 1, aeo: 1, geo: 1 }, checks: [], facts: { finalUrl: "u", title: "", metaDescription: "", h1: [], wordCount: 0, schemaTypes: [] } } as never);
assert.equal(plan.actions[0].title, "Fix title");
console.log("✓ fix plan parsing (handles ```json fences)");
