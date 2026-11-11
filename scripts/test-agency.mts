// Tests the app/landing address split, agency branding, pricing and sentiment: `npm test`
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SITE_URL = "https://crawlvane.com";
process.env.NEXT_PUBLIC_APP_URL = "https://app.crawlvane.com";
process.env.CUSTOM_REPORT_DOMAINS = "1";

const hosts = await import("../lib/hosts");
assert.equal(hosts.appUrl("/dashboard"), "https://app.crawlvane.com/dashboard");
assert.equal(hosts.siteLink("/tools"), "https://crawlvane.com/tools");
assert.equal(hosts.hostKind("app.crawlvane.com"), "app");
assert.equal(hosts.hostKind("crawlvane.com"), "main");
assert.equal(hosts.hostKind("www.crawlvane.com:443"), "main");
assert.equal(hosts.hostKind("reports.agency.com"), "custom");
assert.equal(hosts.hostKind("localhost:3000"), "other");
assert.ok(hosts.isAppPath("/dashboard") && hosts.isAppPath("/invite/abc") && !hosts.isAppPath("/dashboards-guide"));
console.log("✓ tells the landing, app and agency addresses apart");

const { NextRequest } = await import("next/server");
const { proxy } = await import("../proxy");
const go = (url: string) => {
  const u = new URL(url);
  const res = proxy(new NextRequest(url, { headers: { host: u.host } }));
  return { status: res.status, to: res.headers.get("location") };
};
assert.deepEqual(go("https://crawlvane.com/dashboard?tab=plan"), { status: 307, to: "https://app.crawlvane.com/dashboard?tab=plan" });
assert.deepEqual(go("https://crawlvane.com/login"), { status: 307, to: "https://app.crawlvane.com/login" });
assert.equal(go("https://crawlvane.com/tools").to, null);
assert.equal(go("https://crawlvane.com/api/audit").to, null);
assert.deepEqual(go("https://app.crawlvane.com/"), { status: 307, to: "https://app.crawlvane.com/dashboard" });
assert.deepEqual(go("https://app.crawlvane.com/pricing"), { status: 307, to: "https://crawlvane.com/pricing" });
assert.equal(go("https://app.crawlvane.com/dashboard").to, null);
assert.equal(go("https://app.crawlvane.com/report/abc123").to, null);
assert.equal(go("https://app.crawlvane.com/api/me").to, null);
assert.match(go("https://crawlvane.com/?code=xyz").to ?? "", /^https:\/\/app\.crawlvane\.com\/auth\/callback\?code=xyz&next=%2Fdashboard$/);
assert.equal(go("https://reports.agency.com/report/abc123").to, null);
assert.equal(go("https://reports.agency.com/report/abc123").status, 200);
assert.equal(go("https://reports.agency.com/pricing").status, 404);
console.log("✓ proxy sends app pages to the app address and landing pages back");

const { normalizeDomain, whiteLabelFrom } = await import("../lib/branding");
assert.equal(normalizeDomain(" HTTPS://Reports.Agency.com/x "), "reports.agency.com");
process.env.FEATURE_WHITE_LABEL = "1";
const brand = { name: "Acme Agency", logoUrl: "https://acme.test/logo.png", color: "#112233", domain: null, domainVerified: false };
assert.deepEqual(whiteLabelFrom({ plan: "agency" }, brand), { name: "Acme Agency", logoUrl: "https://acme.test/logo.png", color: "#112233" });
assert.equal(whiteLabelFrom({ plan: "agency" }, { ...brand, name: null }), undefined);
console.log("✓ team branding becomes report white-label options");

process.env.PRICE_PRO_LABEL = "$39";
process.env.PRICE_AGENCY_LABEL = "$99";
const { paidPlans } = await import("../lib/plans");
const { PLAN_LIMITS } = await import("../lib/entitlements");
const plans = paidPlans(PLAN_LIMITS, hosts.appUrl);
assert.deepEqual(plans.map((p) => [p.name, p.price]), [["Free", "$0"], ["Pro", "$39"], ["Agency", "$99"]]);
assert.ok(plans[1].features.includes(`${PLAN_LIMITS.pro.sites} websites`));
assert.match(plans[2].cta.href, /^https:\/\/app\.crawlvane\.com\/login\?next=%2Fdashboard%3Ftab%3Dplan%26buy%3Dagency$/);
console.log("✓ pricing shows the enforced limits and the prices you set");

const { tallySentiment } = await import("../lib/ai/visibility");
const row = (mentioned: boolean, sentiment?: "positive" | "neutral" | "negative") => ({ engine: "Claude", prompt: "q", mentioned, cited: false, citedUrls: [], competitorsMentioned: [], answerExcerpt: "x", sentiment });
assert.equal(tallySentiment([row(false), row(true)]), null);
assert.deepEqual(tallySentiment([row(true, "positive"), row(true, "negative"), row(true, "positive"), row(false, "negative")]), { positive: 2, neutral: 0, negative: 1 });
const { visibilityAlert } = await import("../lib/visibilityTracking");
const run = (neg: number) => ({ at: "", shareOfVoice: [], summary: [{ engine: "Claude", mentionRate: 50, citationRate: 0, answered: 8 }], sentiment: { positive: 1, neutral: 0, negative: neg } });
assert.equal(visibilityAlert(run(1), run(1)), null);
assert.match(visibilityAlert(run(0), run(2)) ?? "", /describe you negatively: 2 this time, 0 last time/);
console.log("✓ counts how AI answers describe the brand and alerts on more negative ones");
