// Tests for JSON-LD validation: `npm test`
import assert from "node:assert/strict";
import { jsonLdBlocks, reviewSchema, schemaImageUrls } from "../lib/schemaValidate";

const URL_ = "https://acme.com/p";
const ctx = { "@context": "https://schema.org" };

// A complete, valid page raises nothing
const clean = reviewSchema([{ ...ctx, "@graph": [
  { "@type": "Organization", name: "Acme", url: "https://acme.com", logo: "https://acme.com/l.png" },
  { "@type": "Product", name: "Mug", image: "https://acme.com/m.png", offers: { "@type": "Offer", price: "9.50", priceCurrency: "USD" } },
  { "@type": "BreadcrumbList", itemListElement: [{ position: 1, name: "Home", item: "https://acme.com/" }, { position: 2, name: "Mug" }] },
] }], URL_);
assert.deepEqual(clean.issues, []);
assert.deepEqual(clean.retired, []);
assert.equal(clean.checked, 3);

// Nested objects aren't held to top-level rules: a bare author Person or a http context is fine
assert.deepEqual(reviewSchema([{ "@context": "http://schema.org", "@type": "Article", headline: "h", author: { "@type": "Person", name: "A" } }], URL_).issues, []);

// Required properties
const gaps = (o: object) => reviewSchema([{ ...ctx, ...o }], URL_).issues.join(" ");
assert.match(gaps({ "@type": "Product", name: "Mug" }), /offers, review or aggregateRating/);
assert.match(gaps({ "@type": "Product", name: "Mug", offers: { "@type": "Offer" } }), /offers\.price/);
assert.match(gaps({ "@type": "Product", name: "M", aggregateRating: { ratingValue: 4 } }), /aggregateRating\.ratingCount or reviewCount/);
assert.match(gaps({ "@type": "MusicEvent", name: "Gig" }), /startDate, location/);
assert.match(gaps({ "@type": "JobPosting", title: "Dev", description: "d", datePosted: "2026-01-01", hiringOrganization: {} }), /jobLocation/);
assert.equal(gaps({ "@type": "JobPosting", title: "Dev", description: "d", datePosted: "2026-01-01", hiringOrganization: "A", jobLocationType: "TELECOMMUTE" }), "");
assert.match(gaps({ "@type": "BreadcrumbList", itemListElement: [{ position: 1, name: "Home" }, { position: 2, name: "x" }] }), /item on item 1/);
assert.equal(gaps({ "@type": "BreadcrumbList", itemListElement: [{ position: 1, item: { "@id": "https://a.co", name: "Home" } }] }), "");
assert.match(gaps({ "@type": "VideoObject", name: "V" }), /thumbnailUrl, uploadDate/);
console.log("✓ schema required properties");

// @context, template text, relative URLs
assert.match(reviewSchema([{ "@type": "Organization", name: "A" }], URL_).issues[0], /no schema\.org @context/);
assert.match(gaps({ "@type": "Organization", name: "[Business Name]" }), /Template text left in: "\[Business Name\]"/);
assert.match(gaps({ "@type": "Organization", name: "A", telephone: "555-555-5555" }), /Template text/);
assert.match(gaps({ "@type": "WebPage", name: "{{ page.title }}" }), /Template text/);
assert.match(gaps({ "@type": "Organization", name: "A", url: "https://example.com/" }), /Template text/);
assert.match(gaps({ "@type": "Organization", name: "A", logo: "/logo.png" }), /Relative URLs.*\/logo\.png/);
// Not flagged: fragment ids, long prose, a real sentence with brackets, and example.com auditing itself
assert.equal(gaps({ "@type": "Organization", "@id": "#org", name: "Your Move Removals" }), "");
assert.equal(gaps({ "@type": "Article", headline: "H", articleBody: "lorem ipsum in a post about placeholder text" }), "");
assert.equal(gaps({ "@type": "Article", headline: "What [insert] means for writers" }), "");
assert.deepEqual(reviewSchema([{ ...ctx, "@type": "WebSite", url: "https://example.com/" }], "https://example.com/").issues, []);
console.log("✓ schema template text and URLs");

// Retired types are noted, not treated as errors
const old = reviewSchema([{ ...ctx, "@type": "FAQPage", mainEntity: [] }, { ...ctx, "@type": "HowTo", name: "x" }], URL_);
assert.deepEqual(old.retired, ["FAQPage", "HowTo"]);
assert.deepEqual(old.issues, []);
assert.deepEqual(reviewSchema([{ ...ctx, "@type": "QAPage", mainEntity: {} }], URL_).retired, []);
console.log("✓ schema retired types");

// Image discovery
const blocks = jsonLdBlocks(`<script type="application/ld+json">{"@type":"Organization","logo":{"@type":"ImageObject","url":"/l.png"},"image":["https://acme.com/a.png","data:image/png;base64,AA"],"founder":{"image":"https://cdn.acme.com/f.jpg"}}</script><script type="application/ld+json">{broken</script>`);
assert.deepEqual(schemaImageUrls(blocks, URL_), ["https://acme.com/l.png", "https://acme.com/a.png", "https://cdn.acme.com/f.jpg"]);
assert.equal(schemaImageUrls([{ image: ["1", "2", "3", "4", "5", "6"].map((n) => `https://a.co/${n}.png`) }], URL_).length, 4);
console.log("✓ schema image discovery");
