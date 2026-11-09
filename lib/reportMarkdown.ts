import type { Report } from "./reportTypes";

const isErr = (x: unknown): x is { error: string } => !!x && typeof x === "object" && "error" in x;

export function reportToMarkdown(r: Report): string {
  const L: string[] = [];
  const brand = r.input.options.whiteLabel?.name;
  const s = r.site;
  L.push(`# SEO, AEO & GEO report — ${s?.origin ?? r.input.url}`);
  L.push(`_${new Date(r.createdAt).toLocaleString()}${brand ? ` · prepared by ${brand}` : ""}_`, "");
  if (s) {
    L.push(`**Overall ${s.scores.overall}** · SEO ${s.scores.seo} · AEO ${s.scores.aeo} · GEO ${s.scores.geo} · ${s.pagesCrawled} pages crawled`, "");
  }
  const plan = r.plan;
  if (plan && !isErr(plan)) {
    L.push("## Fix plan", "", plan.summary, "");
    plan.actions.forEach((a, i) => L.push(`${i + 1}. **[${a.priority}] ${a.title}** (${a.category}, ${a.effort})`, `   - Why: ${a.why}`, `   - How: ${a.how.replace(/\n/g, "\n     ")}`));
    L.push("");
  }
  if (s) {
    L.push("## Issues", "", "| Status | Area | Issue | Pages | Fix |", "|---|---|---|---|---|");
    for (const i of s.issues) L.push(`| ${i.status} | ${i.category.toUpperCase()} | ${i.title} | ${i.count} | ${(i.fix ?? "").replace(/\|/g, "/")} |`);
    L.push("");
  }
  if (r.competitors?.length) {
    L.push("## Competitors", "", "| Site | Overall | SEO | AEO | GEO |", "|---|---|---|---|---|");
    if (r.home) L.push(`| **You** (${new URL(r.home.facts.finalUrl).hostname}) | ${r.home.scores.overall} | ${r.home.scores.seo} | ${r.home.scores.aeo} | ${r.home.scores.geo} |`);
    for (const c of r.competitors) L.push(c.ok && c.scores ? `| ${new URL(c.url).hostname} | ${c.scores.overall} | ${c.scores.seo} | ${c.scores.aeo} | ${c.scores.geo} |` : `| ${c.url} | error: ${c.error} | | | |`);
    if (r.gaps?.length) {
      L.push("", "**Gaps (competitors pass, you don't):**");
      for (const g of r.gaps) L.push(`- ${g.title} — passing at ${g.competitorsPassing.join(", ")}`);
    }
    L.push("");
  }
  const v = r.visibility;
  if (v && !isErr(v)) {
    L.push("## AI visibility", "", "| Engine | Mentioned | Cited | Answers |", "|---|---|---|---|");
    for (const e of v.summary) L.push(`| ${e.engine} | ${e.mentionRate}% | ${e.citationRate}% | ${e.answered} |`);
    L.push("", "Share of voice: " + v.shareOfVoice.map((x) => `${x.name} ${x.mentions}`).join(" · "), "");
  }
  const rs = r.research;
  if (rs && !isErr(rs)) {
    L.push("## Niche research", "", `Niche: ${rs.niche}`, "", "**Questions your audience asks**");
    rs.audienceQuestions.forEach((q) => L.push(`- ${q.question} (${q.intent}${q.coveredOnSite ? ", covered" : ", NOT covered"})`));
    L.push("", "**Content plan**");
    rs.contentPlan.forEach((c) => L.push(`- **${c.title}** (${c.format}) — ${c.targetQuestion}`));
    L.push("");
  }
  if (r.social) {
    L.push("## Social & brand presence", "");
    r.social.checks.forEach((c) => L.push(`- **${c.status.toUpperCase()}** ${c.title} — ${c.detail}`));
    L.push("");
  }
  const sp = r.socialPosts;
  if (sp && !isErr(sp) && sp.posts.length) {
    L.push("## Social posts", "");
    sp.posts.forEach((p) => L.push(`### ${p.network}`, "", p.text, p.hashtags.length ? "\n" + p.hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ") : "", ""));
  }
  if (r.fixes?.length) {
    L.push("## Ready-to-paste fixes", "");
    for (const f of r.fixes) L.push(`### ${f.title}${f.filename ? ` (${f.filename})` : ""}`, "", f.description, "", "```" + (f.language === "markdown" ? "md" : f.language), f.content.trim(), "```", "");
  }
  if (s) {
    L.push("## Pages", "", "| URL | Status | Score | Words |", "|---|---|---|---|");
    for (const p of s.pages) L.push(`| ${p.url} | ${p.status || "err"} | ${p.scores.overall} | ${p.wordCount} |`);
  }
  return L.join("\n");
}
