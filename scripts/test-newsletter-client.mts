// Tests the browser-to-Supabase newsletter calls, against a fake API: `npm test`
import assert from "node:assert/strict";

const { submitLead, subscribeNewsletter, unsubscribeNewsletter } = await import("../lib/supabasePublic");

let last: { url: string; headers: Headers; body: any };
let reply = () => new Response(null, { status: 204 });
globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  last = { url: String(input), headers: new Headers(init.headers), body: JSON.parse(String(init.body)) };
  return reply();
}) as typeof fetch;

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
await assert.rejects(subscribeNewsletter("a@b.co"), /isn't set up/);
console.log("✓ newsletter explains missing settings");

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyPublic";
await subscribeNewsletter("a@b.co", "/pricing");
assert.equal(last!.url, "https://example.supabase.co/rest/v1/rpc/subscribe_newsletter");
assert.deepEqual(last!.body, { p_email: "a@b.co", p_source: "/pricing" });
assert.equal(last!.headers.get("apikey"), "eyPublic");
assert.equal(last!.headers.get("authorization"), "Bearer eyPublic");
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_x";
await subscribeNewsletter("a@b.co");
assert.equal(last!.headers.get("authorization"), null);
console.log("✓ newsletter calls the database function");

reply = () => new Response(JSON.stringify({ code: "22023", message: "Please enter a valid email address." }), { status: 400 });
await assert.rejects(subscribeNewsletter("nope"), /valid email/);
reply = () => new Response(JSON.stringify({ code: "PGRST202" }), { status: 404 });
await assert.rejects(subscribeNewsletter("a@b.co"), /couldn't save/);
console.log("✓ newsletter errors are readable");

reply = () => new Response(null, { status: 204 });
await submitLead({ kind: "fix", email: "a@b.co", url: "https://b.co", message: "budget", source: "/" });
assert.equal(last!.url, "https://example.supabase.co/rest/v1/rpc/submit_lead");
assert.deepEqual(last!.body, { p_kind: "fix", p_email: "a@b.co", p_name: null, p_url: "https://b.co", p_message: "budget", p_source: "/" });
console.log("✓ quote, contact and waitlist forms call the database function");

reply = () => new Response("true", { status: 200 });
assert.equal(await unsubscribeNewsletter("tok"), true);
assert.deepEqual(last!.body, { p_token: "tok" });
reply = () => new Response("false", { status: 200 });
assert.equal(await unsubscribeNewsletter("tok"), false);
console.log("✓ newsletter unsubscribe");
