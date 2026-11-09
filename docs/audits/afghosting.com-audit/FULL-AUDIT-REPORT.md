# AF Ghosting Full Website SEO Audit

**Target:** https://afghosting.com/
**Audit date:** 2026-08-24
**Status:** Partial audit blocked by origin access
**SEO Health Score:** Not scoreable
**Business type:** Undetermined because the homepage returned HTTP 403

## Executive Summary

The prescribed homepage render could not retrieve indexable site content. `https://afghosting.com/` returned HTTP 403 from LiteSpeed. The `www` host returns a 301 to the apex, and HTTP returns a 301 to HTTPS, but the final canonical URL remains blocked. Both `robots.txt` and `sitemap.xml` also return HTTP 403.

This prevents a valid full SEO audit. Homepage title, headings, copy, canonical, structured data, internal links, images, rendered accessibility, business type, and crawl depth could not be verified. The primary confirmed issue is site-wide crawlability and origin delivery.

## Confirmed Findings

### Critical: canonical HTTPS homepage returns 403

The homepage returned a 1,242-byte LiteSpeed 403 response to the audit renderer and a standard browser user agent. Search engines and AI crawlers may receive the same response, preventing reliable indexing.

**Fix:** Review LiteSpeed, ModSecurity, hosting permissions, bot protection, and any Cloudflare or reverse-proxy rules. Ensure the canonical homepage returns stable HTTP 200 HTML.

### High: robots.txt returns 403

The robots endpoint is blocked, so crawlers cannot reliably read crawl directives or the sitemap declaration.

**Fix:** Serve a valid plain-text robots.txt with HTTP 200.

### High: sitemap.xml returns 403

The sitemap endpoint is also blocked. No sitemap coverage or URL quality can be assessed.

**Fix:** Serve valid XML with HTTP 200 and include the canonical sitemap URL in robots.txt.

### Medium: redirect chain terminates at blocked apex

`http://afghosting.com/` redirects to HTTPS, and `https://www.afghosting.com/` redirects to the apex. The final destination returns 403.

**Fix:** Keep one canonical host, retain one clean redirect per alternate host, and verify the destination returns 200.

## Sections Not Assessable

The following require accessible homepage HTML and were not scored:

- Business type and 500-page crawl.
- Content quality, E-E-A-T, readability, and topical coverage.
- Title, meta description, headings, canonicals, and internal links.
- Schema and structured data.
- LCP, INP, CLS, resource payloads, and visual/mobile behavior.
- Image alt text, dimensions, formats, and lazy loading.
- AI-search citability, SSR, crawler parity, and brand signals.
- Google Search Console, CrUX, PageSpeed, GA4, backlink, and drift data.

## Crawl Evidence

| Endpoint | Result | Interpretation |
|---|---|---|
| `https://afghosting.com/` | HTTP 403 | Canonical homepage inaccessible |
| `https://www.afghosting.com/` | HTTP 301 to apex, final 403 | www redirects into blocked host |
| `http://afghosting.com/` | HTTP 301 to HTTPS, final 403 | HTTPS redirect exists but destination is blocked |
| `https://afghosting.com/robots.txt` | HTTP 403 | Crawl directives inaccessible |
| `https://afghosting.com/sitemap.xml` | HTTP 403 | Sitemap inaccessible |

## Required Recheck

After the access issue is fixed, rerun `/seo audit https://afghosting.com/`. Confirm stable HTTP 200 responses for the homepage, robots.txt, and sitemap.xml from a clean network and approved crawler user agents, then complete the full robots-respecting crawl and specialist checks.

## Limitations

No content or SEO quality conclusions are made from the 403 error page. Google, backlink, and drift sources were unavailable, and no valid homepage HTML was available for downstream analysis.

Generate a professional PDF report? Use `/seo google report full`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Built by agricidaniel — Join the AI Marketing Hub community
🆓 Free  → https://www.skool.com/ai-marketing-hub
⚡ Pro   → https://www.skool.com/ai-marketing-hub-pro
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
