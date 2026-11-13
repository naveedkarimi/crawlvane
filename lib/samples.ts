import { db, readJson } from "./store";

/**
 * Public sample reports for /examples. Only real reports, added by the admin with the site owner's
 * permission (recorded in `permission`). Listed reports are kept past the usual deletion.
 */
export interface Sample { reportId: string; site: string; title: string; summary: string | null; permission: string; addedAt: string; score: number | null }

export async function listSamples(): Promise<Sample[]> {
  const { data, error } = await db().from("sample_reports").select("report_id, site, title, summary, permission, added_at").order("added_at", { ascending: false });
  if (error) return [];
  const out: Sample[] = [];
  for (const r of data ?? []) {
    // Skip a sample whose report has gone, rather than linking to a missing page.
    const report = await readJson<{ status?: string; site?: { scores?: { overall?: number } } }>("reports", r.report_id as string).catch(() => null);
    if (!report || report.status === "error") continue;
    out.push({ reportId: r.report_id, site: r.site, title: r.title, summary: r.summary, permission: r.permission, addedAt: r.added_at, score: report.site?.scores?.overall ?? null });
  }
  return out;
}

export async function addSample(s: { reportId: string; site: string; title: string; summary?: string; permission: string }): Promise<void> {
  const report = await readJson("reports", s.reportId);
  if (!report) throw new Error("No report with that ID.");
  const { error } = await db().from("sample_reports").upsert({ report_id: s.reportId, site: s.site, title: s.title, summary: s.summary ?? null, permission: s.permission });
  if (error) throw new Error(`Database write failed: ${error.message}`);
}

export async function removeSample(reportId: string): Promise<void> {
  const { error } = await db().from("sample_reports").delete().eq("report_id", reportId);
  if (error) throw new Error(`Database write failed: ${error.message}`);
}
