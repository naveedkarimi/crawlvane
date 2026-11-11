import { db } from "./store";
import { listOrgApiKeys } from "./apiKeys";
import { listOrgWidgets } from "./widgets";
import type { Account } from "./accounts";

const DOMAIN_TABLES = [
  ["sites", "org_id"],
  ["org_reports", "org_id"],
  ["usage_counters", "org_id"],
  ["credit_ledger", "org_id"],
  ["tracked_apps", "org_id"],
  ["visibility_trackers", "org_id"],
  ["alerts", "org_id"],
  ["scheduled_reports", "org_id"],
] as const;

async function rows(table: string, column: string, value: string | string[]) {
  const q = db().from(table).select("*");
  const { data, error } = await (Array.isArray(value) ? q.in(column, value.length ? value : ["00000000-0000-0000-0000-000000000000"]) : q.eq(column, value)).limit(5000);
  if (error) throw new Error(`Database read failed (${table}): ${error.message}`);
  return data ?? [];
}

/**
 * Everything we hold for the signed-in person and their current team, as one JSON file.
 * The privacy policy promises a copy in a portable format. Secrets (API key hashes, invite
 * tokens, Stripe IDs) are left out.
 */
export async function exportAccount(a: Account) {
  const orgId = a.org.id;
  const [memberships, org] = await Promise.all([
    rows("memberships", "user_id", a.user.id),
    db().from("organizations").select("id, name, plan, plan_status, current_period_end, brand_name, brand_logo, brand_color, report_domain, created_at").eq("id", orgId).maybeSingle(),
  ]);
  const team: Record<string, unknown> = {};
  for (const [table, col] of DOMAIN_TABLES) team[table] = await rows(table, col, orgId);
  const siteIds = (team.sites as { id: string }[]).map((s) => s.id);
  const appIds = (team.tracked_apps as { id: string }[]).map((s) => s.id);
  const trackerIds = (team.visibility_trackers as { id: string }[]).map((s) => s.id);
  team.site_scores = await rows("site_scores", "site_id", siteIds);
  team.site_monitors = await rows("site_monitors", "site_id", siteIds);
  team.app_snapshots = await rows("app_snapshots", "tracked_app_id", appIds);
  team.visibility_runs = await rows("visibility_runs", "tracker_id", trackerIds);
  team.invites = (await rows("invites", "org_id", orgId)).map(({ token: _t, ...rest }) => rest);
  team.api_keys = (await listOrgApiKeys(orgId)).map(({ id: _id, ...rest }) => rest);
  const widgets = await listOrgWidgets(orgId);
  team.widgets = widgets;
  team.widget_leads = widgets.length ? await rows("widget_leads", "widget_id", widgets.map((w) => w.id)) : [];
  return {
    exportedAt: new Date().toISOString(),
    you: { id: a.user.id, email: a.user.email, role: a.role, teams: memberships },
    team: { ...(org.data ?? {}), ...team },
  };
}
