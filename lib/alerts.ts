import { db, insertRow } from "./store";
import { notifySlack } from "./slack";
import { emitWebhook } from "./webhooks";

/** The dashboard's alerts feed: score changes, app rating drops, competitor updates and AI visibility drops. Also posted to Slack when the team has a webhook. */
export type AlertKind = "fail" | "warn" | "pass" | "info";
export interface AlertRow { id: number; kind: AlertKind; title: string; detail: string | null; read: boolean; created_at: string }

export async function addAlert(orgId: string, a: { kind: AlertKind; title: string; detail?: string; siteId?: string }): Promise<void> {
  await insertRow("alerts", { org_id: orgId, site_id: a.siteId, kind: a.kind, title: a.title.slice(0, 200), detail: a.detail?.slice(0, 500) });
  await notifySlack(orgId, a.kind, a.title.slice(0, 200), a.detail?.slice(0, 500));
  await emitWebhook(orgId, "alert.created", { kind: a.kind, title: a.title.slice(0, 200), detail: a.detail?.slice(0, 500) ?? null, siteId: a.siteId ?? null });
}

export async function listAlerts(orgId: string, limit = 30): Promise<AlertRow[]> {
  const { data, error } = await db().from("alerts").select("id, kind, title, detail, read, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Database read failed: ${error.message}`);
  return (data ?? []) as AlertRow[];
}

export async function markAlertsRead(orgId: string): Promise<void> {
  const { error } = await db().from("alerts").update({ read: true }).eq("org_id", orgId).eq("read", false);
  if (error) throw new Error(`Database write failed: ${error.message}`);
}
