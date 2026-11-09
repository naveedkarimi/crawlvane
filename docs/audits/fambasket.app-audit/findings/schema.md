# Schema and Structured Data

## Evidence
The rendered homepage contains two JSON-LD blocks:

1. `Organization`, `WebSite`, and `SoftwareApplication` in an `@graph`.
2. `FAQPage` with eight questions and accepted answers.

The software application includes `ShoppingApplication`, `Web`, two offers (`Free` and `Pro`), publisher, description, and screenshots.

## Findings

### High: SoftwareApplication screenshot URL mismatch
JSON-LD references `https://fambasket.app/app-screenshots/hero-light.png`, while the rendered page uses `/app-screenshots/hero-light.webp`. Validate every schema image URL and use an existing, canonical image format. A broken schema image weakens entity/application markup quality.

### Medium: offer availability is underspecified
The `Offer` nodes contain price and currency, but no `availability`, `url`, or `priceValidUntil`. These are not universally required for SoftwareApplication markup, but adding accurate availability and a destination URL improves completeness where applicable. Do not add a false expiry date.

### Low: validate FAQ eligibility and visible parity
The FAQ content is visible and matches the JSON-LD, which is good. Confirm the page remains eligible under current search-result FAQ policies and keep answers concise and user-facing.

## Positives
Entity relationships are coherent, `@id` values are stable, Organization and WebSite publisher links are present, and FAQ answers are represented in visible content.
