import { db } from "./store";
import { mailConfigured, sendMail } from "./mail";
import { SITE_URL } from "./config";
import { APP_URL } from "./hosts";
import { BRAND } from "./brand";

/**
 * Emails sent at moments that matter for a team's plan: a trial about to end, a limit reached,
 * a weekly check that found a drop. Each kind goes once per team per period (lifecycle_emails),
 * so a busy cron run or a retried webhook can't send it twice.
 */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export const dashboardUrl = (query = "") => `${APP_URL || SITE_URL}/dashboard${query}`;

/** Emails of the organisation's owners. */
export async function ownerEmails(orgId: string): Promise<string[]> {
  const { data, error } = await db().from("memberships").select("user_id").eq("org_id", orgId).eq("role", "owner");
  if (error) throw new Error(`Database read failed: ${error.message}`);
  const out: string[] = [];
  for (const m of data ?? []) {
    const u = await db().auth.admin.getUserById(m.user_id as string).catch(() => null);
    if (u?.data.user?.email) out.push(u.data.user.email);
  }
  return out;
}

/** A short plain email with one button, as HTML and text. */
export function simpleEmail(heading: string, lines: string[], button: { label: string; href: string }): { html: string; text: string } {
  const html = `<h2>${esc(heading)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p><a href="${esc(button.href)}">${esc(button.label)}</a></p><p style="color:#56677a;font-size:13px">${esc(BRAND.name)}</p>`;
  const text = [heading, "", ...lines, "", `${button.label}: ${button.href}`].join("\n");
  return { html, text };
}

export type LifecycleKind = "trial_ending" | "limit_reports" | "limit_credits" | "limit_sites";
export const thisMonth = () => new Date().toISOString().slice(0, 7);

/**
 * Sends a lifecycle email to the team's owners unless that kind already went out this period.
 * Returns true when it was sent (or would have been, without SMTP: the record still stops repeats).
 */
export async function sendOnce(orgId: string, kind: LifecycleKind, period: string, subject: string, body: { html: string; text: string }): Promise<boolean> {
  const { error } = await db().from("lifecycle_emails").insert({ org_id: orgId, kind, period });
  if (error) {
    if (error.code === "23505") return false; // already sent this period
    throw new Error(`Database write failed: ${error.message}`);
  }
  if (!mailConfigured()) return true;
  for (const to of await ownerEmails(orgId)) await sendMail(to, subject, body.html, body.text).catch((e) => console.error("Lifecycle email failed:", e));
  return true;
}

/** The trial ends in a few days: say when, and what happens next. Stripe sends trial_will_end 3 days before. */
export async function trialEndingEmail(orgId: string, endsAt: Date | null): Promise<boolean> {
  const when = endsAt ? endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "in a few days";
  return sendOnce(orgId, "trial_ending", endsAt ? endsAt.toISOString().slice(0, 10) : thisMonth(), `Your ${BRAND.name} trial ends ${endsAt ? `on ${when}` : "soon"}`,
    simpleEmail("Your free trial ends soon", [
      `Your trial ends ${endsAt ? `on ${when}` : "in a few days"}. After that, your card is charged and your plan carries on as it is now.`,
      "To change plan or cancel before you're charged, open Manage billing in your dashboard.",
    ], { label: "Manage billing", href: dashboardUrl("?tab=plan") }));
}

const LIMIT_COPY: Record<"limit_reports" | "limit_credits" | "limit_sites", { subject: string; line: string }> = {
  limit_reports: { subject: "You've used this month's full reports", line: "Your team has run every full site report included this month." },
  limit_credits: { subject: "You've used this month's AI credits", line: "Your team has used every AI credit included this month." },
  limit_sites: { subject: "Your saved sites are full", line: "Your team has saved as many websites as its plan includes." },
};

/** A team hit a plan limit: tell the owners once a month, with the ways to get more. */
export async function limitEmail(orgId: string, kind: "limit_reports" | "limit_credits" | "limit_sites"): Promise<boolean> {
  const c = LIMIT_COPY[kind];
  return sendOnce(orgId, kind, thisMonth(), c.subject,
    simpleEmail(c.subject, [c.line, "Upgrade for higher limits, or buy a one-off report or a credit pack. Your limits reset at the start of next month."], { label: "See plans and options", href: dashboardUrl("?tab=plan") }));
}

/** The line added to a weekly-check alert for free teams, pointing at what Pro adds. */
export const DROP_UPSELL = "On Pro, weekly checks also compare you with up to 3 competitors and track how AI assistants mention you, so you can see why a score moved.";
