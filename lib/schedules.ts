import { db } from "./store";
import { linkReport, type Account } from "./accounts";
import { createReport, getReport } from "./report";
import { limitsFor, planOf } from "./entitlements";
import { mailConfigured, sendMail } from "./mail";
import { getBranding, reportBase, whiteLabelFrom } from "./branding";
import { addAlert } from "./alerts";

/** Scheduled client reports: a full report on a saved site every month, emailed as a link. */
export class ScheduleError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
function failed(what: string, e: { message: string }): never {
  throw new Error(`Database ${what} failed: ${e.message}`);
}
export interface Schedule { id: string; siteId: string; email: string; everyDays: number; lastRunAt: string | null }

export async function listSchedules(orgId: string): Promise<Schedule[]> {
  const { data, error } = await db().from("scheduled_reports").select("id, site_id, email, every_days, last_run_at").eq("org_id", orgId).order("created_at");
  if (error) failed("read", error);
  return (data ?? []).map((s) => ({ id: s.id, siteId: s.site_id, email: s.email, everyDays: s.every_days, lastRunAt: s.last_run_at }));
}

export async function setSchedule(a: Account, siteId: string, email: string, everyDays = 30): Promise<void> {
  if (a.role === "viewer") throw new ScheduleError("Viewers can't schedule reports.", 403);
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) throw new ScheduleError("Enter a valid email address.");
  const { data: site } = await db().from("sites").select("id").eq("org_id", a.org.id).eq("id", siteId).maybeSingle();
  if (!site) throw new ScheduleError("Site not found.", 404);
  const existing = await listSchedules(a.org.id);
  const limit = limitsFor(a.org).scheduledReports;
  if (!existing.some((s) => s.siteId === siteId) && existing.length >= limit)
    throw new ScheduleError(limit ? `Your plan includes ${limit} scheduled reports.` : "Scheduled client reports are part of the Agency plan.", 402);
  const { error } = await db().from("scheduled_reports").upsert({ org_id: a.org.id, site_id: siteId, email: e, every_days: Math.min(90, Math.max(7, everyDays)) }, { onConflict: "site_id" });
  if (error) failed("write", error);
}

export async function removeSchedule(orgId: string, id: string): Promise<void> {
  const { error } = await db().from("scheduled_reports").delete().eq("org_id", orgId).eq("id", id);
  if (error) failed("delete", error);
}

/** Starts reports that are due, and emails the ones that finished since the last run. */
export async function runDueSchedules(limit = 3): Promise<{ started: number; sent: number; errors: string[] }> {
  const { data, error } = await db().from("scheduled_reports").select("id, org_id, email, every_days, last_run_at, pending_report_id, sites!inner(url, domain), organizations!inner(name, plan)");
  if (error) failed("read", error);
  let started = 0;
  let sent = 0;
  const errors: string[] = [];
  for (const s of data ?? []) {
    const site = s.sites as unknown as { url: string; domain: string };
    const org = s.organizations as unknown as { name: string; plan: string };
    try {
      if (s.pending_report_id) {
        const rep = await getReport(s.pending_report_id);
        if (!rep || rep.status === "error") {
          await db().from("scheduled_reports").update({ pending_report_id: null }).eq("id", s.id);
        } else if (rep.status === "done") {
          const link = `${reportBase(await getBranding(s.org_id).catch(() => null))}/report/${rep.id}`;
          const score = rep.site?.scores.overall;
          if (mailConfigured()) {
            const subject = `${site.domain}: your monthly SEO and AI search report${score !== undefined ? ` (score ${score})` : ""}`;
            await sendMail(s.email, subject, `<h2>${subject}</h2><p><a href="${link}">Open the report</a></p><p>Prepared by ${org.name}.</p>`, `${subject}\n\n${link}\n\nPrepared by ${org.name}.`);
          }
          await db().from("scheduled_reports").update({ pending_report_id: null }).eq("id", s.id);
          await addAlert(s.org_id, { kind: "info", title: `Monthly report for ${site.domain} sent to ${s.email}` });
          sent++;
        }
        continue;
      }
      if (started >= limit) continue;
      if (s.last_run_at && Date.now() - Date.parse(s.last_run_at) < s.every_days * 86400000 - 3600000) continue;
      const lim = limitsFor({ plan: org.plan });
      const report = await createReport(site.url, {
        maxPages: Math.min(50, lim.maxPages), competitors: [], aiPlan: false, aiVisibility: false, visibilityPrompts: [],
        deepResearch: false, render: false, socialPosts: false,
        // Agency teams' monthly reports carry their saved branding, or at least their team name.
        ...(planOf({ plan: org.plan }) === "agency" ? { whiteLabel: whiteLabelFrom(org, await getBranding(s.org_id).catch(() => null)) ?? { name: org.name } } : {}),
      });
      await linkReport(s.org_id, report.id, site.url);
      await db().from("scheduled_reports").update({ pending_report_id: report.id, last_run_at: new Date().toISOString() }).eq("id", s.id);
      started++;
    } catch (e) {
      errors.push(`${site.domain}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { started, sent, errors };
}
