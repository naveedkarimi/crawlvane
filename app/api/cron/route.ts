import { runDueMonitors } from "@/lib/monitor";
import { pruneOlderThan, pruneRows } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * cPanel → Cron Jobs (hourly):
 *   curl -s "https://YOUR_DOMAIN/api/cron?secret=YOUR_CRON_SECRET" > /dev/null
 * Runs due monitors (if monitoring is enabled), deletes old reports and old leads.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = new URL(req.url).searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (!secret || secret.length < 12 || given !== secret) return new Response("Forbidden", { status: 403 });

  // Monitors only exist if someone could create them (flag on or admin), so just run any that are due.
  const result = await runDueMonitors(5);
  // The privacy policy promises messages and waitlist sign-ups are kept for at most 24 months.
  const prunedLeads = (await pruneOlderThan("leads", 730)) + (await pruneRows("leads", 730));
  await pruneOlderThan("badges", 60);
  // The privacy policy promises site statistics are deleted after 12 months.
  await pruneRows("site_checks", 365).catch((e) => console.error("Pruning site checks failed:", e));
  return Response.json({ ok: true, ran: result.ran, errors: result.errors, prunedReports: result.pruned, prunedLeads });
}
