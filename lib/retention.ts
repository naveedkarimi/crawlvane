import { LIMITS } from "./config";
import { pruneOlderThan, pruneRows } from "./store";

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
  const reports = await safely("reports", () => pruneOlderThan("reports", LIMITS.reportTtlDays));
  const leads =
    (await safely("leads", () => pruneOlderThan("leads", 730))) + (await safely("leads", () => pruneRows("leads", 730)));
  await safely("badges", () => pruneOlderThan("badges", 60));
  await safely("widget leads", () => pruneOlderThan("widget-leads", 365));
  await safely("widget leads", () => pruneRows("widget_leads", 365));
  await safely("site checks", () => pruneRows("site_checks", 365));
  await safely("app checks", () => pruneRows("app_checks", 365));
  return { reports, leads };
}
