// Tests for the PageSpeed parser against trimmed real Lighthouse 13 output: `npm test`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePsi } from "../lib/pagespeed";

const load = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/psi-${n}-mobile.json`, import.meta.url), "utf8"));

// pixenlo: JavaScript-heavy page, no page-level field data, synthetic origin field data
const p = parsePsi(load("pixenlo"), "mobile", "https://pixenlo.example.com/");
assert.equal(p.scores.performance, 65);
assert.equal(p.opportunities[0].title, "Too much JavaScript work", "biggest time saving first");
assert.match(p.opportunities[0].savings ?? "", /3\.4 s/);
assert.ok(p.opportunities.length <= 5);
assert.ok(p.opportunities.every((o) => !["total-blocking-time", "speed-index", "interactive"].includes(o.id)), "metric rows are not fixes");
assert.equal(p.field.source, "origin", "falls back to whole-site field data");
assert.deepEqual(p.field.metrics.map((m) => m.key), ["LCP", "INP", "CLS"]);
assert.equal(p.field.metrics.find((m) => m.key === "CLS")?.value, "0.05");
assert.equal(p.lab.find((m) => m.key === "TBT")?.rating, "bad");
assert.ok(p.screenshot?.startsWith("data:image/"));
assert.match(p.reportUrl, /^https:\/\/pagespeed\.web\.dev\/report\?url=https%3A%2F%2Fpixenlo/);
console.log("✓ PageSpeed: JavaScript-heavy page");

// example.com: fast page; savings are bytes, not seconds; no field data at all
const n = parsePsi(load("sample"), "desktop", "https://example.com/");
assert.equal(n.strategy, "desktop");
assert.equal(n.opportunities[0].title, "Images are too large");
assert.equal(n.opportunities[0].who, "Content editor");
assert.match(n.opportunities[0].savings ?? "", /KiB/);
const titles = n.opportunities.map((o) => o.title);
assert.equal(new Set(titles).size, titles.length, "no repeated fixes (unused + legacy JavaScript merge)");
assert.equal(n.field.source, null);
console.log("✓ PageSpeed: byte savings, merged fixes, no field data");

// Empty or broken responses don't throw
const e = parsePsi({}, "mobile", "https://x.example/");
assert.equal(e.opportunities.length, 0);
assert.equal(e.scores.performance, 0);
console.log("✓ PageSpeed: empty response");
