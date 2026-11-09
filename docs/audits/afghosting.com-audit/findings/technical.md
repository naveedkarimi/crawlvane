# Technical SEO Findings

## Critical: canonical HTTPS origin returns HTTP 403

The prescribed renderer and standard browser probe both received a 1,242-byte LiteSpeed 403 response from `https://afghosting.com/`.

## High: robots.txt and sitemap.xml return HTTP 403

Both crawl-control endpoints were inaccessible. Search engines cannot reliably read directives or discover sitemap URLs.

## High: alternate hosts redirect into blocked apex

The www HTTPS host redirects to the apex and HTTP redirects to HTTPS, but the final canonical destination remains blocked.

## Confirmed positives

- HTTP-to-HTTPS redirection exists.
- www-to-apex canonical redirection exists.
- Security headers were present on the 403 response, including X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.

These headers do not offset the access failure. Re-run the technical audit after the origin returns stable 200 responses.
