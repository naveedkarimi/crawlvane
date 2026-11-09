// Tests for monitoring change detection: `npm test`
import assert from "node:assert/strict";
import { diffBaseline, nextBaseline, renderChanges, snapshotFromAudit, snapshotsFromCrawl, type PageSnapshot } from "../lib/drift";
import type { AuditResult } from "../lib/types";

const U = "https://acme.com/a";
const base: PageSnapshot = {
  status: 200, hasContent: true, title: "Mugs | Acme", description: "All the mugs.", canonical: U, h1: "Mugs",
  noindex: false, robotsBlocked: false, openGraph: true, schemaTypes: ["Organization", "Product"],
};
const rules = (now: Partial<PageSnapshot>) => diffBaseline({ [U]: base }, { [U]: { ...base, ...now } }).map((c) => `${c.severity}:${c.rule}`);

assert.deepEqual(rules({}), []);
assert.deepEqual(rules({ title: "mugs | acme", description: "ALL THE MUGS." }), [], "case-only edits are noise");
assert.deepEqual(rules({ noindex: true }), ["critical:noindex-added"]);
assert.deepEqual(rules({ robotsBlocked: true }), ["critical:robots-blocked"]);
assert.deepEqual(rules({ canonical: "" }), ["critical:canonical-removed"]);
assert.deepEqual(rules({ canonical: "https://acme.com/b" }), ["critical:canonical-changed"]);
assert.deepEqual(rules({ title: "" }), ["critical:title-removed"]);
assert.deepEqual(rules({ h1: "" }), ["critical:h1-removed"]);
assert.deepEqual(rules({ title: "New" }), ["warning:title-changed"]);
assert.deepEqual(rules({ h1: "New" }), ["warning:h1-changed"]);
assert.deepEqual(rules({ description: "" }), ["warning:description-removed"]);
assert.deepEqual(rules({ schemaTypes: ["Organization"] }), ["warning:schema-removed"]);
assert.deepEqual(rules({ schemaTypes: ["Organization", "Product", "WebSite"] }), [], "added schema isn't an alert");
assert.deepEqual(rules({ openGraph: false }), ["warning:open-graph-removed"]);
assert.deepEqual(rules({ status: 404, hasContent: false, title: "" }), ["critical:page-error"], "an error page reports one change, not every field");
assert.deepEqual(rules({ redirectedTo: "https://acme.com/z" }), ["warning:now-redirects"]);
assert.deepEqual(rules({ title: "", noindex: true }).sort(), ["critical:noindex-added", "critical:title-removed"]);
assert.deepEqual(diffBaseline({ [U]: base }, { [U]: { ...base, h1: "x", noindex: true } }).map((c) => c.severity), ["critical", "warning"], "critical first");
console.log("✓ drift rules");

// First run and new pages have nothing to compare against
assert.deepEqual(diffBaseline({}, { [U]: base }), []);

// Each change alerts once
let b = nextBaseline({ [U]: base }, { [U]: { ...base, title: "New" } });
assert.deepEqual(diffBaseline(b, { [U]: { ...base, title: "New" } }), []);

// An outage alerts once, and a change made during it still shows afterwards
const down = { ...base, status: 503, hasContent: false, title: "", h1: "", canonical: "", description: "", schemaTypes: [], openGraph: false };
b = nextBaseline({ [U]: base }, { [U]: down });
assert.equal(b[U].status, 503);
assert.equal(b[U].title, base.title);
assert.deepEqual(diffBaseline(b, { [U]: down }), [], "still down: no repeat");
assert.deepEqual(diffBaseline(b, { [U]: { ...base, noindex: true } }).map((c) => c.rule), ["noindex-added"]);

// Unknown results (blocked or network error) don't alert and keep the baseline
const crawl = snapshotsFromCrawl(new Map([[U, { status: 0, blocked: true }], ["https://acme.com/b", { status: 0 }], ["https://acme.com/c", { status: 403 }], ["https://acme.com/d", { status: 500 }]]));
assert.equal(crawl[U], null);
assert.equal(crawl["https://acme.com/b"], null);
assert.equal(crawl["https://acme.com/c"], null);
assert.equal(crawl["https://acme.com/d"]?.status, 500);
assert.deepEqual(diffBaseline({ [U]: base }, crawl), []);
assert.deepEqual(nextBaseline({ [U]: base }, crawl)[U], base);
// Pages no longer crawled drop out, so the stored baseline can't grow forever
assert.deepEqual(Object.keys(nextBaseline({ "https://acme.com/old": base }, { [U]: base })), [U]);
console.log("✓ drift baseline handling");

// Snapshot from a real audit shape
const audit = {
  checks: [{ id: "indexable", status: "fail" }, { id: "open-graph", status: "pass" }],
  facts: { status: 200, finalUrl: U, title: " Mugs  | Acme ", metaDescription: "d", canonical: "/a/", h1: ["Mugs", "Second"], schemaTypes: ["Product", "Organization"] },
} as unknown as AuditResult;
const snap = snapshotFromAudit(audit);
assert.equal(snap.title, "Mugs | Acme");
assert.equal(snap.canonical, U, "canonical resolved and trailing slash dropped");
assert.equal(snap.noindex, true);
assert.deepEqual(snap.schemaTypes, ["Organization", "Product"]);
console.log("✓ drift snapshot");

// Email: monitored sites control these strings
const evil = renderChanges([{ url: U, severity: "warning", rule: "title-changed", title: "Title changed", before: "a", after: '<img src=x onerror=alert(1)>"' }]);
assert.doesNotMatch(evil.html, /<img/);
assert.match(evil.text[0], /\[Changed\] Title changed/);
const many = renderChanges(Array.from({ length: 12 }, () => ({ url: U, severity: "critical" as const, rule: "r", title: "t", before: "a", after: "b" })));
assert.equal(many.text.at(-1), "...and 2 more.");
assert.match(many.html, /and 2 more/);
console.log("✓ drift email rendering");
