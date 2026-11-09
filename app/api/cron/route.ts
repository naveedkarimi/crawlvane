import { runDueMonitors } from "@/lib/monitor";
import { runRetention } from "@/lib/retention";

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

  // Monitors only exist if someone could create them (flag on or admin), so just run any that are due.
  const result = await runDueMonitors(5);
  const pruned = await runRetention();
  return Response.json({ ok: true, ran: result.ran, errors: result.errors, prunedReports: pruned.reports, prunedLeads: pruned.leads });
}
