import { getReport } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let report;
  try {
    report = await getReport(id);
  } catch {
    report = null;
  }
  if (!report) return Response.json({ error: "Report not found (reports are kept for 30 days)." }, { status: 404 });
  // Stale-job guard: a job not updated for 10 minutes was killed (e.g. server restart)
  if ((report.status === "running" || report.status === "queued") && Date.now() - new Date(report.updatedAt).getTime() > 10 * 60000) {
    report.status = "error";
    report.error = "The report stopped unexpectedly (the server may have restarted). Please run it again.";
  }
  return Response.json(report, { headers: { "cache-control": "no-store" } });
}
