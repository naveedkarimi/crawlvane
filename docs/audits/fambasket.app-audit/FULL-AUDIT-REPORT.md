# FamBasket Full Website SEO Audit

**Target:** https://fambasket.app/  
**Audit date:** 2026-08-24  
**Scope:** Homepage, robots.txt, sitemap.xml, rendered DOM, desktop/mobile screenshots, security headers, and available configuration signals.

## Executive Summary

**SEO Health Score: 78/100**  
**Business type:** SaaS / consumer household shopping application

FamBasket has a strong single-page launch experience: specific positioning, clear navigation, useful product copy, good image alt text, responsive visuals, and coherent Organization/WebSite/SoftwareApplication/FAQPage JSON-LD. The most important risk is infrastructure, not copy: the canonical apex intermittently returned LiteSpeed `403 Forbidden` to the prescribed crawler and direct requests, while a browser-compatible session could receive the application. A crawler must reliably receive the same 200 HTML as a user.

### Top Findings

1. **High:** Stabilize `https://fambasket.app/` and crawler access; robots permissions are ineffective if the origin returns 403.
2. **High:** Correct the `SoftwareApplication` schema screenshot URL mismatch (`.png` reference versus rendered `.webp` asset).
3. **Medium:** Expand the sitemap if legal/product pages are intended to be indexed; currently only the homepage is listed.
4. **Medium:** Measure actual LCP, INP, and CLS; Google field/lab credentials were unavailable for this run.
5. **Low:** Fix the rendered H2 typo `stuffyou`.

## Technical SEO

`robots.txt` is available, allows `/`, names major search and AI crawlers, and declares the sitemap. HTTPS redirects and security headers are present. However, origin responses were inconsistent: the audit renderer received 403, while Playwright with a normal browser identity received 200 application HTML through the `www` redirect path. This is a High priority deployment/hosting issue.

The sitemap is valid XML and lists one URL with a current `lastmod`. It is suitable only if the site intentionally exposes one indexable page. The non-standard `Host` line in robots.txt can be removed.

## Content Quality

The homepage explains what FamBasket is, who it serves, how claiming and synchronization work, pricing, privacy, accessibility, and availability. The founder/about section provides a useful first-party trust signal. The main improvement is to support strong claims with documentation or attributable evidence and build a small set of intent-focused supporting pages as the product grows.

## On-Page SEO

The title is specific and includes the product category. The meta description is descriptive and includes differentiators. The page has one H1 and a logical H2 structure with 34 links, including section navigation, app CTAs, legal pages, contact, and social profiles. One H2 contains the minor text join `stuffyou`.

## Schema and Structured Data

Two JSON-LD blocks were observed. The first graph contains Organization, WebSite, and SoftwareApplication with offers. The second contains FAQPage with eight visible questions and answers. Entity relationships and visible parity are strong. The SoftwareApplication graph references `hero-light.png`, while the rendered page uses `hero-light.webp`; correct or validate that URL before relying on it.

## Performance and Visuals

Desktop and mobile screenshots rendered successfully. The desktop first viewport presents the value proposition, CTA buttons, trust points, and product UI. The mobile layout stacks content cleanly and collapses navigation. Sixteen images have descriptive alt text; intrinsic dimensions are present and most below-fold images are lazy-loaded. No CWV values are reported because Google credentials were not configured and the prescribed crawler renderer was blocked.

## Images

Image SEO is generally strong. Product screenshots communicate the product and have descriptive alt text. The hero assets are high resolution, so responsive delivery and compression should be verified with Lighthouse. Ensure light/dark variants do not both download and align schema image URLs with real assets.

## AI Search Readiness

The page is highly extractable: direct definitions, short feature descriptions, pricing answers, and FAQ content are suitable for passage-level citation. JSON-LD supports entity interpretation. The access inconsistency is the main blocker for AI search retrieval and must be fixed alongside conventional crawler parity.

## Limitations

- Crawl was limited to accessible public endpoints because the canonical origin intermittently returned 403.
- Google APIs were unavailable: no PageSpeed Insights, CrUX, Search Console, or GA4 credentials were configured.
- Moz and Bing Webmaster credentials were unavailable; no backlink metrics were included.
- No prior drift baseline existed.

## Artifacts

- [Action plan](ACTION-PLAN.md)
- [Structured audit data](audit-data.json)
- [Technical findings](findings/technical.md)
- [Content findings](findings/content.md)
- [Schema findings](findings/schema.md)
- [Performance findings](findings/performance.md)
- [AI-search findings](findings/ai-search.md)
- [Image findings](findings/images.md)
- [Sitemap findings](findings/sitemap.md)
