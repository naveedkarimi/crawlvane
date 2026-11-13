import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { db } from "./store";
import { SITE_URL } from "./config";

/**
 * Referrals: every team gets a link (/?ref=CODE). A team that signs up through it in its first
 * REFERRAL_WINDOW_DAYS is linked to the referrer. When the new team first pays (an active, non-trial
 * subscription), the referrer earns one free month: the price of one month of its own plan, added as
 * Stripe credit on its next invoice. If the referrer isn't paying yet, the reward waits until it is.
 */
export const REFERRAL_WINDOW_DAYS = 14;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export class ReferralError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** 8 characters without look-alikes (no 0/o, 1/l/i). */
export function makeReferralCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const isReferralCode = (c: unknown): c is string => typeof c === "string" && /^[a-hj-km-np-z2-9]{8}$/.test(c);
export const referralLink = (code: string) => `${SITE_URL}/?ref=${code}`;

/** The value of one month of a recurring price, in its smallest unit (cents). Yearly prices count as a twelfth. */
export function oneMonthValue(price: { unit_amount?: number | null; recurring?: { interval?: string; interval_count?: number } | null } | null | undefined): number {
  const amount = Number(price?.unit_amount) || 0;
  if (!amount || !price?.recurring) return 0;
  const n = Math.max(1, Number(price.recurring.interval_count) || 1);
  const months = price.recurring.interval === "year" ? 12 * n : price.recurring.interval === "month" ? n : price.recurring.interval === "week" ? n / 4.345 : n / 30.44;
  return Math.round(amount / months);
}

/** The team's referral code, made on first use. */
export async function referralCode(orgId: string): Promise<string> {
  const { data, error } = await db().from("organizations").select("referral_code").eq("id", orgId).single();
  if (error) throw new Error(`Database read failed: ${error.message}`);
  if (data?.referral_code) return data.referral_code as string;
  for (let i = 0; i < 5; i++) {
    const code = makeReferralCode();
    const { error: e } = await db().from("organizations").update({ referral_code: code }).eq("id", orgId).is("referral_code", null);
    if (!e) {
      const { data: again } = await db().from("organizations").select("referral_code").eq("id", orgId).single();
      if (again?.referral_code) return again.referral_code as string;
    } else if (e.code !== "23505") throw new Error(`Database write failed: ${e.message}`);
  }
  throw new Error("Couldn't make a referral code. Try again.");
}

/**
 * Links a new team to the team that referred it. Only for teams made in the last few days, never to
 * themselves, and only once.
 */
export async function applyReferral(orgId: string, code: string): Promise<"linked" | "already" | "too-late" | "unknown" | "self"> {
  if (!isReferralCode(code)) return "unknown";
  const { data: me, error } = await db().from("organizations").select("id, created_at, referred_by, referral_code").eq("id", orgId).single();
  if (error) throw new Error(`Database read failed: ${error.message}`);
  if (me.referred_by) return "already";
  if (me.referral_code === code) return "self";
  if (Date.now() - Date.parse(me.created_at as string) > REFERRAL_WINDOW_DAYS * 86400000) return "too-late";
  const { data: ref } = await db().from("organizations").select("id").eq("referral_code", code).maybeSingle();
  if (!ref) return "unknown";
  if (ref.id === orgId) return "self";
  const { error: e2 } = await db().from("organizations").update({ referred_by: ref.id }).eq("id", orgId).is("referred_by", null);
  if (e2) throw new Error(`Database write failed: ${e2.message}`);
  return "linked";
}

export interface ReferralStats { code: string; link: string; referred: number; paying: number; monthsEarned: number; monthsWaiting: number }

export async function referralStats(orgId: string): Promise<ReferralStats> {
  const code = await referralCode(orgId);
  const [{ count: referred }, { data: rewards }] = await Promise.all([
    db().from("organizations").select("id", { count: "exact", head: true }).eq("referred_by", orgId),
    db().from("referral_rewards").select("status").eq("referrer_org", orgId),
  ]);
  const list = rewards ?? [];
  return {
    code,
    link: referralLink(code),
    referred: referred ?? 0,
    paying: list.length,
    monthsEarned: list.filter((r) => r.status === "applied").length,
    monthsWaiting: list.filter((r) => r.status === "pending").length,
  };
}

/** Called when a team's subscription becomes active: record a reward for its referrer, then pay out what can be paid. */
export async function onTeamPaid(orgId: string, stripe: () => Stripe): Promise<void> {
  const { data: me } = await db().from("organizations").select("referred_by").eq("id", orgId).maybeSingle();
  if (me?.referred_by) {
    // referred_org is unique, so a team only ever earns its referrer one month.
    const { error } = await db().from("referral_rewards").insert({ referrer_org: me.referred_by, referred_org: orgId });
    if (error && error.code !== "23505") throw new Error(`Database write failed: ${error.message}`);
    await applyPendingRewards(me.referred_by as string, stripe).catch((e) => console.error("Referral reward failed:", e));
  }
  // This team may itself be a referrer whose rewards were waiting for it to subscribe.
  await applyPendingRewards(orgId, stripe).catch((e) => console.error("Referral reward failed:", e));
}

/** Turns waiting rewards into Stripe credit, when the referrer has an active paid subscription. */
export async function applyPendingRewards(orgId: string, stripe: () => Stripe): Promise<number> {
  const { data: pending } = await db().from("referral_rewards").select("id").eq("referrer_org", orgId).eq("status", "pending");
  if (!pending?.length) return 0;
  const { data: org } = await db().from("organizations").select("plan, stripe_customer_id, stripe_subscription_id").eq("id", orgId).single();
  if (!org?.stripe_customer_id || !org.stripe_subscription_id || org.plan === "free") return 0;
  const sub = await stripe().subscriptions.retrieve(org.stripe_subscription_id as string);
  if (!["active", "trialing", "past_due"].includes(sub.status)) return 0;
  const { planForPrice } = await import("./billing");
  const planItem = sub.items.data.find((i) => planForPrice(i.price.id)) ?? sub.items.data[0];
  const value = oneMonthValue(planItem?.price);
  if (!value) return 0;
  let applied = 0;
  for (const r of pending) {
    // Mark first so a retry can't credit twice; the credit is the part that can fail.
    const { data: claimed } = await db().from("referral_rewards").update({ status: "applied", applied_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending").select("id");
    if (!claimed?.length) continue;
    try {
      await stripe().customers.createBalanceTransaction(org.stripe_customer_id as string, {
        amount: -value,
        currency: planItem.price.currency,
        description: "Referral reward: one free month",
      });
      applied++;
    } catch (e) {
      await db().from("referral_rewards").update({ status: "pending", applied_at: null }).eq("id", r.id);
      throw e;
    }
  }
  return applied;
}
