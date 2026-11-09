# FamBasket SEO Action Plan

## Phase 1: Critical Fixes, Week 1

1. **Resolve canonical-origin 403 responses.** Review LiteSpeed/ModSecurity/WAF rules and make `https://fambasket.app/` return stable HTTP 200 HTML to users and approved search/AI crawlers.
2. **Test crawler parity.** Verify Googlebot, Bingbot, GPTBot, ClaudeBot, and PerplexityBot receive the same indexable HTML, metadata, and JSON-LD as a browser session.
3. **Fix the schema hero image URL.** Replace the `.png` reference with an existing canonical asset or publish the referenced file.

## Phase 2: High-Impact Improvements, Weeks 2-3

1. Measure Lighthouse/PageSpeed LCP, INP, and CLS on mobile and desktop.
2. Optimize hero images with responsive sources and confirm inactive theme variants are not downloaded.
3. Expand the sitemap with intended indexable legal or product pages and validate every URL returns 200.
4. Fix the rendered copy typo `stuffyou`.

## Phase 3: Content and Authority, Month 2

1. Create focused supporting pages for shared grocery lists, family/roommate shopping, pantry tracking, privacy, and accessibility.
2. Add attributable customer stories, documentation, or independent launch/profile links to support product claims.
3. Link supporting pages from the homepage and include them in the sitemap and relevant JSON-LD.

## Phase 4: Monitoring and Iteration, Ongoing

1. Monitor canonical status, robots, sitemap, and crawler responses from multiple networks.
2. Set up Google Search Console and PageSpeed/CrUX access for indexation and field CWV data.
3. Capture a drift baseline after the origin and schema fixes, then compare after deployments.
