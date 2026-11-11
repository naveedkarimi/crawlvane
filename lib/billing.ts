import Stripe from "stripe";
import { BRAND } from "./brand";
import { db } from "./store";
import { addPack, type PlanId } from "./entitlements";
import type { Account } from "./accounts";

/**
 * Stripe payments: Pro and Agency subscriptions, one-off reports and AI credit packs.
 * Prices live in Stripe; set their IDs in STRIPE_PRICE_PRO, STRIPE_PRICE_AGENCY, STRIPE_PRICE_REPORT and
 * STRIPE_PRICE_CREDITS. The webhook is the only thing that changes a plan.
 */
export type Item = "pro" | "agency" | "pro_yearly" | "agency_yearly" | "report" | "credits";
export const ITEMS: Item[] = ["pro", "agency", "pro_yearly", "agency_yearly", "report", "credits"];
const PRICE_ENV: Record<Item, string> = {
  pro: "STRIPE_PRICE_PRO",
  agency: "STRIPE_PRICE_AGENCY",
  // Yearly prices are optional: set them to offer a discount for paying a year up front.
  pro_yearly: "STRIPE_PRICE_PRO_YEARLY",
  agency_yearly: "STRIPE_PRICE_AGENCY_YEARLY",
  report: "STRIPE_PRICE_REPORT",
  credits: "STRIPE_PRICE_CREDITS",
};
/** The plan a subscription item gives, or null for one-off purchases. */
export const planOfItem = (item: Item): PlanId | null => (item === "pro" || item === "pro_yearly" ? "pro" : item === "agency" || item === "agency_yearly" ? "agency" : null);
/** Free trial for a team's first subscription, in days. 0 or unset means no trial. */
export const trialDays = () => Math.min(60, Math.max(0, Number(process.env.STRIPE_TRIAL_DAYS || 0) || 0));
/** What the dashboard can offer: yearly billing and a trial, when they're set up. */
export const billingOptions = () => ({ yearly: { pro: !!priceFor("pro_yearly"), agency: !!priceFor("agency_yearly") }, trialDays: trialDays() });

export const creditsPerPack = () => Math.max(1, Number(process.env.CREDITS_PER_PACK ?? 100) || 100);
export const priceFor = (item: Item) => process.env[PRICE_ENV[item]]?.trim() || "";
export function planForPrice(priceId?: string | null): PlanId | null {
  if (!priceId) return null;
  if (priceId === priceFor("pro") || priceId === priceFor("pro_yearly")) return "pro";
  if (priceId === priceFor("agency") || priceId === priceFor("agency_yearly")) return "agency";
  return null;
}

export class BillingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new BillingError("Payments aren't set up yet.", 503);
  client ??= new Stripe(key);
  return client;
}

/** Where Stripe sends people back to: this site's own address only. */
import { APP_URL } from "./hosts";
export function returnOrigin(req: Request): string {
  const o = req.headers.get("origin") ?? "";
  // Stripe and invite links go back to the app's address when it has its own.
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) || o === BRAND.url || (APP_URL && o === APP_URL) ? o : APP_URL || BRAND.url;
}

interface OrgBilling { id: string; plan: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; plan_status: string | null }

async function orgBilling(orgId: string): Promise<OrgBilling> {
  const { data, error } = await db().from("organizations").select("id, plan, stripe_customer_id, stripe_subscription_id, plan_status").eq("id", orgId).single();
  if (error) throw new Error(`Database read failed: ${error.message}`);
  return data as OrgBilling;
}

async function ensureCustomer(org: OrgBilling, email: string): Promise<string> {
  if (org.stripe_customer_id) return org.stripe_customer_id;
  const c = await stripe().customers.create({ email, metadata: { org_id: org.id } });
  const { error } = await db().from("organizations").update({ stripe_customer_id: c.id }).eq("id", org.id);
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return c.id;
}

export async function createPortal(account: Account, origin: string): Promise<string> {
  if (account.role !== "owner") throw new BillingError("Only the team owner can manage billing.", 403);
  const org = await orgBilling(account.org.id);
  if (!org.stripe_customer_id) throw new BillingError("There's no billing account yet. Choose a plan first.", 400);
  const s = await stripe().billingPortal.sessions.create({ customer: org.stripe_customer_id, return_url: `${origin}/dashboard?tab=plan` });
  return s.url;
}

export async function createCheckout(account: Account, item: Item, origin: string): Promise<string> {
  if (account.role !== "owner") throw new BillingError("Only the team owner can change the plan.", 403);
  const price = priceFor(item);
  if (!price) throw new BillingError("This option isn't set up yet.", 503);
  const org = await orgBilling(account.org.id);
  const plan = planOfItem(item);
  const subscription = plan !== null;
  if (subscription && org.plan === plan) throw new BillingError(`You're already on the ${plan === "pro" ? "Pro" : "Agency"} plan. Switch between monthly and yearly in Manage billing.`);
  // Already subscribed: switch plans in the customer portal instead of starting a second subscription.
  if (subscription && org.stripe_subscription_id && org.plan_status !== "canceled") return createPortal(account, origin);
  const customer = await ensureCustomer(org, account.user.email);
  const meta = { org_id: org.id, item };
  const s = await stripe().checkout.sessions.create({
    mode: subscription ? "subscription" : "payment",
    customer,
    client_reference_id: org.id,
    line_items: [{ price, quantity: 1 }],
    metadata: meta,
    // A trial only for a team's first subscription, so it can't be repeated by cancelling.
    ...(subscription
      ? { subscription_data: { metadata: meta, ...(trialDays() && !org.stripe_subscription_id ? { trial_period_days: trialDays() } : {}) } }
      : { payment_intent_data: { metadata: meta } }),
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?tab=plan&billing=success`,
    cancel_url: `${origin}/dashboard?tab=plan&billing=cancelled`,
  });
  if (!s.url) throw new BillingError("Stripe didn't return a checkout page. Try again.", 502);
  return s.url;
}

/** Checks the Stripe signature. Throws when the body was changed or didn't come from Stripe. */
export function verifyWebhook(body: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new BillingError("Webhooks aren't set up yet.", 503);
  if (!signature) throw new BillingError("Missing signature.", 400);
  return stripe().webhooks.constructEvent(body, signature, secret);
}

export interface OrgBillingUpdate {
  plan?: PlanId;
  plan_status?: string;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string;
  current_period_end?: string | null;
}

export interface BillingDeps {
  /** Records the event; true when it was already handled (Stripe can send an event more than once). */
  seen(eventId: string): Promise<boolean>;
  forget(eventId: string): Promise<void>;
  orgForCustomer(customerId: string): Promise<string | null>;
  update(orgId: string, u: OrgBillingUpdate): Promise<void>;
  addPack(orgId: string, kind: "ai" | "report", amount: number, reason: string): Promise<void>;
}

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : x?.id ?? "");

/** Applies one Stripe event. Returns what it did, for the log. */
export async function handleEvent(event: Stripe.Event, deps: BillingDeps): Promise<string> {
  if (await deps.seen(event.id)) return "already handled";
  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const orgId = s.metadata?.org_id || s.client_reference_id || (s.customer ? await deps.orgForCustomer(idOf(s.customer)) : null);
      if (!orgId) return "no organisation";
      if (s.customer) await deps.update(orgId, { stripe_customer_id: idOf(s.customer) });
      if (s.mode === "payment" && s.payment_status === "paid") {
        if (s.metadata?.item === "report") { await deps.addPack(orgId, "report", 1, "one-off report"); return "added a one-off report"; }
        if (s.metadata?.item === "credits") { await deps.addPack(orgId, "ai", creditsPerPack(), "credit pack"); return `added ${creditsPerPack()} credits`; }
      }
      return "checkout recorded";
    }
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.org_id || (await deps.orgForCustomer(idOf(sub.customer)));
      if (!orgId) return "no organisation";
      const item = sub.items?.data?.[0];
      const live = event.type !== "customer.subscription.deleted" && ["active", "trialing", "past_due"].includes(sub.status);
      const plan: PlanId = live ? planForPrice(item?.price?.id) ?? "free" : "free";
      const end = (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
      await deps.update(orgId, {
        plan,
        plan_status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
        stripe_subscription_id: live ? sub.id : null,
        stripe_customer_id: idOf(sub.customer),
        current_period_end: end ? new Date(end * 1000).toISOString() : null,
      });
      return `plan set to ${plan}`;
    }
    return "ignored";
  } catch (e) {
    await deps.forget(event.id).catch(() => {});
    throw e;
  }
}

export const liveDeps: BillingDeps = {
  async seen(id) {
    const { error } = await db().from("stripe_events").insert({ id });
    if (!error) return false;
    if (error.code === "23505") return true;
    throw new Error(`Database write failed: ${error.message}`);
  },
  async forget(id) {
    await db().from("stripe_events").delete().eq("id", id);
  },
  async orgForCustomer(customerId) {
    if (!customerId) return null;
    const { data } = await db().from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    return (data?.id as string) ?? null;
  },
  async update(orgId, u) {
    const { error } = await db().from("organizations").update(u).eq("id", orgId);
    if (error) throw new Error(`Database write failed: ${error.message}`);
  },
  addPack,
};
