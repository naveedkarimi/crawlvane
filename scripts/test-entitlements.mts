// Tests plan rules with the paywall switched on: `npm test`
import assert from "node:assert/strict";

process.env.PAYWALL_ENABLED = "1";
const { planAllowsFor, limitsFor, splitSpend, planOf, spendCredits, useFullReport, PaywallError } = await import("../lib/entitlements");

assert.equal(planOf({ plan: "pro" }), "pro");
assert.equal(planOf({ plan: "enterprise" }), "free");
assert.equal(planOf(null), "free");
assert.equal(planAllowsFor({ plan: "free" }, "pagespeed"), true);
assert.equal(planAllowsFor({ plan: "free" }, "competitors"), false);
assert.equal(planAllowsFor({ plan: "pro" }, "competitors"), true);
assert.equal(planAllowsFor({ plan: "pro" }, "whiteLabel"), false);
assert.equal(planAllowsFor({ plan: "agency" }, "whiteLabel"), true);
assert.equal(limitsFor({ plan: "free" }).sites, 1);
assert.equal(limitsFor({ plan: "agency" }).seats, 10);
console.log("✓ plan features and limits");

assert.deepEqual(splitSpend(3, 5, 0), { fromAllowance: 3, fromPacks: 0 });
assert.deepEqual(splitSpend(8, 5, 10), { fromAllowance: 5, fromPacks: 3 });
assert.deepEqual(splitSpend(4, -2, 4), { fromAllowance: 0, fromPacks: 4 });
assert.equal(splitSpend(8, 5, 2), null);
console.log("✓ credits come from the allowance first, then packs");

await assert.rejects(spendCredits(null, 1, "x"), (e: unknown) => e instanceof PaywallError && e.status === 401);
await assert.rejects(useFullReport(null), (e: unknown) => e instanceof PaywallError && e.status === 401);
await spendCredits(null, 0, "nothing to pay");
console.log("✓ paid features ask visitors to sign in");
