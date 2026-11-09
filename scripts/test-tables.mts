// Tests that forms write to the dedicated Supabase tables, against a fake API: `npm test`
import assert from "node:assert/strict";

type Call = { method: string; table: string; url: URL; body: any; prefer: string };
let calls: Call[] = [];
let deleted = 1;
let listed: unknown[] = [];

globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  const method = init.method ?? "GET";
  const prefer = new Headers(init.headers).get("prefer") ?? "";
  calls.push({ method, table: url.pathname.split("/").pop()!, url, body: typeof init.body === "string" ? JSON.parse(init.body) : undefined, prefer });
  if (method === "POST") return new Response(null, { status: 201 });
  if (method === "DELETE") return new Response(null, { status: 204, headers: { "content-range": `*/${deleted}` } });
  return new Response(JSON.stringify(listed), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
const { saveWidgetLead, listWidgetLeads } = await import("../lib/widgets");

// Widget leads
calls = [];
const widget = { id: "widget0001", agency: "A", color: "#000000", ctaText: "x", whiteLabel: false, createdAt: "" };
await saveWidgetLead(widget, { email: "w@b.co", url: "https://b.co", score: 71.6 }, { url: "https://b.co", title: "", scores: {} as never, issues: 0, top: [] });
assert.equal(calls[0].table, "widget_leads");
assert.equal(calls[0].body.widget_id, "widget0001");
assert.equal(calls[0].body.score, 72);
listed = [
  { id: "l1", widget_id: "widget0001", email: "w@b.co", name: null, url: "https://b.co", score: 72, created_at: "2026-11-08T00:00:00Z" },
  { id: "l2", widget_id: "other", email: "x@b.co", name: null, url: "https://c.co", score: 50, created_at: "2026-11-07T00:00:00Z" },
];
const own = await listWidgetLeads("widget0001");
assert.equal(own.length, 1);
assert.equal(own[0].widgetId, "widget0001");
console.log("✓ widget leads saved to widget_leads");
