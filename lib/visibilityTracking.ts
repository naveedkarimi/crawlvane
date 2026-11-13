import { db } from "./store";
import type { Account } from "./accounts";
import { addSentiment, availableEngines, runVisibility, suggestPrompts, tallySentiment } from "./ai/visibility";
import { CREDIT_COST, PaywallError, limitsFor, planAllowsFor, spendCredits } from "./entitlements";
import { MonitorError, ownerEmails } from "./orgMonitoring";
import { mailConfigured, sendMail } from "./mail";
import { SITE_URL } from "./config";
import { APP_URL } from "./hosts";
import type { SentimentCounts, VisibilityResult } from "./reportTypes";
import { addAlert } from "./alerts";

/**
 * AI visibility over time: the same buyer questions asked every week across the AI engines with a key,
 * stored per run so the dashboard can chart mention rate per engine and share of voice.
 */
const DAY = 86400000;
function failed(what: string, e: { message: string }): never {
  throw new Error(`Database ${what} failed: ${e.message}`);
}

export interface VisibilityRun {
  at: string;
  summary: VisibilityResult["summary"];
  shareOfVoice: VisibilityResult["shareOfVoice"];
  rows?: VisibilityResult["rows"];
  error?: string | null;
  /** How answers that mention the brand describe it. Null when it couldn't be read. */
  sentiment?: SentimentCounts | null;
}
export interface Tracker {
  id: string;
  siteId: string;
  domain: string;
  brand: string;
  prompts: string[];
  competitors: { name: string; domain: string }[];
  lastRunAt: string | null;
  runs: VisibilityRun[];
}

const brandOf = (domain: string) => {
  const b = domain.split(".")[0] ?? domain;
  return b.charAt(0).toUpperCase() + b.slice(1);
};

/** Average mention rate across engines that answered, from 0 to 100. */
export function averageMention(summary: VisibilityResult["summary"]): number | null {
  const ok = summary.filter((s) => s.answered > 0);
  return ok.length ? Math.round(ok.reduce((n, s) => n + s.mentionRate, 0) / ok.length) : null;
}

/** Alert when the average mention rate falls by 20 points or more. */
export function visibilityAlert(prev: VisibilityRun | null, next: VisibilityRun): string | null {
  if (!prev) return null;
  const a = averageMention(prev.summary);
  const b = averageMention(next.summary);
  if (a !== null && b !== null && b <= a - 20) return `AI assistants mention you less: ${a}% of answers last time, ${b}% now.`;
  const negNow = next.sentiment?.negative ?? 0;
  if (negNow > 0 && negNow > (prev.sentiment?.negative ?? 0)) return `More AI answers describe you negatively: ${negNow} this time, ${prev.sentiment?.negative ?? 0} last time.`;
  return null;
}

export { promptGaps, type PromptGap } from "./promptGaps";

export async function listTrackers(orgId: string): Promise<Tracker[]> {
  const { data: ts, error } = await db().from("visibility_trackers").select("id, site_id, brand, prompts, competitors, last_run_at, sites!inner(domain)").eq("org_id", orgId).order("created_at");
  if (error) failed("read", error);
  if (!ts?.length) return [];
  const { data: runs, error: e2 } = await db().from("visibility_runs").select("tracker_id, summary, share_of_voice, sentiment, rows, error, created_at").in("tracker_id", ts.map((t) => t.id)).order("created_at", { ascending: false }).limit(300);
  if (e2) failed("read", e2);
  return ts.map((t) => {
    const mine = (runs ?? []).filter((r) => r.tracker_id === t.id).slice(0, 12).reverse();
    return {
      id: t.id, siteId: t.site_id, domain: (t.sites as unknown as { domain: string }).domain, brand: t.brand, prompts: t.prompts ?? [],
      competitors: t.competitors ?? [], lastRunAt: t.last_run_at,
      runs: mine.map((r, i) => ({ at: r.created_at, summary: r.summary ?? [], shareOfVoice: r.share_of_voice ?? [], sentiment: r.sentiment ?? null, error: r.error, ...(i === mine.length - 1 ? { rows: r.rows ?? [] } : {}) })),
    };
  });
}

export async function createTracker(a: Account, siteId: string, prompts: string[], competitorDomains: string[]): Promise<{ id: string }> {
  if (!planAllowsFor(a.org, "aiVisibility")) throw new MonitorError("AI visibility tracking is part of the Pro plan.", 402);
  const { data: site, error } = await db().from("sites").select("id, domain").eq("org_id", a.org.id).eq("id", siteId).maybeSingle();
  if (error) failed("read", error);
  if (!site) throw new MonitorError("Choose one of your saved sites.", 404);
  const { count } = await db().from("visibility_trackers").select("id", { count: "exact", head: true }).eq("org_id", a.org.id);
  if ((count ?? 0) >= limitsFor(a.org).visibilityTrackers) throw new MonitorError(`Your plan includes ${limitsFor(a.org).visibilityTrackers} tracked site${limitsFor(a.org).visibilityTrackers === 1 ? "" : "s"} for AI visibility.`, 402);
  const brand = brandOf(site.domain as string);
  let qs = prompts.map((p) => p.trim()).filter(Boolean).slice(0, 10);
  if (!qs.length) {
    if (!availableEngines().length && !process.env.ANTHROPIC_API_KEY) throw new MonitorError("Add buyer questions, or an AI provider key so we can suggest them.", 400);
    await spendCredits(a, CREDIT_COST.aiPlan, "suggest buyer questions");
    qs = await suggestPrompts(brand, site.domain as string, `${brand} (${site.domain})`);
  }
  const competitors = competitorDomains.map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")).filter((d) => /\.[a-z]{2,}$/.test(d)).slice(0, 3).map((d) => ({ name: brandOf(d), domain: d }));
  const { data, error: e2 } = await db().from("visibility_trackers").insert({ org_id: a.org.id, site_id: site.id, brand, prompts: qs, competitors }).select("id").single();
  if (e2) throw e2.code === "23505" ? new MonitorError("This site is already tracked.") : new Error(`Database write failed: ${e2.message}`);
  return { id: data.id as string };
}

export async function removeTracker(orgId: string, id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { error } = await db().from("visibility_trackers").delete().eq("org_id", orgId).eq("id", id);
  if (error) failed("delete", error);
}

type TrackerRow = { id: string; org_id: string; brand: string; prompts: string[]; competitors: { name: string; domain: string }[]; sites: { domain: string } };

async function runRow(t: TrackerRow, plan: string): Promise<VisibilityRun> {
  const engines = availableEngines();
  if (!engines.length) throw new MonitorError("Add at least one AI provider key (Anthropic, OpenAI, Perplexity or Gemini) to run AI visibility checks.", 503);
  const domain = t.sites.domain;
  let run: VisibilityRun;
  try {
    await spendCredits({ org: { id: t.org_id, plan } }, t.prompts.length * engines.length * CREDIT_COST.visibilityAnswer, "AI visibility tracking");
    const r = await runVisibility({ brand: t.brand, domain, prompts: t.prompts, competitors: t.competitors });
    let rows = r.rows.map((x) => ({ ...x, answerExcerpt: x.answerExcerpt.slice(0, 600) }));
    // Sentiment needs Claude and one extra credit. If either is missing, the run still counts.
    if (process.env.ANTHROPIC_API_KEY && rows.some((x) => x.mentioned)) {
      try {
        await spendCredits({ org: { id: t.org_id, plan } }, CREDIT_COST.sentiment, "AI visibility sentiment");
        rows = await addSentiment(t.brand, rows);
      } catch (e) {
        if (!(e instanceof PaywallError)) console.error("Reading sentiment failed:", e);
      }
    }
    run = { at: new Date().toISOString(), summary: r.summary, shareOfVoice: r.shareOfVoice, rows, sentiment: tallySentiment(rows) };
  } catch (e) {
    if (!(e instanceof PaywallError)) throw e;
    run = { at: new Date().toISOString(), summary: [], shareOfVoice: [], rows: [], error: e.message };
  }
  const { data: prevRows } = await db().from("visibility_runs").select("summary, share_of_voice, sentiment, created_at").eq("tracker_id", t.id).order("created_at", { ascending: false }).limit(1);
  const { error } = await db().from("visibility_runs").insert({ tracker_id: t.id, summary: run.summary, share_of_voice: run.shareOfVoice, rows: run.rows, sentiment: run.sentiment ?? null, error: run.error ?? null });
  if (error) failed("write", error);
  await db().from("visibility_trackers").update({ last_run_at: run.at }).eq("id", t.id);
  const prev = prevRows?.[0] ? { at: prevRows[0].created_at, summary: prevRows[0].summary ?? [], shareOfVoice: prevRows[0].share_of_voice ?? [], sentiment: prevRows[0].sentiment ?? null } : null;
  const reason = run.error ? null : visibilityAlert(prev, run);
  if (reason) await addAlert(t.org_id, { kind: "warn", title: `${domain}: ${reason}` });
  if (reason && mailConfigured())
    for (const to of await ownerEmails(t.org_id)) await sendMail(to, `${domain}: ${reason}`, `<h2>${reason}</h2><p><a href="${APP_URL || SITE_URL}/dashboard?tab=visibility">See which answers changed</a></p>`, `${reason}\n\n${APP_URL || SITE_URL}/dashboard?tab=visibility`).catch(() => {});
  return run;
}

const SELECT = "id, org_id, brand, prompts, competitors, last_run_at, sites!inner(domain)";

export async function runTrackerNow(a: Account, id: string): Promise<VisibilityRun> {
  const { data, error } = await db().from("visibility_trackers").select(SELECT).eq("org_id", a.org.id).eq("id", id).maybeSingle();
  if (error) failed("read", error);
  if (!data) throw new MonitorError("Tracker not found.", 404);
  return runRow(data as unknown as TrackerRow, a.org.plan);
}

export async function runDueTrackers(limit = 3): Promise<{ ran: number; errors: string[] }> {
  const { data, error } = await db().from("visibility_trackers").select(`${SELECT}, every_days, organizations!inner(plan)`);
  if (error) failed("read", error);
  let ran = 0;
  const errors: string[] = [];
  for (const t of data ?? []) {
    if (ran >= limit) break;
    if (t.last_run_at && Date.now() - Date.parse(t.last_run_at) < (t.every_days ?? 7) * DAY - 3600000) continue;
    ran++;
    await runRow(t as unknown as TrackerRow, (t.organizations as unknown as { plan: string }).plan).catch((e) => errors.push(`${(t.sites as unknown as { domain: string }).domain}: ${e instanceof Error ? e.message : e}`));
  }
  return { ran, errors };
}
