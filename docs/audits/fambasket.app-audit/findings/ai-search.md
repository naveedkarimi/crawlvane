# AI Search Readiness

## Evidence
- `robots.txt` explicitly allows GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, Bingbot, and other named agents.
- The page has direct, quotable definitions of FamBasket, its audience, core workflow, pricing, availability, privacy position, and accessibility behavior.
- JSON-LD exposes Organization, WebSite, SoftwareApplication, Offer, and FAQPage entities.
- The origin returned intermittent 403 responses to crawler-like and direct requests, despite robots allowing those agents.

## Findings

### High: crawler permission and crawler delivery disagree
Allowing AI/search crawlers in robots.txt is positive, but agents must also receive stable `200` content. The observed 403 response means permission declarations do not currently guarantee retrieval.

**Recommendation:** test the exact user agents listed in robots.txt against the canonical apex from clean networks, then correct WAF/hosting rules and verify rendered HTML, JSON-LD, and status code.

### Medium: strengthen third-party authority signals
The page has first-party founder and product claims but limited external validation. Add links to reputable launch coverage, customer stories, documentation, or independently verifiable profiles when available. Keep claims specific and attributable.

## Positives
The copy is unusually extractable: short definitions, feature explanations, pricing, and FAQ answers can be quoted by answer engines without substantial interpretation.
