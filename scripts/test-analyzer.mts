// Offline tests for the analyzer and robots parser: `npm test`
import assert from "node:assert/strict";
import { analyze } from "../lib/analyze";
import { isAllowed, parseRobots } from "../lib/robots";
import { assertPublicUrl } from "../lib/safeFetch";

const res = (url: string, body: string, extra: Partial<{ status: number; headers: Record<string, string> }> = {}) => ({
  url,
  ok: (extra.status ?? 200) < 400,
  status: extra.status ?? 200,
  body,
  headers: { "content-type": "text/html", "content-encoding": "br", ...(extra.headers ?? {}) },
  redirects: [],
  ms: 300,
  bytes: body.length,
});

// ---- robots ----
const r = parseRobots(`User-agent: *\nDisallow: /private\nAllow: /private/ok$\n\nUser-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: claude-searchbot\nAllow: /\nSitemap: https://x.com/sitemap.xml`);
assert.equal(isAllowed(r, "GPTBot", "/").allowed, false);
assert.equal(isAllowed(r, "CCBot", "/blog").allowed, false);
assert.equal(isAllowed(r, "Claude-SearchBot", "/private").allowed, true);
assert.equal(isAllowed(r, "Googlebot", "/private/x").allowed, false);
assert.equal(isAllowed(r, "Googlebot", "/private/ok").allowed, true);
assert.equal(isAllowed(r, "Googlebot", "/blog").allowed, true);
assert.deepEqual(r.sitemaps, ["https://x.com/sitemap.xml"]);
console.log("✓ robots parser");

// ---- SSRF guard ----
for (const bad of ["http://127.0.0.1", "http://localhost:3000", "http://169.254.169.254/latest", "http://10.0.0.5", "ftp://x.com", "http://[::1]/", "http://example.com:8080"]) {
  await assert.rejects(assertPublicUrl(bad), `${bad} should be rejected`);
}
console.log("✓ SSRF guard");

// ---- good page ----
const good = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>How to Brew Pour-Over Coffee | Acme Coffee</title>
<meta name="description" content="A step-by-step guide to brewing pour-over coffee at home: ratios, grind size, water temperature and timing, with a printable cheat sheet.">
<link rel="canonical" href="https://acme.com/pour-over"><link rel="icon" href="/f.ico">
<meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="i"><meta property="og:site_name" content="Acme Coffee">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Acme Coffee","sameAs":["https://x.com/a","https://linkedin.com/a"]},{"@type":"Article","author":{"@type":"Person","name":"Jo"},"dateModified":"${new Date().toISOString()}"},{"@type":"FAQPage"}]}</script>
</head><body><nav><a href="/">Home</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/a">a</a><a href="/b">b</a></nav>
<main><h1>How to brew pour-over coffee</h1>
<p>Pour-over coffee takes about four minutes: use 15 grams of coffee per 250 ml of water at 94°C, grind medium-fine, bloom for 30 seconds, then pour slowly in circles.</p>
<h2>What ratio should I use?</h2><p>Start with 1:16, which is 15 g of coffee to 240 g of water. Go stronger at 1:15 or lighter at 1:17 depending on taste.</p>
<h2>How hot should the water be?</h2><p>Aim for 92–96°C. Boiling water over-extracts and tastes bitter, while water below 90°C tastes sour and flat.</p>
<h2>Why does grind size matter?</h2><p>Grind controls flow rate. Too fine chokes the filter and goes bitter; too coarse drains in under two minutes and tastes weak.</p>
<ul><li>Scale</li><li>Kettle</li></ul><table><tr><td>1:16</td></tr></table>
<p>According to <a href="https://sca.coffee/research">SCA research</a> and <a href="https://example.org/study">a 2023 study</a>, 20% extraction is ideal. ${"Good coffee is simple when you measure. ".repeat(40)}</p>
<img src="a.jpg" alt="kettle" width="10" height="10"></main></body></html>`;
const out = analyze({
  requestedUrl: "https://acme.com/pour-over",
  page: res("https://acme.com/pour-over", good, { headers: { "strict-transport-security": "max-age=1" } }),
  robots: res("https://acme.com/robots.txt", "User-agent: *\nAllow: /\nUser-agent: GPTBot\nDisallow: /\nSitemap: https://acme.com/sitemap.xml"),
  sitemap: { url: "https://acme.com/sitemap.xml", found: true, urlCount: 12, isIndex: false },
  llms: res("https://acme.com/llms.txt", "# Acme\n> coffee\n## Docs\n- [Guide](https://acme.com/pour-over): guide"),
  llmsFull: null,
});
const fails = out.checks.filter((c) => c.status === "fail");
console.log("Good page scores:", out.scores, "fails:", fails.map((c) => c.id));
assert.ok(out.scores.overall >= 80, "good page should score high");
assert.equal(out.facts.questionHeadings, 3);
assert.equal(out.checks.find((c) => c.id === "concise-answers")?.status, "pass");
assert.equal(out.checks.find((c) => c.id === "ai-search-bots")?.status, "pass");
assert.match(out.checks.find((c) => c.id === "ai-training-bots")!.detail, /GPTBot/);
assert.ok((out.facts.outline ?? []).some((h) => h.level === 1 && /pour-over/i.test(h.text)), "outline should include the H1");
assert.match(out.facts.textExcerpt ?? "", /Pour-over coffee takes about four minutes/);
console.log("✓ good page");

// ---- FAQ accordion: answers sit after <summary>, not after the heading ----
const faq = good.replace(
  /<h2>What ratio should I use\?<\/h2><p>/,
  '<details><summary><h2>What ratio should I use?</h2><span></span></summary><p>',
).replace("depending on taste.</p>", "depending on taste.</p></details>");
const out3 = analyze({
  requestedUrl: "https://acme.com/pour-over",
  page: res("https://acme.com/pour-over", faq),
  robots: null, sitemap: null, llms: null, llmsFull: null,
});
assert.equal(out3.checks.find((c) => c.id === "concise-answers")?.status, "pass", "accordion answers should count");
console.log("✓ FAQ accordion answers");

// ---- nomodule polyfills (Next.js ships one) are not render-blocking ----
const nm = good.replace("</head>", '<script src="/polyfills.js" noModule=""></script></head>');
const out4 = analyze({ requestedUrl: "https://acme.com/pour-over", page: res("https://acme.com/pour-over", nm), robots: null, sitemap: null, llms: null, llmsFull: null });
assert.equal(out4.checks.find((c) => c.id === "render-blocking")?.status, "pass", "nomodule scripts should not count as blocking");
console.log("✓ nomodule scripts ignored");

// ---- "What AI sees" text keeps words from separate elements apart ----
const spaced = good.replace("<h1>How to brew pour-over coffee</h1>", "<h1><span>Full Stack</span><span>Engineer</span> &amp; <b>.NET</b> tips</h1>");
const out5 = analyze({ requestedUrl: "https://acme.com/pour-over", page: res("https://acme.com/pour-over", spaced), robots: null, sitemap: null, llms: null, llmsFull: null });
assert.equal(out5.facts.outline?.[0].text, "Full Stack Engineer & .NET tips");
console.log("✓ AI view text spacing");

// ---- llms.txt and FAQ markup are reported, never scored ----
const audited = (html: string, llms: ReturnType<typeof res> | null) =>
  analyze({ requestedUrl: "https://acme.com/pour-over", page: res("https://acme.com/pour-over", html), robots: null, sitemap: null, llms, llmsFull: null });
const noLlms = audited(good, null);
const withLlms = audited(good, res("https://acme.com/llms.txt", "# Acme\n> c\n## Docs\n- [G](https://acme.com/g): g"));
assert.deepEqual(noLlms.scores, withLlms.scores, "llms.txt must not change any score");
assert.equal(noLlms.checks.find((c) => c.id === "llms-txt")?.status, "info");
const withFaq = audited(good.replace("</head>", '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script></head>'), null);
assert.equal(withFaq.checks.find((c) => c.id === "faq-schema")?.status, "info");
assert.match(withFaq.checks.find((c) => c.id === "schema-valid")!.detail, /no longer shows rich results for FAQPage/);
console.log("✓ llms.txt and FAQ markup not scored");

// ---- structured data quality ----
const withLd = (ld: string) => audited(good.replace("</head>", `<script type="application/ld+json">${ld}</script></head>`), null).checks.find((c) => c.id === "schema-valid")!;
assert.equal(withLd('{"@context":"https://schema.org","@type":"Product","name":"[Product Name]"}').status, "warn");
assert.match(withLd('{"@context":"https://schema.org","@type":"Product","name":"[Product Name]"}').detail, /missing offers, review or aggregateRating.*Template text/);
assert.ok(withLd('{"@context":"https://schema.org","@type":"Product","name":"x"}').fix, "problems should come with a fix");
assert.equal(audited(good.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ""), null).checks.find((c) => c.id === "schema-valid"), undefined, "no check without JSON-LD");
console.log("✓ structured data quality");

// ---- bad page: JS shell, noindex, AI search bots blocked ----
const bad = `<html><head><meta name="robots" content="noindex"><script src="/a.js"></script><script src="/b.js"></script><script src="/c.js"></script></head><body><div id="root"></div><script src="/d.js"></script></body></html>`;
const out2 = analyze({
  requestedUrl: "http://bad.com/",
  page: res("http://bad.com/", bad, { headers: { "content-encoding": "" } }),
  robots: res("http://bad.com/robots.txt", "User-agent: OAI-SearchBot\nDisallow: /\nUser-agent: PerplexityBot\nDisallow: /\nUser-agent: Claude-SearchBot\nDisallow: /"),
  sitemap: { url: "http://bad.com/sitemap.xml", found: false, urlCount: 0, isIndex: false },
  llms: null,
  llmsFull: null,
});
console.log("Bad page scores:", out2.scores);
assert.ok(out2.scores.overall < 35, "bad page should score low");
for (const id of ["indexable", "https", "server-rendered", "ai-search-bots", "title", "h1"])
  assert.equal(out2.checks.find((c) => c.id === id)?.status, "fail", id);
console.log("✓ bad page");
console.log(`\nAll tests passed. ${out.checks.length} checks per audit.`);
