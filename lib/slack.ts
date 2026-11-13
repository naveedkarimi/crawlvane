import { db } from "./store";
import { assertPublicUrl, guardedFetch } from "./safeFetch";
import { BRAND } from "./brand";
import { dashboardUrl } from "./lifecycle";

/**
 * Alerts to Slack. A team pastes an incoming-webhook URL (Slack → Apps → Incoming Webhooks) in
 * Settings; every dashboard alert is then posted there too. Only hooks.slack.com URLs are accepted,
 * and each send goes through the private-network guard.
 */
const SLACK_HOOK = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/[A-Za-z0-9]+$/;
export const isSlackWebhook = (u: unknown): u is string => typeof u === "string" && SLACK_HOOK.test(u.trim());

export class SlackError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Slack's mrkdwn treats & < > specially. */
const mrkdwn = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The message Slack shows for one alert. */
export function slackMessage(kind: string, title: string, detail?: string | null): { text: string } {
  const icon = kind === "fail" ? ":red_circle:" : kind === "warn" ? ":large_orange_circle:" : kind === "pass" ? ":large_green_circle:" : ":information_source:";
  const lines = [`${icon} *${mrkdwn(title)}*`, detail ? mrkdwn(detail) : "", `<${dashboardUrl("?tab=alerts")}|Open in ${mrkdwn(BRAND.name)}>`].filter(Boolean);
  return { text: lines.join("\n") };
}

async function post(url: string, body: { text: string }): Promise<boolean> {
  if (!isSlackWebhook(url)) return false;
  const target = await assertPublicUrl(url);
  const res = await guardedFetch(target, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(8000) });
  await res.body?.cancel().catch(() => {});
  return res.ok;
}

export async function getSlackWebhook(orgId: string): Promise<string | null> {
  const { data } = await db().from("organizations").select("slack_webhook").eq("id", orgId).maybeSingle();
  return (data?.slack_webhook as string | null) ?? null;
}

/** Saves (or clears, with an empty value) the team's Slack webhook, after a test message goes through. */
export async function setSlackWebhook(orgId: string, url: string): Promise<void> {
  const clean = url.trim();
  if (clean && !isSlackWebhook(clean)) throw new SlackError("Paste a Slack incoming-webhook URL. It starts with https://hooks.slack.com/services/.");
  if (clean && !(await post(clean, { text: `:white_check_mark: ${mrkdwn(BRAND.name)} alerts will post to this channel.` }).catch(() => false)))
    throw new SlackError("Slack didn't accept a test message. Check the webhook is still active.");
  const { error } = await db().from("organizations").update({ slack_webhook: clean || null }).eq("id", orgId);
  if (error) throw new Error(`Database write failed: ${error.message}`);
}

/** Posts an alert to the team's Slack channel, if one is set. Never throws: Slack being down mustn't stop alerts. */
export async function notifySlack(orgId: string, kind: string, title: string, detail?: string | null): Promise<void> {
  try {
    const url = await getSlackWebhook(orgId);
    if (url) await post(url, slackMessage(kind, title, detail));
  } catch (e) {
    console.error("Slack alert failed:", e instanceof Error ? e.message : e);
  }
}
