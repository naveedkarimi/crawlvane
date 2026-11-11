// Tests the visitor → free → Pro → Agency ladder, trials and yearly billing: `npm test`
import assert from "node:assert/strict";

process.env.FEATURE_ACCOUNTS = "1";
process.env.SIGNUP_GATE = "1";
process.env.STRIPE_PRICE_PRO = "price_pro";
process.env.STRIPE_PRICE_PRO_YEARLY = "price_pro_y";
process.env.STRIPE_PRICE_AGENCY = "price_agency";
process.env.STRIPE_TRIAL_DAYS = "14";

const { SIGNUP_GATE, lockFixes, ladder, visitorBlocked } = await import("../lib/tiers");
assert.equal(SIGNUP_GATE, true);
assert.equal(visitorBlocked(false), true);
assert.equal(visitorBlocked(true), false);

const check = (id: string, status: "fail" | "warn" | "pass", weight: 1 | 2 | 3, fix = "do this") => ({ id, category: "seo" as const, group: "g", title: id, status, detail: "d", fix, weight });
const locked = lockFixes([check("a", "warn", 3), check("b", "fail", 1), check("c", "fail", 3), check("d", "pass", 3), check("e", "warn", 1), check("f", "fail", 2)], 3);
const shown = locked.filter((c) => c.fix).map((c) => c.id).sort();
// Failures first, by weight: c (3), f (2), b (1). Warnings a and e are locked. Passing d keeps its tip.
assert.deepEqual(shown, ["b", "c", "d", "f"]);
assert.ok(locked.find((c) => c.id === "a")?.fixLocked && locked.find((c) => c.id === "e")?.fixLocked);
assert.equal(locked.find((c) => c.id === "d")?.fixLocked, undefined);
assert.equal(locked.length, 6);
console.log("✓ visitors see the 3 most important fixes; the rest need a free account");

const rows = ladder();
const row = (label: string) => rows.find((r) => r.label.startsWith(label))!.cells;
assert.equal(row("How to fix").visitor, "First 3");
assert.equal(row("AI fix plan").visitor, false);
assert.equal(row("Saved websites").free, "1");
assert.equal(row("Your branding").agency, true);
assert.equal(row("Your branding").pro, false);
console.log("✓ the pricing comparison follows the enforced limits");

const { planForPrice, planOfItem, trialDays, billingOptions, ITEMS } = await import("../lib/billing");
assert.equal(planForPrice("price_pro_y"), "pro");
assert.equal(planOfItem("agency_yearly"), "agency");
assert.equal(planOfItem("credits"), null);
assert.ok(ITEMS.includes("pro_yearly"));
assert.equal(trialDays(), 14);
assert.deepEqual(billingOptions(), { yearly: { pro: true, agency: false }, trialDays: 14 });
process.env.STRIPE_TRIAL_DAYS = "999";
assert.equal(trialDays(), 60);
console.log("✓ yearly prices map to plans, and trials are capped at 60 days");
