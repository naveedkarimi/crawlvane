// Tests for the AI bot access classifier: `npm test`
import assert from "node:assert/strict";
import { classify } from "../lib/botTest";

const page = (status: number, body: string) => ({ url: "https://x.example/", ok: status < 400, status, body, headers: {}, redirects: [], ms: 100, bytes: body.length });
const article = "<html><body><main>" + "Real words people read on this page. ".repeat(40) + "</main></body></html>";
const browser = page(200, article);

assert.equal(classify(page(200, article), browser).live, "ok");
assert.equal(classify(page(403, "Forbidden"), browser).live, "blocked");
assert.equal(classify(page(429, "Slow down"), browser).live, "blocked");
assert.equal(classify(page(403, '<html><head><title>Just a moment...</title></head><body><div id="cf-chl-widget"></div></body></html>'), browser).live, "challenge");
assert.equal(classify(page(200, "<html><body><p>Access denied for bots.</p></body></html>"), browser).live, "different");
assert.equal(classify({ ...page(0, ""), error: "timeout" }, browser).live, "error");
console.log("✓ AI bot access classifier");
