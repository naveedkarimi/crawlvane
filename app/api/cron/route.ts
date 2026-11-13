import { runDueRankChecks } from "@/lib/rankTracking";
import { kickWorker } from "@/lib/jobs";
import { runDueMonitors } from "@/lib/monitor";
import { runRetention } from "@/lib/retention";
import { runDueAppMonitors, runDueSiteMonitors } from "@/lib/orgMonitoring";
import { runDueTrackers } from "@/lib/visibilityTracking";
import { runDueSchedules } from "@/lib/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * cPanel → Cron Jobs (hourly):
 *   curl -s "https://YOUR_DOMAIN/api/cron?secret=YOUR_CRON_SECRET" > /dev/null
 * Runs due monitors (if monitoring is enabled), deletes old data (see lib/retention.ts).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = new URL(req.url).searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (!secret || secret.length < 12 || given !== secret) return new Response("Forbidden", { status: 403 });

  // Wake the job worker (JOB_QUEUE=1), so reports stopped by a restart are picked up again. It keeps
  // running after this response, in this server process.
  void kickWorker();

  // Monitors only exist if someone could create them (flag on or admin), so just run any that are due.
  const result = await runDueMonitors(5);
  const pruned = await runRetention();
  // Dashboard monitoring: saved sites and tracked apps that are due.
  const sites = await runDueSiteMonitors(5).catch((e) => ({ ran: 0, errors: [String(e)] }));
  const apps = await runDueAppMonitors(5).catch((e) => ({ ran: 0, errors: [String(e)] }));
  const visibility = await runDueTrackers(3).catch((e) => ({ ran: 0, errors: [String(e)] }));
  const ranks = await runDueRankChecks(5).catch((e) => ({ ran: 0, errors: [String(e)] }));
  const schedules = await runDueSchedules(3).catch((e) => ({ started: 0, sent: 0, errors: [String(e)] }));
  return Response.json({ ok: true, ran: result.ran, errors: result.errors, prunedReports: pruned.reports, prunedLeads: pruned.leads, siteMonitors: sites, appMonitors: apps, visibility, schedules, ranks });
}
