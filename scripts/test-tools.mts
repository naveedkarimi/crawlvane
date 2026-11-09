// Tests for the free tools' pure logic: `npm test`
import assert from "node:assert/strict";
import { buildRobotsTxt, DEFAULT_ROBOTS } from "../lib/gen/robots";
import { isAllowed, parseRobots } from "../lib/robots";
import { buildLlmsTxt, validateLlmsTxt } from "../lib/gen/llms";
import { buildSchema, schemaWarnings } from "../lib/gen/schema";

// ---- robots.txt generator ----
{
  const txt = buildRobotsTxt({ ...DEFAULT_ROBOTS, training: "block", disallow: ["admin/", "/cart/", ""], sitemap: "https://x.example/sitemap.xml" });
  const r = parseRobots(txt);
  assert.equal(isAllowed(r, "Googlebot", "/").allowed, true);
  assert.equal(isAllowed(r, "Googlebot", "/admin/x").allowed, false);
  assert.equal(isAllowed(r, "OAI-SearchBot", "/blog/").allowed, true);
  // Named groups ignore "*", so the shared paths must be repeated there.
  assert.equal(isAllowed(r, "OAI-SearchBot", "/cart/").allowed, false);
  assert.equal(isAllowed(r, "GPTBot", "/").allowed, false);
  assert.equal(isAllowed(r, "Google-Extended", "/").allowed, false);
  assert.equal(isAllowed(r, "ChatGPT-User", "/").allowed, true);
  assert.deepEqual(r.sitemaps, ["https://x.example/sitemap.xml"]);
  const blockSearch = parseRobots(buildRobotsTxt({ ...DEFAULT_ROBOTS, aiSearch: "block" }));
  assert.equal(isAllowed(blockSearch, "PerplexityBot", "/").allowed, false);
  assert.equal(isAllowed(blockSearch, "Bingbot", "/").allowed, true);
  console.log("✓ robots.txt generator");
}

// ---- llms.txt builder and validator ----
{
  const txt = buildLlmsTxt({
    name: "Acme",
    summary: "Coffee roaster in Leeds.",
    homeUrl: "https://acme.example/",
    pages: [
      { url: "https://acme.example/", title: "Acme", description: "Coffee roaster in Leeds." },
      { url: "https://acme.example/shop/beans", title: "Beans [new]", description: "Single-origin beans" },
      { url: "https://acme.example/shop/kit", title: "Kit", description: "Coffee roaster in Leeds." },
    ],
  });
  assert.match(txt, /^# Acme\n\n> Coffee roaster in Leeds\.\n/);
  assert.match(txt, /## Shop/);
  assert.match(txt, /- \[Beans new\]\(https:\/\/acme\.example\/shop\/beans\): Single-origin beans/);
  assert.match(txt, /- \[Kit\]\(https:\/\/acme\.example\/shop\/kit\)\n/, "duplicate homepage description is dropped");
  assert.ok(validateLlmsTxt(txt, "https://acme.example").every((c) => c.status === "pass"));

  const bad = validateLlmsTxt("<!DOCTYPE html><html>404</html>");
  assert.equal(bad[0].status, "fail");
  const messy = validateLlmsTxt("Acme\n- [About](/about)");
  assert.ok(messy.some((c) => c.title === "Missing the H1 name" && c.status === "fail"));
  assert.ok(messy.some((c) => c.title === "Relative links"));
  assert.ok(messy.some((c) => c.title === "No summary line"));
  console.log("✓ llms.txt builder and validator");
}

// ---- schema generator ----
{
  const org = buildSchema("Organization", { name: " Acme ", url: "https://acme.example", sameAs: "https://x.com/acme\n\n" });
  assert.deepEqual(org, { "@context": "https://schema.org", "@type": "Organization", name: "Acme", url: "https://acme.example", sameAs: ["https://x.com/acme"] });

  const lb = buildSchema("LocalBusiness", { type: "Dentist", name: "Smile", addressLocality: "Leeds" }) as Record<string, any>;
  assert.equal(lb["@type"], "Dentist");
  assert.deepEqual(lb.address, { "@type": "PostalAddress", addressLocality: "Leeds" });
  assert.equal(lb.openingHours, undefined);

  const person = buildSchema("Person", { name: "Ann" }) as Record<string, unknown>;
  assert.equal(person.worksFor, undefined, "empty nested objects are dropped");

  const faq = buildSchema("FAQPage", {}, [{ q: "Q1?", a: "A1." }, { q: "", a: "orphan" }]) as Record<string, any>;
  assert.equal(faq.mainEntity.length, 1);
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "A1.");

  const product = buildSchema("Product", { name: "Mug", price: "12.5", priceCurrency: "gbp" }) as Record<string, any>;
  assert.equal(product.offers.priceCurrency, "GBP");
  assert.equal(product.offers.availability, "https://schema.org/InStock");
  assert.equal(product.aggregateRating, undefined);

  assert.ok(schemaWarnings("Organization", {}).some((w) => /business name/.test(w)));
  assert.ok(schemaWarnings("Organization", { name: "A", url: "acme.com" }).some((w) => /https/.test(w)));
  assert.ok(schemaWarnings("Product", { name: "Mug", price: "$12" }).some((w) => /number/.test(w)));
  console.log("✓ schema generator");
}

// ---- page tools (link preview, answers, markdown, agent readiness) ----
import { agentReadiness, answerReadiness, linkPreview, pageToMarkdown } from "../lib/gen/pageTools";
{
  const page = `<!doctype html><html lang="en"><head><title>Acme Coffee | Fresh beans</title>
  <meta name="description" content="Small-batch coffee roasted in Leeds and shipped across the UK.">
  <meta property="og:title" content="Acme Coffee"><meta property="og:image" content="/og.png">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme"}</script></head>
  <body><header><nav><a href="/">Home</a><a href="/x"><svg></svg></a></nav></header>
  <main><h1>Acme Coffee</h1><p>We roast small batches of coffee every week in Leeds and ship fresh beans across the UK to homes and cafes.</p>
  <h2>How much does delivery cost?</h2><p>Delivery is free on orders over £40. Smaller orders cost £3.95 and arrive in two working days.</p>
  <h2>Our story</h2><p>Started in 2019 by two friends.</p>
  <details><summary><h3>Do you ship abroad?</h3></summary><p>Not yet, but we plan to ship to Ireland and France in 2027.</p></details>
  <ul><li>Single origin</li><li>Blends <ul><li>House</li></ul></li></ul>
  <table><tr><th>Bag</th><th>Price</th></tr><tr><td>250g</td><td>£9</td></tr></table>
  <form><input id="e" type="email"><label for="e">Email</label><input type="text" placeholder="Name"><button aria-label="Subscribe"></button><button></button></form>
  </main><footer><a href="mailto:hi@acme.example">hi@acme.example</a></footer></body></html>`;
  const url = "https://acme.example/";

  const lp = linkPreview(page, url);
  assert.equal(lp.image, "https://acme.example/og.png");
  assert.equal(lp.title, "Acme Coffee");
  assert.ok(lp.checks.find((c) => c.title === "Open Graph title and description")?.status === "warn", "og:description missing");
  assert.ok(lp.checks.find((c) => c.title === "Share image")?.status === "pass");
  assert.ok(lp.checks.find((c) => c.title === "X (Twitter) card")?.status === "warn");

  const a = answerReadiness(page);
  assert.equal(a.questions.length, 2);
  assert.equal(a.questions[0].verdict, "good");
  assert.equal(a.questions[1].heading, "Do you ship abroad?");
  assert.equal(a.questions[1].verdict, "good", "accordion answer found");
  assert.deepEqual(a.otherHeadings, ["Our story"]);
  assert.equal(a.tables, 1);

  const md = pageToMarkdown(page, url);
  assert.equal(md.source, "main");
  assert.match(md.markdown, /^# Acme Coffee \| Fresh beans\n\nSource: https:\/\/acme\.example\/\n/);
  assert.match(md.markdown, /\n## How much does delivery cost\?\n/);
  assert.match(md.markdown, /- Blends\n  - House/);
  assert.match(md.markdown, /\| Bag \| Price \|\n\| --- \| --- \|\n\| 250g \| £9 \|/);
  assert.doesNotMatch(md.markdown, /Subscribe|Home/, "forms and nav removed");

  const ag = agentReadiness(page);
  const get = (t: string) => ag.checks.find((c) => c.title === t)?.status;
  assert.equal(get("Page landmarks"), "pass");
  assert.equal(get("Form labels"), "fail", "placeholder-only field");
  assert.equal(get("Button names"), "warn");
  assert.equal(get("Link text"), "warn", "icon-only link");
  assert.equal(get("Contact details as text"), "pass");
  assert.equal(get("Prices as text"), "pass");
  assert.equal(get("Structured data about you"), "pass");
  assert.ok(ag.score > 0 && ag.score < 100);
  console.log("✓ link preview, answer readiness, Markdown and agent readiness");
}

// ---- site tools: sitemap, headers, redirects ----
{
  const { parseSitemapXml, sitemapChecks, analyzeHeaders, redirectChecks } = await import("../lib/gen/siteTools");
  const xml = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://acme.example/</loc><lastmod>2026-10-01</lastmod></url>
    <url><loc><![CDATA[https://acme.example/a?x=1&amp;y=2]]></loc><lastmod>01/10/2026</lastmod></url>
    <url><loc>http://acme.example/b</loc></url>
    <url><loc>https://other.example/c</loc></url>
    <url><loc>https://acme.example/</loc></url>
  </urlset>`;
  const p = parseSitemapXml(xml);
  assert.equal(p.kind, "urlset");
  assert.equal(p.entries.length, 5);
  assert.equal(p.entries[1].loc, "https://acme.example/a?x=1&y=2");
  const cs = sitemapChecks("https://acme.example", p.entries, { bytes: xml.length, inRobots: false });
  const by = (t: string) => cs.find((c) => c.title === t)?.status;
  assert.equal(by("Listed in robots.txt"), "warn");
  assert.equal(by("URLs on another site"), "fail");
  assert.equal(by("http:// URLs"), "warn");
  assert.equal(by("Duplicate URLs"), "warn");
  assert.equal(by("lastmod dates"), "warn", "non-W3C date");
  assert.equal(parseSitemapXml("<sitemapindex><sitemap><loc>https://a.example/s1.xml</loc></sitemap></sitemapindex>").kind, "sitemapindex");
  assert.equal(parseSitemapXml("<html></html>").kind, "invalid");
  const same = Array.from({ length: 8 }, (_, i) => ({ loc: `https://acme.example/${i}`, lastmod: "2026-11-01T00:00:00Z" }));
  assert.match(sitemapChecks("https://acme.example", same, { bytes: 1, inRobots: true }).find((c) => c.title === "lastmod dates")!.detail, /same date/);

  const weak = analyzeHeaders({ server: "Apache/2.4.41 (Ubuntu)", "x-powered-by": "PHP/8.1.2", "x-robots-tag": "noindex" }, "https://acme.example/");
  const w = (t: string) => weak.checks.find((c) => c.title === t)?.status;
  assert.equal(w("Strict-Transport-Security"), "warn");
  assert.equal(w("Software versions"), "warn");
  assert.equal(w("X-Robots-Tag"), "fail");
  const strong = analyzeHeaders({
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "content-security-policy": "default-src 'self'; frame-ancestors 'self'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=()",
    server: "cloudflare",
  }, "https://acme.example/");
  assert.equal(strong.score, 100);
  assert.ok(strong.score > weak.score);

  const hop = (url: string, status: number) => ({ url, status, ms: 5 });
  const t = (start: string, hops: ReturnType<typeof hop>[], final: string, finalStatus = 200) => ({ start, hops, final, finalStatus, loop: false });
  const main = t("https://acme.example/old", [hop("https://acme.example/old", 302), hop("https://acme.example/mid", 301), hop("https://acme.example/new", 200)], "https://acme.example/new");
  const variants = [
    t("http://acme.example/old", [hop("http://acme.example/old", 200)], "http://acme.example/old"),
    t("https://www.acme.example/old", [hop("https://www.acme.example/old", 200)], "https://www.acme.example/old"),
  ];
  const rc = redirectChecks(main, variants, "https://acme.example/new/", null);
  const r = (x: string) => rc.find((c) => c.title === x)?.status;
  assert.equal(r("Redirect chain"), "warn");
  assert.equal(r("Temporary redirects"), "warn");
  assert.equal(r("Canonical"), "pass", "trailing slash is the same page");
  assert.equal(r("HTTP to HTTPS"), "fail");
  assert.equal(r("www and non-www"), "warn");
  console.log("✓ sitemap, security headers and redirect checks");
}

// ---- GA4 AI regex ----
{
  const { buildAiRegex, matchesAi, AI_SOURCES } = await import("../lib/gen/aiReferrers");
  const re = buildAiRegex(AI_SOURCES.filter((s) => s.default).flatMap((s) => s.hosts));
  assert.ok(matchesAi(re, "https://chatgpt.com/"));
  assert.ok(matchesAi(re, "chatgpt.com"));
  assert.ok(matchesAi(re, "www.perplexity.ai"));
  assert.ok(!matchesAi(re, "notchatgpt.com"));
  assert.ok(!matchesAi(re, "google.com"));
  assert.ok(!matchesAi(re, "chatgpt.com.evil.example"));
  assert.equal(buildAiRegex([]), "");
  console.log("✓ GA4 AI traffic regex");
}

// ---- agent and share-image checks folded into the main audit ----
{
  const { extraChecks } = await import("../lib/audit");
  const html = `<html lang="en"><head><meta property="og:image" content="http://x.example/a.png"></head><body><main><h1>Hi</h1><form><input type="email" placeholder="Email"><button></button></form><a href="/x"></a></main></body></html>`;
  const cs = extraChecks(html, "https://x.example/");
  const by = (id: string) => cs.find((c) => c.id === id);
  assert.equal(by("agent-form-labels")?.status, "fail");
  assert.equal(by("agent-button-names")?.status, "warn");
  assert.equal(by("agent-link-text")?.status, "warn");
  assert.equal(by("share-image")?.status, "warn");
  assert.ok(cs.every((c) => c.category && c.group && c.weight));
  console.log("✓ extra audit checks");
}

// ---- hreflang and local business checks ----
{
  const { analyze } = await import("../lib/analyze");
  const page = (html: string, url = "https://acme.example/en/") => ({ url, ok: true, status: 200, body: html, headers: { "content-type": "text/html" }, redirects: [], ms: 100, bytes: html.length });
  const run = (html: string) => analyze({ requestedUrl: "https://acme.example/en/", page: page(html), robots: null, sitemap: null, llms: null, llmsFull: null }).checks;
  const good = run(`<html lang="en"><head><link rel="alternate" hreflang="en" href="https://acme.example/en/"><link rel="alternate" hreflang="de-DE" href="https://acme.example/de/"><link rel="alternate" hreflang="x-default" href="https://acme.example/"></head><body></body></html>`);
  assert.equal(good.find((c) => c.id === "hreflang")?.status, "pass");
  const bad = run(`<html><head><link rel="alternate" hreflang="en-UK" href="/uk/"><link rel="alternate" hreflang="de" href="https://acme.example/de/"></head><body></body></html>`);
  const h = bad.find((c) => c.id === "hreflang")!;
  assert.equal(h.status, "fail");
  assert.match(h.detail, /en-UK/);
  assert.match(h.detail, /doesn't list itself/);
  assert.ok(!run("<html><body>Hi</body></html>").some((c) => c.id === "hreflang"), "no check without hreflang");

  const ld = (o: object) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
  const full = { "@context": "https://schema.org", "@type": "Dentist", name: "Smile", telephone: "+44 113 496 0000", address: { "@type": "PostalAddress", streetAddress: "1 Main St", addressLocality: "Leeds" }, openingHours: "Mo-Fr 09:00-17:00" };
  assert.equal(run(`<html><head>${ld(full)}</head><body>Call 0113 496 0000</body></html>`).find((c) => c.id === "local-business")?.status, "pass");
  assert.equal(run(`<html><head>${ld(full)}</head><body>No phone here</body></html>`).find((c) => c.id === "local-business")?.status, "warn");
  assert.match(run(`<html><head>${ld({ "@type": "Restaurant", name: "X" })}</head><body></body></html>`).find((c) => c.id === "local-business")!.detail, /telephone/);
  console.log("✓ hreflang and local business checks");
}

// ---- server log analysis ----
{
  const { analyzeLogs, parseLogLine } = await import("../lib/gen/logs");
  const log = [
    `20.171.207.2 - - [06/Nov/2026:10:02:10 +0000] "GET /blog/a HTTP/1.1" 200 9120 "-" "Mozilla/5.0; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot"`,
    `20.171.207.2 - - [06/Nov/2026:10:02:11 +0000] "GET /app.js HTTP/1.1" 200 100 "-" "Mozilla/5.0; compatible; OAI-SearchBot/1.0"`,
    `1.2.3.4 - - [06/Nov/2026:10:05:00 +0000] "GET / HTTP/1.1" 403 512 "-" "Mozilla/5.0 (compatible; PerplexityBot/1.0)"`,
    `1.2.3.5 - - [06/Nov/2026:10:05:00 +0000] "GET / HTTP/1.1" 200 512 "-" "Mozilla/5.0 (compatible; Claude-SearchBot/1.0)"`,
    `81.2.69.1 - - [06/Nov/2026:10:07:30 +0000] "GET /pricing HTTP/2" 200 5120 "https://chatgpt.com/" "Mozilla/5.0 Safari"`,
    `{"ClientRequestURI":"/docs","ClientRequestUserAgent":"ClaudeBot/1.0","EdgeResponseStatus":200,"ClientIP":"3.3.3.3"}`,
    `garbage line`,
  ].join("\n");
  const r = analyzeLogs(log);
  assert.equal(r.parsed, 6);
  const b = (n: string) => r.bots.find((x) => x.bot === n);
  assert.equal(b("OAI-SearchBot")?.hits, 2);
  assert.equal(b("OAI-SearchBot")?.pages, 1, "assets don't count as pages");
  assert.equal(b("PerplexityBot")?.blocked, 1);
  assert.ok(b("Claude-SearchBot") && b("ClaudeBot"), "longest token wins");
  assert.equal(r.referrals[0].source, "ChatGPT");
  assert.equal(parseLogLine(`x`), null);
  console.log("✓ server log analysis");
}

// ---- accessibility (WCAG) checks ----
{
  const { a11yReport } = await import("../lib/gen/a11y");
  const bad = a11yReport(`<html><head><meta name="viewport" content="width=device-width, user-scalable=no"></head><body>
    <img src="/a.png"><img src="/b.png" alt="IMG_2041.jpg"><h1></h1><h3>Skip</h3>
    <input type="email" placeholder="Email"><button><svg></svg></button><a href="/x"></a>
    <iframe src="https://maps.example"></iframe><div aria-hidden="true"><a href="/y">Hidden</a></div>
    <span tabindex="3">x</span><video autoplay src="v.mp4"></video><table><tr><td>a</td></tr><tr><td>b</td></tr></table></body></html>`);
  const s = (t: string) => bad.checks.find((c) => c.title === t)?.status;
  for (const t of ["Page language", "Page title", "Zoom allowed", "Image text alternatives", "Form labels", "Button names", "Link names", "Headings", "Main landmark and skip link", "Frame titles", "ARIA and keyboard order", "Media"]) assert.equal(s(t), "fail", t);
  assert.equal(s("Table headers"), "warn");
  assert.ok(bad.score < 20);
  const good = a11yReport(`<html lang="en"><head><title>Acme</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>
    <a href="#main">Skip to content</a><main id="main"><h1>Acme</h1><h2>About</h2><img src="a.png" alt="Our shop in Leeds"><img src="d.png" alt="">
    <label for="e">Email</label><input id="e" type="email"><button aria-label="Open menu"><svg></svg></button><a href="/x">Pricing</a>
    <iframe title="Map of our shop" src="https://maps.example"></iframe><table><tr><th>A</th></tr><tr><td>1</td></tr></table></main></body></html>`);
  assert.ok(good.checks.every((c) => c.status === "pass" || c.status === "info"), JSON.stringify(good.checks.filter((c) => c.status !== "pass")));
  assert.equal(good.score, 100);
  const { extraChecks } = await import("../lib/audit");
  assert.equal(extraChecks(`<html><head><meta name="viewport" content="maximum-scale=1"></head><body></body></html>`, "https://x.example/").find((c) => c.id === "a11y-zoom")?.status, "fail");
  console.log("✓ accessibility (WCAG) checks");
}
