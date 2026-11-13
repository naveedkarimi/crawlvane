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

assert.equal(sign("whsec_test", '{"a":1}'), "sha256=" + (await import("node:crypto")).createHmac("sha256", "whsec_test").update('{"a":1}').digest("hex"));
console.log("✓ webhook requests are signed");

// ---------- Security: sign-in redirects stay on this site ----------
const { safeNextPath } = await import("../lib/safeNext");
for (const bad of ["//evil.example", "/\\evil.example", "/\\/evil.example", "https://evil.example", "javascript:alert(1)", "/%0d%0aSet-Cookie:x", "/dash\u0000board", "", null]) {
  const out = safeNextPath(bad as string | null);
  assert.ok(out === "/dashboard" || out.startsWith("/%0d"), `rejected ${JSON.stringify(bad)} → ${out}`);
}
assert.equal(safeNextPath("/dashboard?tab=plan&buy=pro"), "/dashboard?tab=plan&buy=pro");
assert.equal(safeNextPath("/invite/abc#x"), "/invite/abc#x");
console.log("✓ sign-in redirects can't leave the site");
