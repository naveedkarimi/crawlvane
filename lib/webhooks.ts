import { createHmac, randomBytes } from "node:crypto";
import { db } from "./store";
import { assertPublicUrl, guardedFetch } from "./safeFetch";
import { BRAND } from "./brand";

/**
 * A team webhook for Zapier, Make or your own code. Events: "alert.created" and "report.completed".
 * Each POST is JSON with a signature header: HMAC-SHA256 of the raw body with the team's secret,
 * as `sha256=<hex>`, so the receiver can check it came from us.
 */
export type WebhookEvent = "alert.created" | "report.completed";
export const SIGNATURE_HEADER = "x-webhook-signature";

export class WebhookError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const sign = (secret: string, body: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

export async function getWebhook(orgId: string): Promise<{ url: string } | null> {
  const { data } = await db().from("organizations").select("webhook_url").eq("id", orgId).maybeSingle();
  return data?.webhook_url ? { url: data.webhook_url as string } : null;
}

/** Saves the webhook (after a test ping) and returns a new signing secret, shown once. An empty URL removes it. */
export async function setWebhook(orgId: string, raw: string): Promise<{ secret: string | null }> {
  const url = raw.trim();
  if (!url) {
    await db().from("organizations").update({ webhook_url: null, webhook_secret: null }).eq("id", orgId);
    return { secret: null };
  }
  if (!/^https:\/\//i.test(url) || url.length > 500) throw new WebhookError("Use an https:// address.");
  await assertPublicUrl(url).catch(() => { throw new WebhookError("That address isn't a public website."); });
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const ok = await post(url, secret, { event: "webhook.test", message: `${BRAND.name} webhooks are connected.` }).catch(() => false);
  if (!ok) throw new WebhookError("The address didn't accept a test request (it must answer with a 2xx status).");
  const { error } = await db().from("organizations").update({ webhook_url: url, webhook_secret: secret }).eq("id", orgId);
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return { secret };
}

async function post(url: string, secret: string, payload: Record<string, unknown>): Promise<boolean> {
  const target = await assertPublicUrl(url);
  const body = JSON.stringify({ ...payload, sentAt: new Date().toISOString() });
  const res = await guardedFetch(target, { method: "POST", headers: { "content-type": "application/json", [SIGNATURE_HEADER]: sign(secret, body), "user-agent": `${BRAND.name.replace(/[^A-Za-z0-9]/g, "")}-Webhooks/1.0` }, body, redirect: "manual", signal: AbortSignal.timeout(8000) });
  await res.body?.cancel().catch(() => {});
  return res.status >= 200 && res.status < 300;
}

/** Sends an event to the team's webhook, if it has one. Never throws. */
export async function emitWebhook(orgId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  try {
    const { data: org } = await db().from("organizations").select("webhook_url, webhook_secret").eq("id", orgId).maybeSingle();
    if (org?.webhook_url && org.webhook_secret) await post(org.webhook_url as string, org.webhook_secret as string, { event, ...data });
  } catch (e) {
    console.error("Webhook failed:", e instanceof Error ? e.message : e);
  }
}

/** report.completed for the team that ran the report, if any. */
export async function emitReportCompleted(reportId: string, payload: { url: string; scores: unknown; pagesCrawled: number; link: string }): Promise<void> {
  try {
    const { data } = await db().from("org_reports").select("org_id").eq("report_id", reportId).maybeSingle();
    if (data?.org_id) await emitWebhook(data.org_id as string, "report.completed", { reportId, ...payload });
  } catch {
    /* no team, nothing to send */
  }
}
