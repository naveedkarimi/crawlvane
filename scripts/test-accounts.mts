// Tests account helpers that don't need a live database: `npm test`
import assert from "node:assert/strict";

const { normalizeSiteUrl } = await import("../lib/accounts");
const { sparklinePath } = await import("../lib/sparkline");

assert.deepEqual(normalizeSiteUrl("Example.com/pricing?x=1"), { url: "https://example.com", domain: "example.com" });
assert.deepEqual(normalizeSiteUrl("http://www.shop.example.co.uk"), { url: "http://www.shop.example.co.uk", domain: "shop.example.co.uk" });
assert.equal(typeof normalizeSiteUrl(""), "string");
assert.equal(typeof normalizeSiteUrl("localhost"), "string");
assert.equal(typeof normalizeSiteUrl("ftp://example.com"), "string");
console.log("✓ saved site addresses are normalised");

assert.equal(sparklinePath([]), "");
const p = sparklinePath([0, 50, 100], 120, 32, 3);
assert.match(p, /^M3\.0 29\.0 L60\.0 16\.0 L117\.0 3\.0$/);
assert.match(sparklinePath([70]), /^M.* L.*$/);
console.log("✓ score trend line");

delete process.env.FEATURE_ACCOUNTS;
const { requireAccount } = await import("../lib/apiAuth");
const r = await requireAccount(new Request("http://x/api/me"));
assert.ok(r instanceof Response && r.status === 404);
console.log("✓ account routes stay closed until accounts are switched on");
