import { db } from "./store";
import { runAudit } from "./audit";
import { extrasFromAudit, recordScore, type Account } from "./accounts";
import { addAlert } from "./alerts";
import { lookupApp, parseAppInput, scoreListing, type AppListing, type Store } from "./appStore";
import { limitsFor, planAllowsFor } from "./entitlements";
import { mailConfigured, sendMail } from "./mail";
import { PAYWALL_ENABLED, SITE_URL } from "./config";
import { APP_URL } from "./hosts";
import { DROP_UPSELL, ownerEmails } from "./lifecycle";

/**
 * Monitoring for signed-in organisations: weekly site checks and tracked apps with competitors.
 * Runs from /api/cron. Alerts go by email when SMTP is set; everything is recorded either way.
 */
const DAY = 86400000;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function failed(what: string, e: { message: string }): never {
  throw new Error(`Database ${what} failed: ${e.message}`);
}
const due = (last: string | null, everyDays: number, now = Date.now()) => !last || now - Date.parse(last) >= everyDays * DAY - 3600000;

export class MonitorError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Emails of the organisation's owners, for alerts (shared with the upgrade emails). */
export { ownerEmails } from "./lifecycle";

async function alert(to: string[], subject: string, lines: string[], link: string) {
  if (!mailConfigured() || !to.length) return;
  const text = [...lines, "", link].join("\n");
  const html = `<h2>${esc(subject)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p><a href="${esc(link)}">Open your dashboard</a></p>`;
  for (const t of to) await sendMail(t, subject, html, text).catch((e) => console.error("Alert email failed:", e));
}

// ---------- Site monitors ----------
export interface SiteMonitorRow { site_id: string; every_days: number; alert_email: string | null; last_run_at: string | null }

export async function listSiteMonitors(orgId: string): Promise<SiteMonitorRow[]> {
  const { data, error } = await db().from("site_monitors").select("site_id, every_days, alert_email, last_run_at, sites!inner(org_id)").eq("sites.org_id", orgId);
  if (error) failed("read", error);
  return (data ?? []).map(({ site_id, every_days, alert_email, last_run_at }) => ({ site_id, every_days, alert_email, last_run_at }));
}

export async function setSiteMonitor(a: Account, siteId: string, everyDays: number, email: string): Promise<void> {
  if (!planAllowsFor(a.org, "monitoring")) throw new MonitorError("Monitoring is part of the Pro plan.", 402);
  const { data: site, error } = await db().from("sites").select("id").eq("org_id", a.org.id).eq("id", siteId).maybeSingle();
  if (error) failed("read", error);
  if (!site) throw new MonitorError("Site not found.", 404);
  const existing = await listSiteMonitors(a.org.id);
  if (!existing.some((m) => m.site_id === siteId) && existing.length >= limitsFor(a.org).monitors)
    throw new MonitorError(`Your plan includes ${limitsFor(a.org).monitors} monitored site${limitsFor(a.org).monitors === 1 ? "" : "s"}.`, 402);
  const { error: e2 } = await db().from("site_monitors").upsert({ site_id: siteId, every_days: Math.min(30, Math.max(1, everyDays)), alert_email: email || null });
  if (e2) failed("write", e2);
}

export async function removeSiteMonitor(orgId: string, siteId: string): Promise<void> {
  const { data: site } = await db().from("sites").select("id").eq("org_id", orgId).eq("id", siteId).maybeSingle();
  if (!site) return;
  const { error } = await db().from("site_monitors").delete().eq("site_id", siteId);
  if (error) failed("delete", error);
}

/** Should a new score send an alert? A drop of 5 or more, or more failing checks than last time. */
export function siteAlertReason(prev: { overall: number; fails: number } | null, next: { overall: number; fails: number }): string | null {
  if (!prev) return null;
  if (next.overall <= prev.overall - 5) return `Score dropped from ${prev.overall} to ${next.overall}.`;
  if (next.fails > prev.fails) return `${next.fails - prev.fails} new failing check${next.fails - prev.fails === 1 ? "" : "s"}.`;
  return null;
}

export async function runDueSiteMonitors(limit = 5): Promise<{ ran: number; errors: string[] }> {
  const { data, error } = await db().from("site_monitors").select("site_id, every_days, alert_email, last_run_at, sites!inner(org_id, url, domain)");
  if (error) failed("read", error);
  const errors: string[] = [];
  let ran = 0;
  for (const m of data ?? []) {
    if (ran >= limit) break;
    if (!due(m.last_run_at, m.every_days)) continue;
    const site = m.sites as unknown as { org_id: string; url: string; domain: string };
    ran++;
    try {
      const { data: prevRows } = await db().from("site_scores").select("overall, fails").eq("site_id", m.site_id).order("created_at", { ascending: false }).limit(1);
      const r = await runAudit(site.url);
      const extras = extrasFromAudit(r);
      const fails = extras.fails ?? 0;
      await recordScore(m.site_id, r.scores, "monitor", extras);
      // Older scores may not have a failing-check count; then only the score is compared.
      const p = prevRows?.[0];
      const prev = p ? { overall: p.overall as number, fails: p.fails === null ? fails : (p.fails as number) } : null;
      const reason = siteAlertReason(prev, { overall: r.scores.overall, fails });
      if (p && r.scores.overall >= p.overall + 4) await addAlert(site.org_id, { kind: "pass", siteId: m.site_id, title: `${site.domain} went up ${r.scores.overall - p.overall} points`, detail: `Now ${r.scores.overall}.` });
      if (reason) {
        await addAlert(site.org_id, { kind: "fail", siteId: m.site_id, title: `${site.domain}: ${reason}`, detail: extras.issues?.[0] ? `Top issue: ${extras.issues[0].title}.` : undefined });
        const to = m.alert_email ? [m.alert_email] : await ownerEmails(site.org_id);
        // Free teams also hear what Pro would add, since a drop is when competitor and AI tracking matter most.
        const { data: org } = await db().from("organizations").select("plan").eq("id", site.org_id).maybeSingle();
        const upsell = PAYWALL_ENABLED && (org?.plan ?? "free") === "free" ? [DROP_UPSELL] : [];
        await alert(to, `${site.domain}: ${reason}`, [reason, `SEO ${r.scores.seo} · Answers ${r.scores.aeo} · AI search ${r.scores.geo}`, ...upsell], `${APP_URL || SITE_URL}/dashboard`);
      }
    } catch (e) {
      errors.push(`${site.domain}: ${e instanceof Error ? e.message : e}`);
    } finally {
      await db().from("site_monitors").update({ last_run_at: new Date().toISOString() }).eq("site_id", m.site_id);
    }
  }
  return { ran, errors };
}

// ---------- Tracked apps ----------
export interface CompetitorRef { store: Store; id: string; title: string }
export interface AppSnapshot { at: string; rating: number | null; ratingCount: number | null; score: number; lastUpdated: string | null; competitors: { id: string; title: string; rating: number | null; ratingCount: number | null; lastUpdated: string | null }[] }
export interface TrackedApp { id: string; store: Store; appId: string; country: string; title: string; icon: string | null; url: string | null; competitors: CompetitorRef[]; lastRunAt: string | null; history: AppSnapshot[] }

export async function listApps(orgId: string): Promise<TrackedApp[]> {
  const { data: apps, error } = await db().from("tracked_apps").select("id, store, app_id, country, title, icon, url, competitors, last_run_at").eq("org_id", orgId).order("created_at");
  if (error) failed("read", error);
  if (!apps?.length) return [];
  const { data: snaps, error: e2 } = await db().from("app_snapshots").select("tracked_app_id, rating, rating_count, score, last_updated, competitors, created_at").in("tracked_app_id", apps.map((a) => a.id)).order("created_at", { ascending: false }).limit(1000);
  if (e2) failed("read", e2);
  return apps.map((a) => ({
    id: a.id, store: a.store, appId: a.app_id, country: a.country, title: a.title, icon: a.icon, url: a.url,
    competitors: (a.competitors ?? []) as CompetitorRef[], lastRunAt: a.last_run_at,
    history: (snaps ?? []).filter((s) => s.tracked_app_id === a.id).slice(0, 20).reverse().map((s) => ({
      at: s.created_at, rating: s.rating === null ? null : Number(s.rating), ratingCount: s.rating_count === null ? null : Number(s.rating_count), score: s.score, lastUpdated: s.last_updated, competitors: s.competitors ?? [],
    })),
  }));
}

async function snapshot(trackedId: string, l: AppListing, competitors: AppListing[]): Promise<void> {
  const { score } = scoreListing(l);
  const { error } = await db().from("app_snapshots").insert({
    tracked_app_id: trackedId, rating: l.rating, rating_count: l.ratingCount, score, last_updated: l.lastUpdated,
    competitors: competitors.map((c) => ({ id: c.id, title: c.title, rating: c.rating, ratingCount: c.ratingCount, lastUpdated: c.lastUpdated })),
  });
  if (error) failed("write", error);
  await db().from("tracked_apps").update({ last_run_at: new Date().toISOString(), title: l.title, icon: l.icon ?? null }).eq("id", trackedId);
}

export async function addApp(a: Account, input: string, store: Store, country: string): Promise<{ id: string }> {
  const ref = parseAppInput(input, store);
  if (typeof ref === "string") throw new MonitorError(ref);
  const { count, error: e0 } = await db().from("tracked_apps").select("id", { count: "exact", head: true }).eq("org_id", a.org.id);
  if (e0) failed("read", e0);
  if ((count ?? 0) >= limitsFor(a.org).apps) throw new MonitorError(`Your plan includes ${limitsFor(a.org).apps} tracked app${limitsFor(a.org).apps === 1 ? "" : "s"}. Upgrade to add more.`, 402);
  const l = await lookupApp(ref, country);
  const { data, error } = await db().from("tracked_apps").insert({ org_id: a.org.id, store: l.store, app_id: l.id, country, title: l.title, icon: l.icon ?? null, url: l.url }).select("id").single();
  if (error) throw error.code === "23505" ? new MonitorError("You're already tracking this app in this country.") : new Error(`Database write failed: ${error.message}`);
  await snapshot(data.id as string, l, []);
  return { id: data.id as string };
}

export async function setCompetitors(a: Account, trackedId: string, inputs: string[]): Promise<CompetitorRef[]> {
  if (!planAllowsFor(a.org, "appPremium")) throw new MonitorError("Competitor tracking is part of the Pro plan.", 402);
  const { data: app, error } = await db().from("tracked_apps").select("id, store, country").eq("org_id", a.org.id).eq("id", trackedId).maybeSingle();
  if (error) failed("read", error);
  if (!app) throw new MonitorError("App not found.", 404);
  const refs: CompetitorRef[] = [];
  for (const raw of inputs.map((s) => s.trim()).filter(Boolean).slice(0, 3)) {
    const r = parseAppInput(raw, app.store as Store);
    if (typeof r === "string") throw new MonitorError(`${raw}: ${r}`);
    const l = await lookupApp(r, app.country as string);
    refs.push({ store: l.store, id: l.id, title: l.title });
  }
  const { error: e2 } = await db().from("tracked_apps").update({ competitors: refs }).eq("id", trackedId);
  if (e2) failed("write", e2);
  return refs;
}

export async function removeApp(orgId: string, trackedId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(trackedId)) return;
  const { error } = await db().from("tracked_apps").delete().eq("org_id", orgId).eq("id", trackedId);
  if (error) failed("delete", error);
}

/** Alert lines for an app: a rating drop of 0.1 or more, and competitors that shipped an update. */
export function appAlertLines(prev: AppSnapshot | null, next: AppSnapshot): string[] {
  if (!prev) return [];
  const lines: string[] = [];
  if (prev.rating !== null && next.rating !== null && next.rating <= prev.rating - 0.1) lines.push(`Your rating dropped from ${prev.rating.toFixed(2)} to ${next.rating.toFixed(2)}.`);
  for (const c of next.competitors) {
    const before = prev.competitors.find((p) => p.id === c.id);
    if (before && c.lastUpdated && before.lastUpdated && Date.parse(c.lastUpdated) > Date.parse(before.lastUpdated)) lines.push(`${c.title} shipped an update.`);
  }
  return lines;
}

export async function checkApp(orgId: string, trackedId: string): Promise<AppSnapshot> {
  const apps = await listApps(orgId);
  const app = apps.find((x) => x.id === trackedId);
  if (!app) throw new MonitorError("App not found.", 404);
  const l = await lookupApp({ store: app.store, id: app.appId }, app.country);
  const comps: AppListing[] = [];
  for (const c of app.competitors) comps.push(await lookupApp({ store: c.store, id: c.id }, app.country).catch(() => null as unknown as AppListing));
  const ok = comps.filter(Boolean);
  await snapshot(app.id, l, ok);
  const next: AppSnapshot = { at: new Date().toISOString(), rating: l.rating, ratingCount: l.ratingCount, score: scoreListing(l).score, lastUpdated: l.lastUpdated, competitors: ok.map((c) => ({ id: c.id, title: c.title, rating: c.rating, ratingCount: c.ratingCount, lastUpdated: c.lastUpdated })) };
  const lines = appAlertLines(app.history.at(-1) ?? null, next);
  for (const line of lines) await addAlert(orgId, { kind: /dropped/.test(line) ? "fail" : "info", title: `${l.title}: ${line}` });
  if (lines.length) await alert(await ownerEmails(orgId), `${l.title}: ${lines[0]}`, lines, `${APP_URL || SITE_URL}/dashboard?tab=apps`);
  return next;
}

export async function runDueAppMonitors(limit = 5): Promise<{ ran: number; errors: string[] }> {
  const { data, error } = await db().from("tracked_apps").select("id, org_id, title, last_run_at");
  if (error) failed("read", error);
  let ran = 0;
  const errors: string[] = [];
  for (const a of data ?? []) {
    if (ran >= limit) break;
    if (!due(a.last_run_at, 7)) continue;
    ran++;
    await checkApp(a.org_id as string, a.id as string).catch((e) => errors.push(`${a.title}: ${e instanceof Error ? e.message : e}`));
  }
  return { ran, errors };
}
