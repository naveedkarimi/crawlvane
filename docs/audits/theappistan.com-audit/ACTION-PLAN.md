# TheAppistan SEO Action Plan

## Phase 1: Restore Access, Immediately

1. Review Cloudflare WAF, LiteSpeed, ModSecurity, bot-management, and rate-limit rules causing HTTP 403 responses.
2. Make `https://theappistan.com/` return stable HTTP 200 HTML to users, Googlebot, Bingbot, and approved AI search crawlers.
3. Make `https://theappistan.com/sitemap.xml` return valid XML with HTTP 200.
4. Confirm one canonical host and a single clean HTTP-to-HTTPS/www redirect path.

**Failure check:** a clean-network request or approved crawler still receives 403, a redirect loop, or materially different HTML.

## Phase 2: Re-run Measurement, Week 1

1. Re-run the full audit after the origin fix.
2. Validate robots.txt, sitemap coverage, canonicals, metadata, structured data, and crawlable internal links.
3. Measure LCP, INP, CLS, mobile rendering, and accessibility after real HTML is available.
4. Configure Search Console, PageSpeed/CrUX, and backlink sources if deeper data is required.

**Failure check:** the homepage is reachable but key SEO content remains client-only, blocked, or absent from the sitemap.

## Phase 3: Content and Authority, After Crawl

Only create content recommendations after the site can be inspected. Avoid inferring business type, target queries, schema, or page gaps from the error response.

## Phase 4: Monitoring, Ongoing

Monitor homepage and sitemap status from multiple networks and user agents. Capture a drift baseline after a stable 200 response, then compare after infrastructure deployments.
