# Technical SEO

## Evidence
- Canonical homepage: `https://fambasket.app/`
- Homepage returned HTTP 403 to the prescribed Claude SEO renderer and several direct requests, while the `www` path redirected to the apex and returned HTTP 200 application HTML in a browser-compatible session.
- `robots.txt` returned HTTP 200 and allows `/` for `*`, Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, and other named crawlers.
- HTTPS is enforced from HTTP and `www`; the response included HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and CSP.
- `robots.txt` declares `https://fambasket.app/sitemap.xml`.

## Findings

### High: inconsistent origin access
A crawler-like request to the apex received LiteSpeed `403 Forbidden`, and the same behavior occurred intermittently for direct requests to the homepage and crawl endpoints. A normal browser-compatible session could render the application through `www` before redirecting to the apex. This can impair search crawling, previews, and third-party audits even though browser traffic works.

**Recommendation:** inspect LiteSpeed/ModSecurity/WAF rules, CDN or hosting access controls, and bot/user-agent handling. Test with Googlebot, Bingbot, ClaudeBot, and a neutral browser from multiple regions. Ensure the canonical apex returns stable `200` HTML to approved crawlers and users.

### Medium: sitemap contains only the homepage
The sitemap is syntactically valid but contains one URL. For this single-page marketing site that may be intentional, but `/privacy` and `/terms` are crawlable internal pages and are absent.

**Recommendation:** include all indexable public pages in the sitemap, or explicitly confirm those legal pages should remain excluded. Keep only canonical, 200-status URLs and use current `lastmod` values.

### Low: `Host` directive is non-standard
`robots.txt` includes `Host: https://fambasket.app`. This is not part of the Google robots protocol and is ignored by major crawlers.

**Recommendation:** remove it unless a specific non-search crawler requires it; retain the `Sitemap` directive.

## Positives
HTTPS, redirect consolidation, security headers, explicit crawler allowances, and a canonical URL are correctly implemented.
