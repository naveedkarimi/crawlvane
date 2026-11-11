import { recordSitePages } from "./siteChecks";
import { auditFetched, brokenSchemaImages, fetchPage, httpErrorMessage, loadSiteContext } from "./audit";
import { auditCompetitor, findGaps } from "./competitors";
import { buildSiteAudit, crawlSite } from "./crawl";
import { generateFixes } from "./fixes";
import { sitePlan } from "./ai/plan";
import { runResearch } from "./ai/research";
import { availableEngines, runVisibility, suggestPrompts } from "./ai/visibility";
import { LIMITS, isPublic } from "./config";
import { analyzeSocial, writeSocialPosts } from "./social";
import { newId, readJson, writeJson } from "./store";
import type { Report, ReportOptions, ReportStage } from "./reportTypes";
import { recordReportScore } from "./accounts";

const COLLECTION = "reports";

// ---------- In-process job queue ----------
let running = 0;
const waiting: (() => void)[] = [];
async function slot() {
  if (running < LIMITS.maxConcurrentJobs) {
    running++;
    return;
  }
  await new Promise<void>((r) => waiting.push(r));
  running++;
}
function release() {
  running--;
  waiting.shift()?.();
}

export async function getReport(id: string) {
  return readJson<Report>(COLLECTION, id);
}

export async function createReport(url: string, options: ReportOptions): Promise<Report> {
  const now = new Date().toISOString();
  const report: Report = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    status: "queued",
    progress: { step: "Waiting to start", done: 0, total: 1, log: [] },
    input: { url, options },
  };
  await writeJson(COLLECTION, report.id, report);
  // Fire and forget; progress is persisted to disk for polling.
  void runReport(report).catch(() => {});
  return report;
}

/** The checklist shown while a report runs, in the order the work happens. */
function planStages(o: ReportOptions): ReportStage[] {
  return [
    { id: "home", label: "Load the homepage" },
    { id: "files", label: "Read robots.txt, sitemap and llms.txt" },
    { id: "crawl", label: "Crawl and check every page" },
    ...(o.competitors.length ? [{ id: "competitors", label: "Audit competitors" }] : []),
    { id: "fixes", label: "Write ready-to-paste fixes" },
    ...(o.aiPlan && process.env.ANTHROPIC_API_KEY ? [{ id: "plan", label: "Write the AI fix plan" }] : []),
    ...(o.aiVisibility ? [{ id: "visibility", label: "Ask AI assistants about the site" }] : []),
    ...(o.deepResearch ? [{ id: "research", label: "Research the niche" }] : []),
    ...(o.socialPosts ? [{ id: "social", label: "Write social media posts" }] : []),
    { id: "finish", label: "Finish the report" },
  ];
}

export async function runReport(report: Report): Promise<Report> {
  const save = async () => {
    report.updatedAt = new Date().toISOString();
    await writeJson(COLLECTION, report.id, report);
  };
  const addLog = (s: string) => {
    report.progress.log.push(`${new Date().toISOString().slice(11, 19)} ${s}`);
  };
  const step = async (s: string, done = 0, total = 1) => {
    report.progress.step = s;
    report.progress.done = done;
    report.progress.total = total;
    addLog(s);
    await save();
  };
  const stages = planStages(report.input.options);
  report.progress.stages = stages;
  const begin = (id: string) => {
    const stage = stages.find((s) => s.id === id);
    if (stage) stage.at = report.progress.log.length;
    return stage;
  };

  await slot();
  try {
    const o = report.input.options;
    report.status = "running";
    begin("home");
    await step("Fetching homepage");
    const page = await fetchPage(report.input.url, { render: o.render });
    if (page.status >= 400) {
      throw new Error(httpErrorMessage(page.status));
    }
    await step(`Homepage loaded (HTTP ${page.status})`);
    begin("files");
    await step("Reading robots.txt, sitemap and llms.txt");
    const [ctx, networkChecks] = await Promise.all([loadSiteContext(new URL(page.url).origin), brokenSchemaImages(page)]);
    await step(`robots.txt ${ctx.robots?.ok ? "found" : "not found"}, sitemap ${ctx.sitemap.found ? `found (${ctx.sitemap.urlCount} URLs)` : "not found"}, llms.txt ${ctx.llms?.ok ? "found" : "not found"}`);
    const home = auditFetched(page.url, page, ctx, networkChecks);
    await step(`Homepage scored ${home.scores.overall}/100`);
    report.home = home;
    if (isPublic("social") || o.socialPosts) report.social = analyzeSocial(page.body, page.url);
    await save();

    // Crawl
    let lastSave = 0;
    const crawlStage = begin("crawl");
    const crawl = await crawlSite(page.url, ctx, home, page.body, {
      maxPages: Math.min(Math.max(1, o.maxPages), LIMITS.maxPagesHard),
      concurrency: LIMITS.crawlConcurrency,
      delayMs: LIMITS.crawlDelayMs,
      render: o.render,
      onProgress: async (done, total, url, note) => {
        report.progress.step = `Crawling pages (${done}/${total}) — ${new URL(url).pathname}`;
        addLog(`Checked ${new URL(url).pathname} (${done}/${total}): ${note}`);
        if (crawlStage) crawlStage.total = total;
        report.progress.done = done;
        report.progress.total = total;
        if (Date.now() - lastSave > 1500) {
          lastSave = Date.now();
          await save();
        }
      },
    });
    report.site = buildSiteAudit(crawl, ctx, home);
    await step(`Crawled ${report.site.pagesCrawled} page${report.site.pagesCrawled === 1 ? "" : "s"}`);

    // Competitors
    if (o.competitors.length) {
      begin("competitors");
      report.competitors = [];
      for (const [i, c] of o.competitors.slice(0, LIMITS.maxCompetitors).entries()) {
        await step(`Auditing competitor ${i + 1}/${o.competitors.length}: ${c}`, i, o.competitors.length);
        report.competitors.push(await auditCompetitor(c, o.render));
      }
      report.gaps = findGaps(home, report.competitors);
      await save();
    }

    begin("fixes");
    await step("Generating ready-to-paste fixes");
    report.fixes = generateFixes(home, page.body, ctx, report.site.pages);
    await step(`Wrote ${report.fixes.length} ready-to-paste fix${report.fixes.length === 1 ? "" : "es"}`);
    await save();

    if (o.aiPlan && process.env.ANTHROPIC_API_KEY) {
      begin("plan");
      await step("Writing AI fix plan");
      try {
        report.plan = await sitePlan(home, report.site, report.gaps);
      } catch (e) {
        report.plan = { error: e instanceof Error ? e.message : String(e) };
      }
      await save();
    }

    const brand = brandFrom(home.facts.title, ctx.origin);
    const domain = new URL(ctx.origin).hostname.replace(/^www\./, "");

    if (o.aiVisibility) {
      try {
        if (!availableEngines().length) throw new Error("No AI engine API keys configured.");
        begin("visibility");
        await step("Preparing buyer questions for AI visibility test");
        const prompts = o.visibilityPrompts.length
          ? o.visibilityPrompts.slice(0, 20)
          : await suggestPrompts(brand, domain, `${home.facts.title}. ${home.facts.metaDescription}`);
        const competitors = (report.competitors ?? [])
          .filter((c) => c.ok)
          .map((c) => {
            const d = new URL(c.url).hostname.replace(/^www\./, "");
            return { name: d.split(".")[0], domain: d };
          });
        report.visibility = await runVisibility({
          brand,
          domain,
          prompts,
          competitors,
          onProgress: async (d, t) => {
            report.progress.step = `Asking AI assistants (${d}/${t})`;
            report.progress.done = d;
            report.progress.total = t;
            await save();
          },
        });
      } catch (e) {
        report.visibility = { error: e instanceof Error ? e.message : String(e) };
      }
      await save();
    }

    if (o.deepResearch) {
      begin("research");
      await step("Researching your niche on the web (can take a few minutes)");
      try {
        report.research = await runResearch({
          url: ctx.origin,
          title: home.facts.title,
          description: home.facts.metaDescription,
          pages: report.site.pages,
        });
      } catch (e) {
        report.research = { error: e instanceof Error ? e.message : String(e) };
      }
      await save();
    }

    if (o.socialPosts) {
      begin("social");
      await step("Writing social media posts");
      try {
        report.socialPosts = await writeSocialPosts({
          url: home.facts.finalUrl,
          title: home.facts.title,
          description: home.facts.metaDescription,
          excerpt: home.facts.h1.join(". ") + ". " + home.facts.metaDescription,
          brand,
        });
      } catch (e) {
        report.socialPosts = { error: e instanceof Error ? e.message : String(e) };
      }
      await save();
    }

    recordSitePages(report.site.pages);
    recordReportScore(report.id, report.site.scores, home).catch((e) => console.error("Saving the report score failed:", e));
    begin("finish");
    report.status = "done";
    await step("Report ready", 1, 1);
  } catch (e) {
    report.status = "error";
    report.error = e instanceof Error ? e.message : String(e);
    await save();
  } finally {
    release();
  }
  return report;
}

export function brandFrom(title: string, origin: string): string {
  const parts = title.split(/\s[|\-–—·:]\s/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts.sort((a, b) => a.length - b.length)[0];
  const host = new URL(origin).hostname.replace(/^www\./, "");
  return host.split(".")[0];
}
