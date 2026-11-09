/**
 * ADVANCED (monitoring): scheduled re-audits with email alerts.
 * Driven by a cPanel cron job that calls /api/cron?secret=CRON_SECRET hourly.
 */
import { auditFetched, fetchPage, loadSiteContext } from "./audit";
import { buildSiteAudit, crawlSite } from "./crawl";
import { diffBaseline, nextBaseline, renderChanges, snapshotsFromCrawl, type Baseline } from "./drift";
import { LIMITS, SITE_URL } from "./config";
import { mailConfigured, sendMail } from "./mail";
import { listIds, newId, pruneOlderThan, readJson, removeJson, writeJson } from "./store";

export interface Monitor {
  id: string;
  /** secret token needed to view/delete (sent in the email links) */
  token: string;
  url: string;
  email: string;
  everyDays: number;
  maxPages: number;
  createdAt: string;
  lastRunAt?: string;
  history: { at: string; scores: { overall: number; seo: number; aeo: number; geo: number }; fails: number; warns: number; pages: number; changes?: number }[];
  /** Key SEO fields per page from the last run, to spot changes the score doesn't show. */
  baseline?: Baseline;
}

const C = "monitors";

export async function createMonitor(url: string, email: string, everyDays = 7, maxPages = 25): Promise<Monitor> {
  const m: Monitor = {
    id: newId(),
    token: newId(24),
    url,
    email,
    everyDays: Math.min(30, Math.max(1, everyDays)),
    maxPages: Math.min(LIMITS.maxPagesHard, Math.max(1, maxPages)),
    createdAt: new Date().toISOString(),
    history: [],
  };
  await writeJson(C, m.id, m);
  return m;
}

export async function getMonitor(id: string, token: string) {
  const m = await readJson<Monitor>(C, id);
  return m && m.token === token ? m : null;
}

export async function deleteMonitor(id: string, token: string) {
  const m = await getMonitor(id, token);
  if (!m) return false;
  await removeJson(C, id);
  return true;
}

async function runMonitor(m: Monitor) {
  const page = await fetchPage(m.url);
  const ctx = await loadSiteContext(new URL(page.url).origin);
  const home = auditFetched(page.url, page, ctx);
  const crawl = await crawlSite(page.url, ctx, home, page.body, { maxPages: m.maxPages, concurrency: 2 });
  const site = buildSiteAudit(crawl, ctx, home);
  const current = snapshotsFromCrawl(crawl.results);
  const changes = diffBaseline(m.baseline ?? {}, current);
  const entry = {
    at: new Date().toISOString(),
    scores: site.scores,
    fails: site.issues.filter((i) => i.status === "fail").length,
    warns: site.issues.filter((i) => i.status === "warn").length,
    pages: site.pagesCrawled,
    changes: changes.length,
  };
  const prev = m.history[m.history.length - 1];
  m.history.push(entry);
  m.history = m.history.slice(-52);
  m.lastRunAt = entry.at;
  m.baseline = nextBaseline(m.baseline ?? {}, current);
  await writeJson(C, m.id, m);

  const dropped = prev && entry.scores.overall <= prev.scores.overall - 5;
  const newFails = prev && entry.fails > prev.fails;
  const critical = changes.filter((c) => c.severity === "critical").length;
  if (mailConfigured() && (!prev || dropped || newFails || changes.length)) {
    const changeList = renderChanges(changes);
    const topIssues = site.issues.slice(0, 8).map((i) => `• ${i.title} (${i.count} page${i.count === 1 ? "" : "s"})`);
    const delta = prev ? ` (${entry.scores.overall - prev.scores.overall >= 0 ? "+" : ""}${entry.scores.overall - prev.scores.overall})` : "";
    const subject = prev
      ? `${dropped ? "⚠️ Score dropped" : critical ? "⚠️ Important SEO changes" : newFails ? "New issues" : "SEO changes"} for ${new URL(m.url).hostname}: ${entry.scores.overall}${delta}`
      : `Monitoring started for ${new URL(m.url).hostname}: score ${entry.scores.overall}`;
    const link = `${SITE_URL}/check?url=${encodeURIComponent(m.url)}`;
    const stop = `${SITE_URL}/api/monitors?id=${m.id}&token=${m.token}&action=delete`;
    const text = [
      subject,
      `SEO ${entry.scores.seo} · AEO ${entry.scores.aeo} · GEO ${entry.scores.geo} · ${entry.pages} pages`,
      ...(changes.length ? ["", "What changed since the last check:", ...changeList.text] : []),
      "",
      "Top issues:",
      ...topIssues,
      "",
      `Full audit: ${link}`,
      `Stop these emails: ${stop}`,
    ].join("\n");
    const html = `<h2>${subject}</h2><p>SEO <b>${entry.scores.seo}</b> · AEO <b>${entry.scores.aeo}</b> · GEO <b>${entry.scores.geo}</b> · ${entry.pages} pages</p>${changes.length ? `<p><b>What changed since the last check</b></p>${changeList.html}` : ""}<p><b>Top issues</b><br>${topIssues.join("<br>")}</p><p><a href="${link}">Run the full audit</a></p><p style="color:#888;font-size:12px"><a href="${stop}">Stop these emails</a></p>`;
    await sendMail(m.email, subject, html, text);
  }
  return entry;
}

/** Run every monitor that is due. Call from cron. */
export async function runDueMonitors(limit = 5) {
  const ran: string[] = [];
  const errors: string[] = [];
  for (const id of await listIds(C)) {
    if (ran.length >= limit) break;
    const m = await readJson<Monitor>(C, id);
    if (!m) continue;
    const due = !m.lastRunAt || Date.now() - new Date(m.lastRunAt).getTime() >= m.everyDays * 86400000 - 3600000;
    if (!due) continue;
    try {
      await runMonitor(m);
      ran.push(m.url);
    } catch (e) {
      errors.push(`${m.url}: ${e instanceof Error ? e.message : e}`);
      m.lastRunAt = new Date().toISOString();
      await writeJson(C, m.id, m);
    }
  }
  const pruned = await pruneOlderThan("reports", LIMITS.reportTtlDays);
  return { ran, errors, pruned };
}
