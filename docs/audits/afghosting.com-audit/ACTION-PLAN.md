# AF Ghosting SEO Action Plan

## Phase 1: Restore Crawlability, Immediately

1. Review LiteSpeed and ModSecurity logs for the rule producing the 403.
2. Check hosting document-root, file permissions, `.htaccess`, IP restrictions, bot protection, and rate limits.
3. Make the homepage return HTTP 200 to normal users and approved search crawlers.
4. Make `robots.txt` return HTTP 200 plain text.
5. Make `sitemap.xml` return HTTP 200 valid XML.
6. Keep the apex as canonical and verify www/HTTP redirects terminate there once.

**Failure check:** any clean-network request or approved crawler still receives 403, a redirect loop, or materially different indexable HTML.

## Phase 2: Re-run Measurement, Week 1

1. Re-run the full audit after access is restored.
2. Validate canonicals, metadata, headings, structured data, internal links, and sitemap coverage.
3. Measure LCP, INP, CLS, mobile rendering, and accessibility.
4. Configure Search Console, PageSpeed/CrUX, and backlink sources if deeper data is required.

**Failure check:** the page returns 200 but key SEO content, robots directives, or sitemap URLs remain inaccessible.

## Phase 3: Content and Authority, After Crawl

Do not make business-type, keyword, schema, or content recommendations until the actual site content can be inspected.

## Phase 4: Monitoring, Ongoing

Monitor homepage, robots.txt, and sitemap status from multiple networks and user agents. Capture a drift baseline after stable 200 delivery and compare after hosting or deployment changes.
