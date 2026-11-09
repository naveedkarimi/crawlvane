// Tests the site statistics record: domain only, nothing personal: `npm test`
import assert from "node:assert/strict";

let calls: { url: URL; body: any }[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  calls.push({ url: new URL(String(input instanceof Request ? input.url : input)), body: JSON.parse(String(init.body)) });
  return new Response(null, { status: 201 });
}) as typeof fetch;

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
const { domainOf, pathOf, saveSiteCheck, saveSitePages } = await import("../lib/siteChecks");

assert.equal(domainOf("https://www.Example.com/private/page?token=abc#x"), "example.com");
assert.equal(domainOf("shop.example.co.uk"), "shop.example.co.uk");
assert.equal(domainOf("http://"), null);
assert.equal(pathOf("https://www.Example.com/private/page?token=abc#x"), "/private/page");
assert.equal(pathOf("example.com"), "/");
console.log("✓ site check keeps the domain and path only");

await saveSiteCheck({
  url: "https://www.example.com/account?email=a@b.co",
  tool: "page-check",
  scores: { overall: 58 },
  checks: [{ id: "h1", status: "fail" }, { id: "title", status: "warn" }, { id: "https", status: "pass" }],
});
assert.ok(calls[0].url.pathname.endsWith("/site_checks"));
assert.deepEqual(calls[0].body, { domain: "example.com", path: "/account", tool: "page-check", scores: { overall: 58 }, failed_checks: ["h1"] });
console.log("✓ site check saves only domain, path, tool, scores and failed checks");

calls = [];
await saveSiteCheck({ url: "http://", tool: "page-check" });
assert.equal(calls.length, 0);
console.log("✓ site check skips an unreadable address");

calls = [];
await saveSitePages([
  { url: "https://www.example.com/", scores: { overall: 80 }, fails: [] },
  { url: "https://www.example.com/pricing?utm=1", scores: { overall: 60 }, fails: ["h1"] },
]);
assert.equal(calls.length, 1);
assert.deepEqual(calls[0].body, [
  { domain: "example.com", path: "/", tool: "full-report", scores: { overall: 80 }, failed_checks: [] },
  { domain: "example.com", path: "/pricing", tool: "full-report", scores: { overall: 60 }, failed_checks: ["h1"] },
]);
console.log("✓ every crawled page gets a row");
