// Tests Stripe webhook handling without calling Stripe: `npm test`
import assert from "node:assert/strict";
import Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
process.env.STRIPE_PRICE_PRO = "price_pro";
process.env.STRIPE_PRICE_AGENCY = "price_agency";
process.env.CREDITS_PER_PACK = "100";
const { handleEvent, planForPrice, verifyWebhook } = await import("../lib/billing");

assert.equal(planForPrice("price_pro"), "pro");
assert.equal(planForPrice("price_agency"), "agency");
assert.equal(planForPrice("price_other"), null);
console.log("✓ Stripe prices map to plans");

const payload = JSON.stringify({ id: "evt_1", type: "ping", data: { object: {} } });
const sig = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload, secret: "whsec_test_secret" });
assert.equal(verifyWebhook(payload, sig).id, "evt_1");
assert.throws(() => verifyWebhook(payload.replace("ping", "pong"), sig));
assert.throws(() => verifyWebhook(payload, null));
console.log("✓ webhooks must carry a valid Stripe signature");

const log: string[] = [];
const seenIds = new Set<string>();
const deps = {
  seen: async (id: string) => (seenIds.has(id) ? true : (seenIds.add(id), false)),
  forget: async (id: string) => void seenIds.delete(id),
  orgForCustomer: async (c: string) => (c === "cus_1" ? "org_1" : null),
  update: async (org: string, u: Record<string, unknown>) => void log.push(`update ${org} ${JSON.stringify(u)}`),
  addPack: async (org: string, kind: string, n: number) => void log.push(`pack ${org} ${kind} ${n}`),
};
const ev = (id: string, type: string, object: unknown) => ({ id, type, data: { object } }) as unknown as Stripe.Event;

assert.equal(await handleEvent(ev("e1", "checkout.session.completed", { mode: "payment", payment_status: "paid", customer: "cus_1", metadata: { org_id: "org_1", item: "credits" } }), deps), "added 100 credits");
assert.equal(await handleEvent(ev("e1", "checkout.session.completed", { mode: "payment", payment_status: "paid", customer: "cus_1", metadata: { org_id: "org_1", item: "credits" } }), deps), "already handled");
assert.equal(log.filter((l) => l.startsWith("pack")).length, 1);
await handleEvent(ev("e2", "checkout.session.completed", { mode: "payment", payment_status: "unpaid", metadata: { org_id: "org_1", item: "report" } }), deps);
assert.equal(log.filter((l) => l.includes("report")).length, 0);
console.log("✓ packs are added once, and only when paid");

const sub = (status: string, price: string) => ({ id: "sub_1", status, customer: "cus_1", metadata: {}, items: { data: [{ price: { id: price }, current_period_end: 1798761600 }] } });
assert.equal(await handleEvent(ev("e3", "customer.subscription.created", sub("active", "price_pro")), deps), "plan set to pro");
assert.match(log.at(-1)!, /"plan":"pro".*"current_period_end":"2027-01-01/);
assert.equal(await handleEvent(ev("e4", "customer.subscription.updated", sub("past_due", "price_agency")), deps), "plan set to agency");
assert.equal(await handleEvent(ev("e5", "customer.subscription.updated", sub("unpaid", "price_agency")), deps), "plan set to free");
assert.equal(await handleEvent(ev("e6", "customer.subscription.deleted", sub("canceled", "price_pro")), deps), "plan set to free");
assert.match(log.at(-1)!, /"stripe_subscription_id":null/);
assert.equal(await handleEvent(ev("e7", "invoice.paid", {}), deps), "ignored");
console.log("✓ subscriptions set and clear the plan");

const failing = { ...deps, update: async () => { throw new Error("db down"); } };
await assert.rejects(handleEvent(ev("e8", "customer.subscription.created", sub("active", "price_pro")), failing));
assert.equal(seenIds.has("e8"), false);
console.log("✓ a failed event is retried by Stripe, not lost");
