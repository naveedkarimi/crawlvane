// Tests referrals, add-ons, Slack alerts, issue export and the new billing events, without Stripe or a database: `npm test`
import assert from "node:assert/strict";
import Stripe from "stripe";

process.env.PAYWALL_ENABLED = "1";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_PRICE_PRO = "price_pro";
process.env.STRIPE_PRICE_AGENCY = "price_agency";
process.env.STRIPE_PRICE_EXTRA_SEAT = "price_seat";
process.env.STRIPE_PRICE_EXTRA_SITES = "price_sites";

const { issuesCsv, priorityOf, cell } = await import("../lib/issueExport");
const { makeReferralCode, isReferralCode, oneMonthValue } = await import("../lib/referrals");
const { isSlackWebhook, slackMessage } = await import("../lib/slack");
const { addonsFromItems, planItemOf, handleEvent } = await import("../lib/billing");
const { limitsFor, PLAN_LIMITS, SITES_PER_PACK } = await import("../lib/entitlements");

// ---------- Issue export ----------
const issue = { site: "example.com", url: "https://example.com", title: "Missing H1", status: "fail" as const, category: "seo", weight: 3, detail: "No H1, the page has no main heading", assignee: "a@b.co" };
assert.equal(priorityOf(issue), "High");
assert.equal(priorityOf({ status: "fail", weight: 1 }), "Medium");
assert.equal(priorityOf({ status: "warn", weight: 3 }), "Low");
const jira = issuesCsv([issue], "jira").split("\r\n");
assert.equal(jira[0], "Summary,Description,Priority,Labels,Assignee");
assert.equal(jira[1], 'example.com: Missing H1,"No H1, the page has no main heading (https://example.com)",High,seo-audit seo,a@b.co');
assert.equal(issuesCsv([issue], "linear").split("\r\n")[0], "Title,Description,Priority,Status,Labels,Assignee");
assert.match(issuesCsv([issue], "csv"), /^Site,Issue,Result,Priority,Category,Detail,URL,Assignee\r\nexample\.com,Missing H1,Failed,High/);
// Spreadsheet formulas can't be smuggled in through a page title.
assert.equal(cell("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
assert.equal(cell("-1"), "'-1");
assert.equal(cell('say "hi"'), '"say ""hi"""');
console.log("✓ fixes export to Jira, Linear and CSV, safely");

// ---------- Referrals ----------
const codes = new Set(Array.from({ length: 200 }, makeReferralCode));
assert.ok(codes.size > 195, "codes are random");
for (const c of codes) assert.ok(isReferralCode(c), `valid code ${c}`);
assert.equal(isReferralCode("abc"), false);
assert.equal(isReferralCode("ABCDEFGH"), false);
assert.equal(isReferralCode("abcdefg0"), false, "no look-alike characters");
assert.equal(oneMonthValue({ unit_amount: 3900, recurring: { interval: "month", interval_count: 1 } }), 3900);
assert.equal(oneMonthValue({ unit_amount: 39000, recurring: { interval: "year", interval_count: 1 } }), 3250);
assert.equal(oneMonthValue({ unit_amount: 3900, recurring: null }), 0, "one-off prices give nothing");
assert.equal(oneMonthValue(null), 0);
console.log("✓ referral codes and the free-month amount");

// ---------- Slack ----------
assert.ok(isSlackWebhook("https://hooks.slack.com/services/T000/B000/XXXX1234"));
assert.equal(isSlackWebhook("http://hooks.slack.com/services/T000/B000/XXXX"), false, "https only");
assert.equal(isSlackWebhook("https://hooks.slack.com.evil.test/services/T/B/X"), false, "Slack's host only");
assert.equal(isSlackWebhook("https://example.com/hook"), false);
const msg = slackMessage("fail", "example.com: Score dropped from 80 to 70.", "Top issue: <script>");
assert.match(msg.text, /^:red_circle: \*example\.com: Score dropped from 80 to 70\.\*/);
assert.match(msg.text, /&lt;script&gt;/, "Slack's special characters are escaped");
console.log("✓ Slack accepts only real webhooks and escapes alert text");

// ---------- Add-ons ----------
const items = [{ price: { id: "price_agency" }, quantity: 1 }, { price: { id: "price_seat" }, quantity: 3 }, { price: { id: "price_sites" }, quantity: 2 }];
assert.deepEqual(addonsFromItems(items), { extra_seats: 3, extra_site_packs: 2 });
assert.equal(planItemOf([items[1], items[0]])?.price?.id, "price_agency", "the plan item is found even when it isn't first");
const agency = limitsFor({ plan: "agency", extra_seats: 3, extra_site_packs: 2 });
assert.equal(agency.seats, PLAN_LIMITS.agency.seats + 3);
assert.equal(agency.sites, PLAN_LIMITS.agency.sites + 2 * SITES_PER_PACK);
assert.equal(agency.monitors, PLAN_LIMITS.agency.monitors + 2 * SITES_PER_PACK);
assert.deepEqual(limitsFor({ plan: "agency", extra_seats: -5 }), PLAN_LIMITS.agency, "negative add-ons are ignored");
console.log("✓ add-ons raise seat and site limits");

// ---------- New billing events ----------
const seen = new Set<string>();
const log: string[] = [];
const deps = {
  seen: async (id: string) => (seen.has(id) ? true : (seen.add(id), false)),
  forget: async (id: string) => void seen.delete(id),
  orgForCustomer: async (c: string) => (c === "cus_1" ? "org_1" : null),
  update: async (org: string, u: Record<string, unknown>) => void log.push(`update ${org} ${JSON.stringify(u)}`),
  addPack: async () => {},
  paid: async (org: string) => void log.push(`paid ${org}`),
  trialEnding: async (org: string, end: Date | null) => void log.push(`trial ${org} ${end?.toISOString().slice(0, 10)}`),
};
const ev = (id: string, type: string, object: unknown) => ({ id, type, data: { object } }) as unknown as Stripe.Event;
const sub = (status: string, list: unknown[]) => ({ id: "sub_1", status, customer: "cus_1", metadata: {}, items: { data: list } });

assert.equal(await handleEvent(ev("g1", "customer.subscription.updated", sub("active", items)), deps), "plan set to agency");
assert.match(log.at(-2)!, /"extra_seats":3,"extra_site_packs":2/);
assert.equal(log.at(-1), "paid org_1", "an active subscription rewards the referrer");
await handleEvent(ev("g2", "customer.subscription.created", sub("trialing", [items[0]])), deps);
assert.notEqual(log.at(-1), "paid org_1", "a trial isn't a payment");
await handleEvent(ev("g3", "customer.subscription.deleted", sub("canceled", items)), deps);
assert.match(log.at(-1)!, /"extra_seats":0,"extra_site_packs":0/, "add-ons end with the subscription");
assert.equal(await handleEvent(ev("g4", "customer.subscription.trial_will_end", { ...sub("trialing", items), trial_end: 1798761600 }), deps), "trial ending email");
assert.equal(log.at(-1), "trial org_1 2027-01-01");
console.log("✓ billing records add-ons, rewards referrers on payment and warns before a trial ends");

// ---------- Batch 2: AI helpers (no AI calls) ----------
const { fitMeta, faqMarkup, pageInput, wordCount, TITLE_MAX, DESC_MAX } = await import("../lib/ai/helpers");
const { promptGaps } = await import("../lib/promptGaps");
const meta = fitMeta({ titles: ["Short", "A good title that fits in search results", "A good title that fits in search results", "x".repeat(TITLE_MAX + 1)], descriptions: ["too short", "d".repeat(130), "e".repeat(DESC_MAX + 1)] });
assert.deepEqual(meta.titles, ["A good title that fits in search results"], "too short, too long and duplicate titles are dropped");
assert.deepEqual(meta.descriptions, ["d".repeat(130)]);
const faq = faqMarkup([{ question: "Is it <free>?", answer: "Yes </script> really" }]);
assert.match(faq.html, /<h3>Is it &lt;free&gt;\?<\/h3>/, "FAQ HTML is escaped");
assert.ok(!faq.jsonLd.slice(0, -10).includes("</script>"), "an answer can't close the schema's script tag early");
assert.match(faq.jsonLd, /"@type": "FAQPage"/);
const p = pageInput({ finalUrl: "https://example.com", title: "T", metaDescription: "", outline: Array.from({ length: 100 }, (_, i) => ({ level: 9, text: `H ${i}` })), textExcerpt: "w ".repeat(5000) });
assert.equal(p.outline.length, 60, "headings are capped");
assert.equal(p.outline[0].level, 6, "heading levels are clamped");
assert.ok(p.textExcerpt.length <= 4000, "page text is capped");
assert.equal(wordCount("  one two   three "), 3);
console.log("✓ AI helper output is sized, escaped and capped");

const gaps = promptGaps([
  { prompt: "best seo tool", engine: "ChatGPT", mentioned: false, competitorsMentioned: ["Rival A"] },
  { prompt: "best seo tool", engine: "Claude", mentioned: false, competitorsMentioned: ["Rival B", "Rival A"] },
  { prompt: "ai audit", engine: "ChatGPT", mentioned: true, competitorsMentioned: ["Rival A"] },
  { prompt: "llms.txt help", engine: "Gemini", mentioned: false, competitorsMentioned: [] },
  { prompt: "broken", engine: "Perplexity", mentioned: false, competitorsMentioned: ["Rival C"], error: "timeout" },
]);
assert.deepEqual(gaps, [{ prompt: "best seo tool", engines: ["ChatGPT", "Claude"], competitors: ["Rival A", "Rival B"] }], "only questions where competitors appear and you never do");
console.log("✓ prompt gaps list questions competitors win and you don't");

// ---------- Batch 3: internal links and fix prices ----------
const { suggestLinks, topicWords, overlap } = await import("../lib/linkSuggest");
const { fixTypeOf, pricedFixes, anyFixPrice, FIX_PRICES } = await import("../lib/fixPrices");
const lp = (path: string, title: string, inlinks: number) => ({ url: `https://ex.com${path}`, title, h1: title, description: "", inlinks });
const pages = [
  lp("/", "Home", 9),
  lp("/guides/schema-markup", "Schema markup guide for local businesses", 0),
  lp("/blog/local-seo-schema", "Local SEO: schema markup that helps local businesses", 4),
  lp("/blog/robots", "Robots.txt for AI crawlers", 3),
  lp("/pricing", "Pricing", 5),
];
const links = suggestLinks(pages, new Map([["https://ex.com/guides/schema-markup", new Set<string>()]]));
assert.equal(links[0].target, "https://ex.com/guides/schema-markup", "the least-linked page comes first");
assert.equal(links[0].from[0].url, "https://ex.com/blog/local-seo-schema", "suggested from the most related page");
assert.ok(!links.some((l) => l.target === "https://ex.com/"), "the home page isn't a target");
const already = suggestLinks(pages, { "https://ex.com/guides/schema-markup": ["https://ex.com/blog/local-seo-schema"] });
assert.ok(!already.some((l) => l.from.some((f) => f.url === "https://ex.com/blog/local-seo-schema" && l.target.endsWith("schema-markup"))), "pages that already link aren't suggested");
assert.ok(overlap(topicWords("schema markup guides"), topicWords("schema markup guide")) > 0.9, "plurals match");
console.log("✓ internal link suggestions pick related pages that don't link yet");

assert.equal(fixTypeOf("robots-txt"), "access");
assert.equal(fixTypeOf("llms-full"), "llms");
assert.equal(fixTypeOf("faq-schema"), "structured");
assert.equal(fixTypeOf("question-headings"), "content");
assert.equal(fixTypeOf("ttfb"), "speed");
assert.equal(fixTypeOf("canonical"), "technical");
assert.equal(anyFixPrice(), false, "no prices are shown until they're set");
const priced = pricedFixes([{ id: "title", status: "fail" }, { id: "meta-description", status: "warn" }, { id: "https", status: "pass" }], { ...FIX_PRICES, meta: 49 });
assert.deepEqual(priced, [{ type: "meta", label: "Titles, descriptions and previews", issues: 2, from: 49 }]);
console.log("✓ fix prices group issues by type and only show amounts you set");

// ---------- Batch 4: Google tokens, GitHub pull requests, Cloudflare Worker ----------
process.env.TOKEN_ENCRYPTION_KEY = "test-key-not-for-production";
const { encrypt, decrypt, isGscProperty, isGa4Property } = await import("../lib/google");
const { isRepo, isGithubToken, cleanDir } = await import("../lib/githubPr");
const { workerScript } = await import("../lib/workerTemplate");
const sealed = encrypt("1//refresh-token");
assert.notEqual(sealed, encrypt("1//refresh-token"), "each encryption is different");
assert.ok(!sealed.includes("refresh"), "the token isn't readable in the database");
assert.equal(decrypt(sealed), "1//refresh-token");
const parts = sealed.split(".");
assert.throws(() => decrypt([parts[0], parts[1], parts[2], parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA")].join(".")), "a changed token is rejected");
assert.ok(isGscProperty("sc-domain:example.com") && isGscProperty("https://example.com/"));
assert.equal(isGscProperty("javascript:alert(1)"), false);
assert.ok(isGa4Property("properties/123456"));
assert.equal(isGa4Property("properties/abc"), false);
console.log("✓ Google tokens are encrypted and properties are checked");

assert.ok(isRepo("owner/my-site.com"));
assert.equal(isRepo("owner/../etc"), false);
assert.equal(isRepo("../etc"), false, "no dot-only names");
assert.ok(isRepo("owner/.github"), "real repo names with dots still work");
assert.equal(isRepo("not a repo"), false);
assert.ok(isGithubToken("github_pat_" + "a".repeat(60)));
assert.equal(isGithubToken("password"), false);
assert.equal(cleanDir("/public/"), "public/");
assert.equal(cleanDir(""), "");
assert.throws(() => cleanDir("../secrets"), "no climbing out of the repository");
const worker = workerScript({ llmsTxt: "# Site\n> About", robotsTxt: null });
assert.match(worker, /const LLMS_TXT = "# Site\\n> About";/);
assert.match(worker, /const ROBOTS_TXT = null;/);
assert.ok(!worker.includes("</script>"));
console.log("✓ GitHub inputs are checked and the Worker embeds the fixes safely");

// ---------- Quick adds Q1-Q6: report diagnostics ----------
const { diagnose, coverageCsv } = await import("../lib/siteDiagnostics");
const pg = (url: string, extra: Record<string, unknown> = {}) => ({ url, status: 200, depth: 1, ms: 100, title: `T ${url}`, description: "", h1: "", wordCount: 300, noindex: false, canonical: "", scores: { overall: 80, seo: 80, aeo: 80, geo: 80 }, fails: [], warns: [], inlinks: 1, ...extra });
const U = (p: string) => `https://ex.com${p}`;
const dPages = [
  pg(U("/"), { depth: 0 }),
  pg(U("/a"), { title: "Same", textKey: "abc" }),
  pg(U("/b"), { title: "Same", textKey: "abc" }),
  pg(U("/gone"), { title: "Page not found", wordCount: 12 }),
  pg(U("/hidden"), { noindex: true }),
  pg(U("/old"), { canonical: U("/new") }),
];
const dLinks = new Map<string, Set<string>>([[U("/hidden"), new Set([U("/")])], [U("/old"), new Set([U("/a")])], [U("/a"), new Set([U("/")])]]);
const diag = diagnose({
  seen: [U("/"), U("/a"), U("/b"), U("/gone"), U("/hidden"), U("/old"), U("/doc.pdf"), U("/far"), U("/Shop"), U("/shop/")].map((url, i) => ({ url, depth: i === 0 ? 0 : 1 })),
  skipped: [U("/doc.pdf")],
  results: [...dPages.map((p) => ({ url: p.url, status: 200, depth: 1 })), { url: U("/Shop"), status: 503, depth: 1, error: "HTTP 503" }, { url: U("/shop/"), status: 0, depth: 1, blocked: true }],
  pages: dPages as never,
  inlinks: dLinks,
});
assert.equal(diag.coverage.discovered, 10);
assert.equal(diag.coverage.skipped, 1);
assert.equal(diag.coverage.notReached, 1, "/far was found but never crawled");
assert.equal(diag.coverage.failed, 1);
assert.equal(diag.coverage.blocked, 1);
assert.ok(diag.groups.some((g) => g.kind === "content" && g.urls.length === 2), "same text grouped");
assert.ok(diag.groups.some((g) => g.kind === "title" && g.value === "Same"));
assert.deepEqual(diag.soft404.map((x) => x.url), [U("/gone")]);
assert.equal(diag.urlVariants.length, 1, "/Shop and /shop/ are the same page");
assert.deepEqual(diag.badLinkTargets.map((x) => x.url).sort(), [U("/hidden"), U("/old")]);
assert.equal(dPages[0].outlinks, 2, "links out are counted");
assert.match(coverageCsv(diag), /^URL,Outcome,Reason,Click depth\r\n/);
console.log("✓ report diagnostics: coverage, groups, soft 404s, URL variants and wrong link targets");

// ---------- Q7: Search Console opportunities ----------
const { searchOpportunities } = await import("../lib/google");
const opp = searchOpportunities(
  [{ keys: ["/a"], clicks: 1, impressions: 500, ctr: 0.002, position: 4 }, { keys: ["/b"], clicks: 40, impressions: 500, ctr: 0.08, position: 3 }, { keys: ["/c"], clicks: 0, impressions: 900, ctr: 0, position: 35 }],
  [{ keys: ["seo audit"], clicks: 2, impressions: 300, ctr: 0.01, position: 11 }, { keys: ["brand"], clicks: 90, impressions: 300, ctr: 0.3, position: 1 }, { keys: ["rare"], clicks: 0, impressions: 10, ctr: 0, position: 12 }],
);
assert.deepEqual(opp.lowCtrPages.map((p) => p.page), ["/a"], "page 1, many impressions, few clicks");
assert.deepEqual(opp.nearlyThere.map((q) => q.query), ["seo audit"], "positions 8-20 with enough impressions");
console.log("✓ Search Console opportunities use fixed thresholds");

// ---------- Q9, Q11, Q13, Q14 ----------
const { compareReports, topIssues } = await import("../lib/reportCompare");
const { citedSources, recountSummary, recountShareOfVoice } = await import("../lib/promptGaps");
const { sign } = await import("../lib/webhooks");
const rep = (createdAt: string, overall: number, issues: { id: string; count: number; status?: string }[], urls: string[]) => ({
  createdAt,
  site: { scores: { overall, seo: overall, aeo: overall, geo: overall }, issues: issues.map((i) => ({ id: i.id, title: i.id, status: i.status ?? "warn", weight: 2, count: i.count, category: "site" })), pages: urls.map((url) => ({ url })) },
});
const diff = compareReports(rep("2026-10-01", 70, [{ id: "a", count: 5 }, { id: "b", count: 2 }, { id: "c", count: 3 }], ["/1", "/2"]), rep("2026-11-01", 78, [{ id: "a", count: 2 }, { id: "c", count: 6 }, { id: "d", count: 1 }], ["/2", "/3", "/4"]))!;
assert.equal(diff.scores.overall, 8);
assert.deepEqual(diff.resolved.map((i) => i.id), ["b"]);
assert.deepEqual(diff.newIssues.map((i) => i.id), ["d"]);
assert.deepEqual(diff.better.map((i) => i.id), ["a"]);
assert.deepEqual(diff.worse.map((i) => i.id), ["c"]);
assert.equal(diff.pagesAdded, 2);
assert.equal(diff.pagesGone, 1);
assert.deepEqual(topIssues([{ status: "warn", weight: 3, count: 50, id: "w" }, { status: "fail", weight: 1, count: 1, id: "f" }], 2).map((i) => i.id), ["f", "w"], "failures lead the summary");
console.log("✓ report comparison and executive summary");

const vRows = [
  { prompt: "q1", engine: "ChatGPT", mentioned: true, cited: true, citedUrls: ["https://ex.com/a", "https://www.g2.com/x", "https://g2.com/y"] },
  { prompt: "q2", engine: "ChatGPT", mentioned: false, cited: false, citedUrls: ["https://g2.com/z", "https://reddit.com/r"] },
  { prompt: "q1", engine: "Claude", mentioned: false, cited: false, citedUrls: [], error: "timeout" },
];
assert.deepEqual(citedSources(vRows, "ex.com").map((c) => [c.domain, c.times]), [["g2.com", 2], ["reddit.com", 1]], "own domain excluded, one count per answer");
assert.deepEqual(recountSummary(vRows), [{ engine: "ChatGPT", answered: 2, mentionRate: 50, citationRate: 50 }, { engine: "Claude", answered: 0, mentionRate: 0, citationRate: 0 }]);
assert.deepEqual(recountShareOfVoice(vRows, "Ex", []), [{ name: "Ex", mentions: 1 }]);
console.log("✓ cited sources and recounts after a correction");
{
  const { outreachTargets } = await import("../lib/promptGaps");
  const rows = [
    { prompt: "best crm", engine: "ChatGPT", mentioned: false, competitorsMentioned: ["Rival"], citedUrls: ["https://g2.com/a", "https://rival.com/x", "https://blog.example/b"] },
    { prompt: "crm for agencies", engine: "Claude", mentioned: false, competitorsMentioned: ["Rival"], citedUrls: ["https://g2.com/c"] },
    { prompt: "best crm", engine: "Claude", mentioned: true, competitorsMentioned: ["Rival"], citedUrls: ["https://g2.com/d", "https://wiki.example/e"] },
  ];
  const src = citedSources(rows, "ex.com", 10, ["www.rival.com"]);
  const g2 = src.find((x) => x.domain === "g2.com")!;
  assert.equal(g2.times, 3);
  assert.equal(g2.withoutYou, 2, "only answers naming a rival but not you count");
  assert.equal(src.find((x) => x.domain === "rival.com")!.competitor, true);
  assert.deepEqual(outreachTargets(src).map((x) => x.domain), ["g2.com", "blog.example"], "rival's own site and sources cited alongside you are left out");
}
console.log("✓ sources that favour competitors are flagged for outreach");
{
  const { pickSpeedPages, summariseSpeed, ratingFor } = await import("../lib/siteSpeed");
  const pg = (url: string, depth: number, inlinks: number, extra: object = {}) => ({ url, status: 200, depth, inlinks, noindex: false, ms: 1, title: "", description: "", h1: "", wordCount: 100, canonical: "", scores: { overall: 1, seo: 1, aeo: 1, geo: 1 }, fails: [], warns: [], ...extra });
  const picked = pickSpeedPages([
    pg("https://ex.com/", 0, 9), pg("https://ex.com/deep", 3, 50), pg("https://ex.com/pricing", 1, 20), pg("https://ex.com/about", 1, 5),
    pg("https://ex.com/hidden", 1, 99, { noindex: true }), pg("https://ex.com/gone", 1, 99, { status: 404 }), pg("https://ex.com/blog", 2, 30),
  ] as never, "https://ex.com", 4);
  assert.deepEqual(picked, ["https://ex.com", "https://ex.com/pricing", "https://ex.com/about", "https://ex.com/blog"], "homepage once, then shallow and well-linked; noindex and errors skipped");
  assert.equal(ratingFor(95), "good"); assert.equal(ratingFor(50), "ok"); assert.equal(ratingFor(49), "bad"); assert.equal(ratingFor(null), "none");
  const page = (url: string, performance: number | null) => ({ url, performance, rating: ratingFor(performance), lcp: null, cls: null, tbt: null, field: "none" as const, reportUrl: "" });
  const opp = (title: string) => ({ id: title, title, googleTitle: title, savings: null, savingsMs: 0, what: "", fix: "", who: "Developer" as const });
  const sum = summariseSpeed([
    { page: page("a", 80), psi: { opportunities: [opp("Compress images"), opp("Remove unused JavaScript")] } as never },
    { page: page("b", 40), psi: { opportunities: [opp("Compress images")] } as never },
    { page: page("c", null) },
  ]);
  assert.equal(sum.average, 60, "failed pages don't drag the average");
  assert.deepEqual(sum.shared, [{ title: "Compress images", pages: 2, who: "Developer" }], "only fixes seen on several pages");
}
console.log("✓ speed test picks the top pages and finds shared fixes");
{
  const { aiViewVerdict, aiViewMarkdown } = await import("../lib/aiView");
  assert.equal(aiViewVerdict({ wordCount: 12 }).tone, "bad");
  assert.equal(aiViewVerdict({ wordCount: 120 }).tone, "warn");
  assert.equal(aiViewVerdict({ wordCount: 900 }).tone, "good");
  assert.equal(aiViewVerdict({ wordCount: 5, rendered: true }).tone, "info");
  assert.match(aiViewVerdict({ wordCount: 1240, rendered: true, rawWordCount: 0 }).text, /People see 1,240 words, but AI crawlers get 0/);
  assert.equal(aiViewVerdict({ wordCount: 1000, rendered: true, rawWordCount: 400 }).tone, "warn");
  assert.equal(aiViewVerdict({ wordCount: 1000, rendered: true, rawWordCount: 900 }).tone, "good");
  const { htmlWords } = await import("../lib/analyze");
  assert.equal(htmlWords("<html><body><nav>Menu here</nav><main>One two three</main><script>var x = 1</script></body></html>"), 3, "counts main content like the page check");
  const md = aiViewMarkdown({
    finalUrl: "https://ex.com/", title: "Ex", metaDescription: "", wordCount: 30, outline: [{ level: 1, text: "Hello" }, { level: 2, text: "Sub" }],
    textExcerpt: "Hello world", bots: [{ bot: "GPTBot", owner: "OpenAI", purpose: "search", allowed: false, matchedGroup: "*" }, { bot: "CCBot", owner: "Common Crawl", purpose: "training", allowed: true, matchedGroup: "*" }],
  } as never).join("\n");
  assert.match(md, /## What AI sees/);
  assert.match(md, /almost nothing: 30 words/);
  assert.match(md, /AI crawlers allowed:\*\* 0 of 1/, "training bots aren't counted as answer bots");
  assert.match(md, /  - H2: Sub/);
  assert.match(md, /> Hello world/);
}
console.log("✓ What AI sees is in the Markdown download");
{
  const { matchBot, summariseBotHits, botSnippets, botRegexSource, isBotToken, TRACKED_BOTS } = await import("../lib/botHits");
  assert.equal(matchBot("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://anthropic.com)"), "Claude-SearchBot", "the longer name wins");
  assert.equal(matchBot("Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)"), "GPTBot");
  assert.equal(matchBot("Mozilla/5.0 (Macintosh) Safari/605"), null, "people aren't counted");
  assert.equal(matchBot(42), null);
  assert.ok(!TRACKED_BOTS.includes("Google-Extended"), "robots.txt-only tokens aren't user agents");
  const re = new RegExp(botRegexSource(), "i");
  assert.ok(re.test("PerplexityBot/1.0") && re.test("chatgpt-user/1.0") && !re.test("Firefox/120"), "the snippet's pattern is valid and matches bots");
  const sn = botSnippets("https://app.example/api/bot-hits", "a".repeat(48));
  for (const k of ["worker", "php", "node"] as const) assert.ok(sn[k].includes("https://app.example/api/bot-hits") && sn[k].includes("a".repeat(48)), `${k} snippet has the endpoint and token`);
  assert.ok(isBotToken("f".repeat(48)) && !isBotToken("f".repeat(47)) && !isBotToken("../x"));
  const sum = summariseBotHits([{ day: "2026-11-13", bot: "GPTBot", hits: 5 }, { day: "2026-11-12", bot: "GPTBot", hits: 2 }, { day: "2026-11-13", bot: "ClaudeBot", hits: 1 }], 3, new Date("2026-11-13T12:00:00Z"));
  assert.equal(sum.total, 8);
  assert.deepEqual(sum.daily, [{ day: "2026-11-11", hits: 0 }, { day: "2026-11-12", hits: 2 }, { day: "2026-11-13", hits: 6 }], "missing days are zero");
  assert.equal(sum.bots[0].bot, "GPTBot");
  assert.equal(sum.lastDay, "2026-11-13");
}
console.log("✓ AI bot visits: matching, snippets and daily totals");
{
  const { hashedKey, localRateLimit } = await import("../lib/rateLimit");
  const k = hashedKey("audit:203.0.113.9", "secret-a");
  assert.ok(!k.includes("203.0.113.9") && k.length === 32, "the database never sees the IP");
  assert.equal(k, hashedKey("audit:203.0.113.9", "secret-a"), "same key, same hash");
  assert.notEqual(k, hashedKey("audit:203.0.113.9", "secret-b"), "depends on the server secret");
  const key = "t:" + Math.random();
  assert.ok(localRateLimit(key, 2) && localRateLimit(key, 2) && !localRateLimit(key, 2), "fallback limiter stops at the limit");
}
console.log("✓ shared rate limits hash their keys and fall back safely");
{
  const { websiteVariants, searchQuery, sameAsLinks } = await import("../lib/entity");
  assert.deepEqual(websiteVariants("https://www.Ex.com/about"), ["https://ex.com", "https://ex.com/", "https://www.ex.com", "https://www.ex.com/", "http://ex.com", "http://ex.com/", "http://www.ex.com", "http://www.ex.com/"]);
  assert.match(searchQuery("ex.com"), /^haswbstatement:P856=https:\/\/ex\.com\|P856=/);
  assert.ok(sameAsLinks(["https://www.wikidata.org/wiki/Q42"], "Q42") && !sameAsLinks(["https://www.wikidata.org/wiki/Q420"], "Q42"), "Q42 isn't Q420");
}
console.log("✓ entity check builds the Wikidata lookup and spots sameAs links");
{
  const { drainWith, shouldGiveUp, MAX_ATTEMPTS } = await import("../lib/jobs");
  const queue = [
    { id: "1", kind: "report", ref_id: "a", attempts: 1 },
    { id: "2", kind: "report", ref_id: "b", attempts: 1 },
    { id: "3", kind: "report", ref_id: "c", attempts: MAX_ATTEMPTS + 1 },
    { id: "4", kind: "report", ref_id: "d", attempts: 1 },
  ];
  const finished: [string, boolean][] = [];
  const gaveUp: string[] = [];
  let live = 0, peak = 0;
  const ran = await drainWith(
    { claim: async () => queue.shift() ?? null, extend: async () => {}, finish: async (id, ok) => { finished.push([id, ok]); } },
    async (job, keepAlive) => {
      live++; peak = Math.max(peak, live);
      await keepAlive();
      await new Promise((r) => setTimeout(r, 5));
      live--;
      if (job.ref_id === "b") throw new Error("crawl failed");
    },
    async (job) => { gaveUp.push(job.ref_id); },
    2,
  );
  assert.equal(ran, 3, "three jobs ran; the over-tried one didn't");
  assert.equal(peak, 2, "never more than the concurrency limit");
  assert.deepEqual(gaveUp, ["c"]);
  assert.deepEqual(finished.sort(), [["1", true], ["2", false], ["3", false], ["4", true]], "a failure is recorded, not thrown");
  assert.ok(shouldGiveUp({ attempts: MAX_ATTEMPTS + 1 }) && !shouldGiveUp({ attempts: MAX_ATTEMPTS }));
}
console.log("✓ job queue: claims, limits concurrency, records failures and gives up after retries");
{
  const { cleanKeyword, keywordTrend, weekOf } = await import("../lib/rankTracking");
  assert.equal(cleanKeyword("  Boiler   Service LEEDS "), "boiler service leeds");
  assert.equal(cleanKeyword("x"), null);
  assert.equal(weekOf(new Date("2026-11-13T10:00:00Z")), "2026-11-09", "weeks start on Monday");
  assert.equal(weekOf(new Date("2026-11-09T00:00:00Z")), "2026-11-09");
  const t = keywordTrend([{ week: "2026-11-09", position: 6.2, clicks: 3, impressions: 90 }, { week: "2026-11-02", position: 9.5, clicks: 1, impressions: 60 }]);
  assert.equal(t.latest?.week, "2026-11-09");
  assert.equal(t.change, 3.3, "moving from 9.5 to 6.2 is 3.3 places better");
  assert.equal(keywordTrend([{ week: "2026-11-09", position: null, clicks: 0, impressions: 0 }, { week: "2026-11-02", position: 4, clicks: 0, impressions: 0 }]).change, null, "no change number when it stopped ranking");

  const { groupByDomain } = await import("../lib/bing");
  assert.deepEqual(groupByDomain([{ from: "https://www.a.com/x", anchor: "" }, { from: "https://a.com/y", anchor: "" }, { from: "https://b.org/", anchor: "" }, { from: "nope", anchor: "" }]), [{ domain: "a.com", links: 2 }, { domain: "b.org", links: 1 }]);

  const { cleanInput, slugify, findPlaceholders, WriterError } = await import("../lib/ai/writer");
  assert.throws(() => cleanInput({ topic: "ab" }), WriterError);
  assert.deepEqual(cleanInput({ topic: " Boiler costs ", length: "huge" }), { topic: "Boiler costs", notes: "", audience: "", length: "medium" });
  assert.equal(slugify("How much does a Boiler Service cost? (2026)"), "how-much-does-a-boiler-service-cost-2026");
  assert.deepEqual(findPlaceholders("From [your price], see [1] and [our guide](/x). Call [phone number]."), ["[your price]", "[phone number]"], "links and footnotes aren't placeholders");

  const { renderMarkdown } = await import("../lib/blog/markdown");
  const html = renderMarkdown("[a](javascript:alert(1)) [b](https://x.com/\"y) <img src=x onerror=alert(1)>").html;
  assert.ok(!/href="javascript/i.test(html) && !html.includes('"y') && !html.includes("<img"), "AI drafts can't inject links or HTML");
}
console.log("✓ rank tracking, backlinks and AI writer helpers");

assert.equal(sign("whsec_test", '{"a":1}'), "sha256=" + (await import("node:crypto")).createHmac("sha256", "whsec_test").update('{"a":1}').digest("hex"));
console.log("✓ webhook requests are signed");

// ---------- Security: sign-in redirects stay on this site ----------
const { safeNextPath } = await import("../lib/safeNext");
for (const bad of ["/.//evil.example", "/..//evil.example", "/a/..//evil.example", "/%2e//evil.example", "/%2E%2E//evil.example", "//evil.example", "/\\evil.example", "/\\/evil.example", "https://evil.example", "javascript:alert(1)", "/%0d%0aSet-Cookie:x", "/dash\u0000board", "", null]) {
  const out = safeNextPath(bad as string | null);
  assert.ok(out === "/dashboard" || out.startsWith("/%0d"), `rejected ${JSON.stringify(bad)} → ${out}`);
}
assert.equal(safeNextPath("/dashboard?tab=plan&buy=pro"), "/dashboard?tab=plan&buy=pro");
assert.equal(safeNextPath("/invite/abc#x"), "/invite/abc#x");
console.log("✓ sign-in redirects can't leave the site");

const { passwordProblem, linkType, afterLink, authHref, MIN_PASSWORD } = await import("../lib/authLinks");
assert.equal(MIN_PASSWORD, 10);
assert.match(passwordProblem("short") ?? "", /at least 10 characters\. You have 5/);
assert.equal(passwordProblem("correct horse battery"), null);
assert.ok(passwordProblem("          "), "only spaces is refused");
assert.ok(passwordProblem("x".repeat(73)), "over bcrypt's 72 bytes is refused");
assert.ok(passwordProblem("é".repeat(40)), "72 bytes, not 72 characters");
assert.equal(linkType("recovery"), "recovery");
assert.equal(linkType("email"), "email");
assert.equal(linkType("admin"), null);
assert.equal(linkType(null), null);
assert.equal(afterLink("recovery", "/dashboard?tab=plan"), "/reset-password", "reset links always go to the new-password page");
assert.equal(afterLink("email", "/dashboard?tab=plan"), "/dashboard?tab=plan");
assert.equal(authHref("/signup", "/dashboard"), "/signup");
assert.equal(authHref("/signup", "/invite/abc"), "/signup?next=%2Finvite%2Fabc");
console.log("✓ password rules and emailed sign-in links");

const { bingDate, summariseBing, isBingKey, isBingSiteUrl } = await import("../lib/bing");
assert.equal(bingDate("/Date(1316156400000-0700)/"), 1316156400000);
assert.ok(Number.isNaN(bingDate("garbage")));
assert.ok(isBingKey("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6") && !isBingKey("short") && !isBingKey("has spaces in it and more"));
assert.ok(isBingSiteUrl("https://example.com/") && !isBingSiteUrl("javascript:alert(1)"));
{
  const now = Date.UTC(2026, 10, 13), old = now - 60 * 86400000, recent = now - 3 * 86400000;
  const d = (t: number) => `/Date(${t}-0000)/`;
  const sum = summariseBing(
    [{ Date: d(old), Clicks: 99, Impressions: 999 }, { Date: d(recent), Clicks: 10, Impressions: 200 }],
    [
      { Date: d(recent), Query: "seo audit", Clicks: 4, Impressions: 100, AvgImpressionPosition: 6 },
      { Date: d(recent), Query: "seo audit", Clicks: 2, Impressions: 300, AvgImpressionPosition: 10 },
      { Date: d(recent), Query: "ai check", Clicks: 5, Impressions: 50 },
      { Date: d(old), Query: "old query", Clicks: 50, Impressions: 500 },
    ],
    [{ Date: d(recent), Query: "https://example.com/a", Clicks: 3, Impressions: 30 }],
    now - 28 * 86400000, 28,
  );
  assert.equal(sum.clicks, 10, "rows older than the window are left out");
  assert.equal(sum.ctr, 0.05);
  assert.deepEqual(sum.queries.map((q) => q.query), ["seo audit", "ai check"], "grouped and sorted by clicks");
  assert.equal(sum.queries[0].position, 9, "position averaged by impressions: (6×100 + 10×300) / 400");
  assert.equal(sum.queries[1].position, null);
  assert.equal(sum.pages[0].page, "https://example.com/a");
}
console.log("✓ Bing data is added up over the last 28 days");

const { cleanUrls, indexNowResult, isIndexNowKey, makeIndexNowKey, keyFileUrl } = await import("../lib/indexNow");
assert.ok(isIndexNowKey(makeIndexNowKey()) && !isIndexNowKey("../etc") && !isIndexNowKey("short"));
assert.equal(keyFileUrl("https://example.com/blog/", "abc12345"), "https://example.com/abc12345.txt");
{
  const r = cleanUrls("https://example.com/", ["https://example.com/a#x", "https://example.com/a", "https://evil.example/b", "ftp://example.com/c", "not a url", "https://EXAMPLE.com/d"]);
  assert.deepEqual(r.urls, ["https://example.com/a", "https://example.com/d"]);
  assert.equal(r.rejected, 3);
  const many = cleanUrls("https://example.com/", Array.from({ length: 1005 }, (_, i) => `https://example.com/p${i}`));
  assert.equal(many.urls.length, 1000);
  assert.equal(many.rejected, 5);
}
assert.ok(indexNowResult(202).ok && indexNowResult(200).ok && !indexNowResult(403).ok && !indexNowResult(0).ok);
assert.match(indexNowResult(422).message, /same site/);
console.log("✓ IndexNow keeps URLs on the site and explains each answer");
