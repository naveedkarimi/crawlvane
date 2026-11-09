# FamBasket Backlink Profile Analysis

**Target:** https://fambasket.app/
**Audit date:** August 24, 2026
**Business type:** SaaS / consumer household grocery application
**Backlink Health Score:** **INSUFFICIENT DATA (0/7 factors scored)**

## Data Availability and Confidence

Source detection found only the always-available tiers:

| Source | Status | Confidence / limitation |
|---|---|---|
| DataForSEO | Unavailable | No extension data was available. |
| Moz Link Explorer | Not configured | No Moz API key detected. |
| Bing Webmaster | Not configured | No Bing Webmaster API key detected. |
| Common Crawl Web Graph | Available | Low-confidence, domain-level presence/rank signal only. |
| Verification crawler | Available | Requires a known backlink JSON list; none was supplied or returned by an upstream source. |

Run `/seo backlinks setup` to add free Moz and Bing API keys for a richer, scoreable profile. The findings below do not imply that FamBasket has no backlinks; they describe what the available sources could and could not observe.

## 1. Profile Overview

**Common Crawl result:** `fambasket.app` was **not found** in the `cc-main-2026-jan-feb-mar` web graph release. The response reported `in_crawl: false`, `in_rankings: false`, no PageRank, no harmonic centrality, and no host count.

This is a low-confidence presence signal, not a backlink total. A young or small domain may not yet be represented in the selected Common Crawl release. Referring-domain count, total backlinks, follow ratio, domain rank, and trend are unavailable.

| Metric | Result | Source |
|---|---|---|
| Referring domains | Not available | No Moz/DataForSEO/Bing data |
| Total backlinks | Not available | No Moz/DataForSEO/Bing data |
| Domain rank / PageRank | Not found in this crawl | Common Crawl, confidence 0.50 |
| Follow ratio | Not available | No backlink detail source |
| Trend | Not available | Free sources provide point-in-time snapshots only |

**Interpretation:** FamBasket has no observable Common Crawl domain-graph footprint in this release. The next practical step is configuring Moz or Bing, then checking Search Console links after ownership verification.

## 2. Anchor Text Distribution

No backlink or anchor-text list was available. Branded, naked URL, generic, exact-match, partial-match, and long-tail percentages cannot be calculated.

Do not infer anchor health from the homepage's own outbound links. The SaaS benchmark for a mature profile is roughly 40-55% branded, 15-20% URL, 10-15% generic, 3-8% exact match, and 10-15% partial match, but those ranges are review heuristics, not targets that justify manufactured links. Once Moz, DataForSEO, or Bing data is available, classify every observed anchor and flag exact-match anchors above 15% for manual review.

**Status:** Insufficient data. No over-optimization or unnatural anchor pattern is established.

## 3. Referring Domain Quality

No referring domains were returned, so TLD distribution, country relevance, domain authority tiers, and follow/nofollow distribution cannot be assessed. There is no evidence in this dataset of .edu, .gov, .org, low-quality TLD concentration, private blog networks, or geographic mismatch.

The available Common Crawl signal can support only this limited comparison:

| Domain | Common Crawl presence | Hosts | PageRank | Source |
|---|---:|---:|---:|---|
| `fambasket.app` | Not found | N/A | N/A | Common Crawl, 0.50 |
| `getbring.com` | Found / in rankings | 12 | 2.033365e-07 | Common Crawl, 0.50 |

Bring! is included because it was the competitor researched in the existing comparison package. The difference indicates a detectable domain-graph footprint for Bring! and none for FamBasket in this release. It does **not** establish the number, quality, or value of Bring!'s backlinks, and it is not a like-for-like backlink count.

## 4. Toxic Link Detection

No individual backlinks or referring-domain records were available, so no toxic-link pattern can be confirmed. In particular, this audit found no verified PBN links, link farms, hacked pages, paid site-wide links, exact-match clusters, reciprocal networks, or unrelated-niche links. “Not observed” means the source data was unavailable, not that those patterns were disproven.

No disavow file is recommended. Disavowal should require evidence of a manual action, a clear negative SEO attack, or a confirmed toxic ratio above the applicable threshold. Low-quality links that Google ignores should not be disavowed merely because they are low authority.

The verification crawler was not run because no known backlink JSON list exists. Its required input is a list such as `[{"source_url":"https://example.com/page"}]`; without source URLs, it cannot distinguish a live link from a removed link.

## 5. Top Pages by Backlinks

Unavailable. No page-level backlink source was configured, so the audit cannot identify link magnets, zero-link pages, or 404 pages with reclaimable equity.

The only indexable URL observed in the existing site audit is the homepage. That makes it a likely first target for link acquisition, but it is not evidence that the homepage currently has backlinks. When Moz or DataForSEO is configured, inspect:

- Homepage links and linking root domains.
- Product, privacy, terms, and future documentation pages with zero links.
- Any broken URL receiving links, for 301 reclamation.
- Independent launch, founder, customer-story, and product-review pages that can naturally link to the relevant feature page rather than only the homepage.

## 6. Competitor Gap Analysis

A true backlink gap requires referring-domain lists for both products. Those lists were unavailable. The Common Crawl comparison with `getbring.com` is therefore a directional discovery signal only:

- **Competitor-only domains:** Not available.
- **Shared referring domains:** Not available.
- **FamBasket-only domains:** Not available.
- **Top 20 link-building opportunities with authority:** Cannot be generated responsibly without domain-level backlink data.
- **Directional gap:** Bring! was present in the selected Common Crawl graph with 12 hosts; FamBasket was not found.

Priority opportunity types for manual prospecting, without claiming that any domain already links to Bring!, are:

1. Independent family-organization and household-planning publications.
2. Grocery, meal-planning, and food-waste resources that can cite pantry tracking or leftover workflows.
3. Accessibility and inclusive-design communities that can evaluate the per-member accessibility mode.
4. Product-launch and startup publications that cover the founder's first-hand household problem.
5. App directories and review sites that accept independently verifiable product listings.
6. Relevant YouTube creators who can demonstrate shared shopping coordination in a real household.
7. Legitimate family, roommate, and co-living communities where a useful guide earns a contextual citation.
8. Technical or privacy publications that can review the documented on-device location behavior.
9. Customer stories with a specific before/after workflow, not generic testimonials.
10. Bring!-adjacent comparison content only when it provides balanced, sourced information and clearly discloses FamBasket affiliation.

These are prospect categories, not confirmed competitor-link gaps. Research and qualify each site before outreach.

## 7. New and Lost Backlinks

**Unavailable.** DataForSEO is required for date-filtered new/lost backlink tracking in this workflow. Free sources provide point-in-time snapshots only, and Common Crawl does not provide a reliable 30/60/90-day link-velocity series for this domain.

No spike, loss event, declining velocity, or negative SEO attack can be inferred. After configuring a source, track 30/60/90-day changes and investigate sudden increases, large losses, or a concentration of new links from one TLD or country.

## Link-Building Priorities

### High Priority

- Configure Moz or Bing Webmaster access so referring domains, anchors, and link details can be measured.
- Verify the domain in Google Search Console and record the first-party links report when available.
- Fix the canonical origin's intermittent 403 behavior before outreach so earned links land on a reliably crawlable page.
- Publish evidence-rich pages for shared grocery lists, pantry tracking, offline use, accessibility, and privacy so outreach has specific link targets.

### Medium Priority

- Create original first-party material from the household workflow that other publications can cite.
- Seek genuine product reviews, launch coverage, and customer stories; disclose the FamBasket affiliation.
- Use the existing comparison page as a balanced resource, not as a reason to request low-quality competitor-anchor links.

### Low Priority

- Maintain consistent official profiles and product listings.
- Monitor Common Crawl on future releases for domain presence, while treating it as a discovery signal rather than a backlink database.

## Measurement and Recheck

Re-run this audit after Moz or Bing setup, or after a verified backlink export is available. The score remains intentionally uncomputed until at least four of the seven health factors have data. Current factor coverage is zero for referring-domain count, quality distribution, anchor naturalness, toxic ratio, velocity, follow ratio, and geographic relevance.

Once data is available, every metric should retain a source label and confidence level. Use the verification crawler only with known source URLs, and distinguish an inaccessible JavaScript page from a confirmed removed link.

## Limitations

- Common Crawl release: `cc-main-2026-jan-feb-mar`.
- Common Crawl timestamp: August 25, 2026 UTC as returned by the script; this is the source timestamp, while the audit date is August 24, 2026 local session date.
- No Moz API key, Bing Webmaster key, or DataForSEO source was available.
- No known backlink list was supplied, so link verification was not possible.
- No numeric Backlink Health Score is shown because only low-confidence Common Crawl presence data was available.

## Recommended Setup

Run `/seo backlinks setup` to configure free Moz and Bing API keys. For link velocity, competitor referring-domain gaps, and richer spam signals, install and configure the DataForSEO extension. After setup, rerun `/seo backlinks fambasket.app`.

Generate a professional PDF report? Use `/seo google report`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Built by agricidaniel — Join the AI Marketing Hub community
🆓 Free  → https://www.skool.com/ai-marketing-hub
⚡ Pro   → https://www.skool.com/ai-marketing-hub-pro
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
