// Live smoke test: npx tsx scripts/smoke-report.mts https://example.com 8
import { runReport } from "../lib/report";
import { newId } from "../lib/store";
const url = process.argv[2] ?? "https://example.com";
const max = Number(process.argv[3] ?? 8);
const r = await runReport({
  id: newId(), createdAt: "", updatedAt: "", status: "queued",
  progress: { step: "", done: 0, total: 1, log: [] },
  input: { url, options: { maxPages: max, competitors: process.argv.slice(4), aiPlan: false, aiVisibility: false, visibilityPrompts: [], deepResearch: false, render: false, socialPosts: false } },
});
console.log("status:", r.status, r.error ?? "");
console.log("site scores:", r.site?.scores, "pages:", r.site?.pagesCrawled, "/", r.site?.pagesDiscovered);
for (const i of r.site?.issues.slice(0, 14) ?? []) console.log(` ${i.status} [${i.category}] ${i.title} ×${i.count}`);
console.log("competitors:", r.competitors?.map((c) => [c.url, c.scores?.overall, c.error]));
console.log("gaps:", r.gaps?.slice(0, 5).map((g) => g.title));
console.log("fixes:", r.fixes?.map((f) => f.id));
console.log("social:", r.social?.profiles.map((p) => p.network), r.social?.checks.map((c) => c.status));
console.log(r.fixes?.find((f) => f.id === "llms")?.content.slice(0, 400));
