import { LIMITS } from "./config";
import { db, pruneOlderThan, pruneRows } from "./store";

/**
 * Deletes old data on the schedule the privacy policy promises. Runs when the server
 * starts, every 6 hours while it's up (instrumentation.ts), and from /api/cron.
 */
async function safely(label: string, prune: () => Promise<number>): Promise<number> {
  try {
    return await prune();
  } catch (e) {
    console.error(`Deleting old ${label} failed:`, e);
    return 0;
  }
}

export async function runRetention() {
  const reports = await safely("reports", async () => {
    // Paid teams keep their reports longer. If the SQL function isn't there yet, fall back to one limit for all.
    const { data, error } = await db().rpc("prune_reports", { p_free_days: LIMITS.reportTtlDays, p_paid_days: LIMITS.paidReportTtlDays });
    if (!error) return Number(data ?? 0);
    console.error("prune_reports is missing; run the latest supabase/schema.sql. Using the free limit for every report.", error.message);
    return pruneOlderThan("reports", LIMITS.reportTtlDays);
  });
  const leads =
    (await safely("leads", () => pruneOlderThan("leads", 730))) + (await safely("leads", () => pruneRows("leads", 730)));
  await safely("badges", () => pruneOlderThan("badges", 60));
  await safely("widget leads", () => pruneOlderThan("widget-leads", 365));
  await safely("widget leads", () => pruneRows("widget_leads", 365));
  await safely("site checks", () => pruneRows("site_checks", 365));
  await safely("app checks", () => pruneRows("app_checks", 365));
  // Team invites expire after 14 days (lib/teams.ts), so they're deleted then, used or not.
  await safely("invites", () => pruneRows("invites", 14));
  await safely("alerts", () => pruneRows("alerts", 180));
  await safely("AI bot visit counts", () => pruneRows("bot_hits", 400));
  await safely("finished jobs", () => pruneRows("jobs", 30));
  // Rate limit counters only matter for their window (an hour or a day), so they go after two days.
  await safely("rate limit counters", async () => {
    const { error, count } = await db().from("rate_limits").delete({ count: "exact" }).lt("window_start", new Date(Date.now() - 2 * 86400000).toISOString());
    if (error) throw new Error(error.message);
    return count ?? 0;
  });
  await safely("Stripe event IDs", () => pruneRows("stripe_events", 90));
  return { reports, leads };
}
