# Crawlvane Capability Extensions

> **Document purpose:** Define additional capabilities that can extend
> Crawlvane beyond its current documented feature set.
>
> **Non-negotiable scope:** This document is additive. It does not
> replace, rewrite, remove, rename, downgrade, or change any existing
> Crawlvane feature, check, score, plan, entitlement, workflow, API, or
> technical implementation.
>
> **Implementation status:** Every item below is a proposal until
> verified against the current codebase and production application.
>
> **Status review (2026-11-12):** items ticked `[x]` are built (checked in the codebase, including the 14 quick adds),
> (at least in a first version). The full review, with what's built, the quick adds and the bigger
> work, is in `docs/app/FEATURES.md`, section 16.

------------------------------------------------------------------------

## 1. Rules for extending Crawlvane

1.  Keep every existing capability working exactly as it does today.
2.  Do not modify the current 49 documented checks, their IDs, logic,
    severity, or weights as part of this extension.
3.  Do not change the current overall scoring formula or the SEO, AEO,
    and GEO score composition.
4.  Do not change existing Free, Pro, or Agency plan limits, pricing, or
    entitlements in order to add these capabilities. Any future
    packaging change must be a separate product decision.
5.  Add new functionality as separate modules, checks, report sections,
    integrations, or optional workflows.
6.  Reuse existing crawler, audit, report, monitoring, authentication,
    billing, and feature-flag infrastructure where practical.
7.  Make new capabilities opt-in or feature-flagged until they are
    complete and tested.
8.  Where a new capability needs an external data provider, label the
    result as provider-sourced and disclose its coverage and
    limitations.
9.  Do not present estimates, sampled data, or AI-generated assessments
    as verified facts.
10. If a proposed capability overlaps something already implemented,
    improve the existing implementation instead of creating a duplicate.

## 2. Priority groups

  -----------------------------------------------------------------------
  Priority                Extension group         Intended outcome
  ----------------------- ----------------------- -----------------------
  P1                      Crawl and audit         Make audit coverage and
                          intelligence            findings more complete
                                                  and explainable

  P1                      Advanced technical SEO  Identify deeper site
                                                  architecture and
                                                  indexation issues

  P1                      Content and             Turn page-level
                          internal-link           findings into
                          intelligence            actionable site-wide
                                                  insights

  P1                      Advanced AEO            Assess how effectively
                                                  content answers
                                                  questions

  P1                      Advanced GEO and AI     Assess entity clarity,
                          visibility              citation potential, and
                                                  observed AI presence

  P1                      AI crawler diagnostics  Give site owners more
                                                  insight into AI crawler
                                                  access

  P2                      Search Console and      Connect technical
                          analytics integrations  findings with real
                                                  search and traffic data

  P2                      Keyword and SERP        Find search
                          intelligence            opportunities and
                                                  monitor search
                                                  competitors

  P2                      Backlink intelligence   Add external authority
                                                  and link-profile
                                                  context

  P2                      Local and international Support location-based
                          SEO                     and multilingual search

  P2                      Content planning and    Help users plan and
                          optimization workflows  improve content over
                                                  time

  P3                      Agency, collaboration,  Improve multi-client
                          and automation          delivery and team
                          extensions              workflows
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Crawl and audit intelligence extensions

These capabilities deepen the existing audit and crawl workflows. They
should be added without changing the behavior of existing checks.

## 3.1 Crawl coverage analysis

-   [x] Show discovered, crawled, successful, failed, blocked, skipped,
    and excluded URL counts.
-   [x] Explain why each URL was not crawled.
-   [x] Show crawl depth and click depth for each discovered URL.
-   [ ] Identify important pages that are difficult to reach through
    internal links.
-   [x] Compare sitemap URLs against URLs discovered through crawling.
-   [x] Identify discovered pages missing from XML sitemaps.
-   [ ] Detect crawl traps, calendar traps, faceted-navigation
    explosions, and excessive URL parameters.
-   [ ] Detect redirect chains, redirect loops, and repeated redirect
    destinations.
-   [ ] Add configurable URL include and exclude patterns.
-   [ ] Add crawl comparison to show newly discovered, removed, changed,
    and newly failing URLs.
-   [x] Provide a crawl coverage export.

## 3.2 Duplicate and page-group analysis

-   [x] Detect exact duplicate pages.
-   [ ] Detect near-duplicate pages using content similarity.
-   [x] Group pages by title, description, heading, template, or content
    similarity.
-   [ ] Identify duplicate pages with conflicting canonical signals.
-   [ ] Detect pages targeting the same or highly similar search intent.
-   [ ] Flag possible keyword cannibalization for review.
-   [ ] Identify thin page groups and repeated template content.
-   [x] Show the pages involved and explain the evidence behind each
    group.

## 3.3 Site architecture intelligence

-   [ ] Visualize the site's URL hierarchy and internal-link structure.
-   [x] Estimate click depth from the home page.
-   [x] Identify orphan pages and pages with very few internal links.
-   [ ] Identify pages receiving many internal links but providing few
    useful onward links.
-   [ ] Estimate internal link equity distribution. Clearly label it as
    an estimate, not Google's PageRank.
-   [x] Find relevant pages that could link to one another.
-   [ ] Detect overly deep or disconnected sections.
-   [ ] Group pages into directories, topics, templates, and content
    types.

## 3.4 Change and regression detection

-   [x] Compare audit results across selected dates.
-   [x] Highlight newly introduced issues separately from pre-existing
    issues.
-   [x] Detect resolved issues.
-   [ ] Detect score and issue regressions without changing the existing
    score calculation.
-   [ ] Track important page changes, including title, description,
    canonical, robots directives, headings, schema, and main content.
-   [ ] Provide a change history for each tracked URL.
-   [ ] Allow users to annotate a deployment or site change against an
    audit date.

------------------------------------------------------------------------

# 4. Advanced technical SEO extensions

-   [x] Detect soft 404 pages and likely error pages returning a
    successful HTTP status.
-   [x] Detect inconsistent trailing-slash, uppercase/lowercase, and URL
    normalization behavior.
-   [ ] Detect unnecessary redirect hops and mixed redirect
    destinations.
-   [ ] Detect pagination implementation issues.
-   [ ] Analyze faceted navigation and parameter URL indexation risks.
-   [x] Detect inconsistent canonicalization across HTTP/HTTPS,
    www/non-www, and URL variants.
-   [ ] Identify indexable pages with very little unique content.
-   [ ] Identify pages blocked from crawling but linked internally or
    included in sitemaps.
-   [ ] Analyze robots directives and canonical signals together to
    identify conflicts.
-   [ ] Detect invalid, conflicting, or unexpected `X-Robots-Tag`
    directives.
-   [x] Check XML sitemap freshness, last-modified consistency, and
    invalid entries.
-   [ ] Detect sitemap files that are too large or contain
    non-canonical, redirected, or non-indexable URLs.
-   [ ] Detect broken pagination and important pages that are only
    discoverable through pagination.
-   [ ] Detect JavaScript-generated links that are missing or materially
    different in raw HTML.
-   [ ] Compare raw HTML with rendered DOM for key SEO elements.
-   [ ] Detect important content that appears only after user
    interaction.
-   [ ] Add optional log-file analysis to identify verified
    search-engine bot visits, response codes, and crawl frequency. Log
    analysis must be clearly separated from simulated crawler tests.
-   [ ] Add migration mode for comparing old and new URL sets,
    redirects, canonicals, and indexability before and after a site
    migration.

------------------------------------------------------------------------

# 5. Content intelligence extensions

## 5.1 Content quality and usefulness

-   [ ] Assess whether a page satisfies its apparent search intent.
-   [ ] Identify missing subtopics compared with the page's stated
    topic.
-   [ ] Detect repetitive, generic, or low-information sections.
-   [ ] Identify unsupported claims, statistics, and statements that
    need sources.
-   [ ] Identify content that may be outdated based on dates and
    referenced facts.
-   [ ] Detect inconsistent facts across pages on the same site.
-   [ ] Identify missing first-hand experience, examples, original
    insight, or practical detail.
-   [ ] Assess whether the introduction communicates the page's purpose
    clearly.
-   [ ] Assess whether headings accurately describe the sections below
    them.
-   [ ] Identify pages that overlap in purpose and could confuse users
    or search engines.
-   [ ] Provide evidence snippets for each recommendation.

## 5.2 Topic and content portfolio analysis

-   [ ] Group existing pages into topic clusters.
-   [ ] Identify topics with strong coverage and topics with missing
    supporting content.
-   [ ] Identify possible pillar pages and supporting articles.
-   [ ] Suggest content briefs for missing topics.
-   [ ] Map target topics and search intent to existing URLs.
-   [ ] Identify multiple URLs competing for the same topic.
-   [ ] Recommend consolidation, differentiation, or internal linking
    for overlapping content.
-   [ ] Provide a content inventory with URL, topic, content type, last
    updated date, and audit findings.

## 5.3 Content improvement workflow

-   [ ] Generate page-specific content briefs.
-   [x] Suggest improved titles and meta descriptions as optional
    drafts.
-   [ ] Suggest heading structures without automatically changing the
    live page.
-   [ ] Suggest sections, examples, FAQs, and supporting evidence to
    add.
-   [x] Generate alternative introductions and concise answer passages.
-   [ ] Provide before-and-after previews for proposed content changes.
-   [ ] Let users mark a recommendation as accepted, rejected, or
    completed.
-   [x] Re-audit a page to check whether a completed recommendation
    changed the relevant finding.

AI-generated content must be presented as a draft for human review, not
as a guaranteed ranking improvement.

------------------------------------------------------------------------

# 6. Internal-link intelligence extensions

-   [x] Recommend internal links based on topical relevance and page
    context.
-   [x] Suggest useful anchor text for each proposed link.
-   [x] Identify important pages with insufficient internal links.
-   [ ] Identify pages with excessive or repetitive exact-match anchors.
-   [x] Detect internal links pointing through redirects.
-   [x] Detect internal links to non-canonical or non-indexable
    destinations.
-   [x] Identify broken links and their source pages in a prioritized
    view.
-   [ ] Identify pages that link to unrelated or weakly relevant
    content.
-   [x] Show incoming and outgoing internal links for each URL.
-   [x] Provide a site-wide internal-link opportunity report.
-   [x] Allow users to export proposed link changes for editorial or
    developer implementation.

Recommendations should include the source page, destination page,
suggested anchor, and reason.

------------------------------------------------------------------------

# 7. Advanced AEO extensions

The aim is to assess answer usefulness and extractability more deeply
than basic question-heading or FAQ checks.

## 7.1 Answer quality analysis

-   [ ] Detect the primary question or problem a page appears to answer.
-   [x] Assess whether the page provides a direct answer near the
    relevant question.
-   [ ] Assess whether the answer is specific, complete, and
    understandable without surrounding context.
-   [ ] Identify answers that are vague, circular, or unnecessarily
    long.
-   [ ] Detect questions that are raised but not answered.
-   [ ] Identify important answers buried deep in the page.
-   [ ] Assess whether definitions, steps, comparisons, and explanations
    are clearly structured.
-   [ ] Identify passages that could be misunderstood when extracted
    independently.
-   [ ] Detect inconsistent answers to similar questions across the
    site.
-   [x] Suggest concise answer passages while preserving the page's
    intended meaning.

## 7.2 Question and intent coverage

-   [ ] Discover related questions from supported search or question
    datasets.
-   [ ] Group questions by informational, comparison, transactional, and
    troubleshooting intent.
-   [x] Identify missing questions for an existing topic.
-   [ ] Map questions to the most relevant existing URL.
-   [ ] Identify questions with no suitable page on the site.
-   [ ] Suggest FAQ or dedicated content opportunities where
    appropriate.
-   [ ] Distinguish observed questions from AI-generated suggestions.

## 7.3 Answer format and extraction readiness

-   [ ] Assess whether a page uses an appropriate format for
    definitions, procedures, comparisons, and lists.
-   [ ] Identify content that could benefit from a concise summary or
    comparison table.
-   [ ] Assess whether step sequences are clearly ordered.
-   [ ] Check that FAQ and other structured data accurately reflect
    visible page content.
-   [ ] Identify answer passages that depend on images or interactive
    elements without equivalent text.
-   [ ] Provide an AEO evidence view showing the question, extracted
    answer, source passage, and improvement suggestion.

Do not claim that a page has earned a featured snippet, AI Overview, or
voice result unless that result has actually been observed through a
supported data source.

------------------------------------------------------------------------

# 8. Advanced GEO and AI visibility extensions

## 8.1 Entity and brand understanding

-   [ ] Build a site-level inventory of named entities, products,
    services, people, and organization names.
-   [ ] Identify inconsistent brand, product, and organization
    descriptions across pages.
-   [ ] Detect ambiguous entity references that lack sufficient context.
-   [ ] Assess whether important entities are connected to relevant
    supporting pages.
-   [ ] Identify missing or inconsistent organization and person
    information.
-   [ ] Review sameAs references for relevance and consistency.
-   [ ] Identify important entity facts that are stated differently
    across the site.
-   [ ] Provide an entity consistency report with source URLs and
    evidence.

## 8.2 Citation readiness and source quality

-   [ ] Identify factual statements that would benefit from citations.
-   [ ] Assess whether cited sources are relevant to the claims they
    support.
-   [ ] Identify unsupported statistics, research claims, and numerical
    comparisons.
-   [ ] Identify original research, data, examples, and first-hand
    material that could make a page more useful as a source.
-   [ ] Assess author attribution and editorial responsibility.
-   [ ] Identify pages that provide clear, attributable facts and
    definitions.
-   [ ] Recommend improvements to make source context and attribution
    clearer.
-   [ ] Keep citation-readiness assessments separate from actual AI
    citation tracking.

## 8.3 AI answer visibility tracking

-   [x] Allow users to define buyer questions, brand questions, and
    topic questions.
-   [x] Track supported prompts across supported AI answer providers.
-   [x] Record whether the brand is mentioned.
-   [x] Record whether a Crawlvane-tracked URL is cited or linked.
-   [x] Record competitor mentions and cited competitor URLs.
-   [x] Classify mention context and sentiment with evidence.
-   [x] Track changes in mention rate and citation rate over time.
-   [x] Show the exact query, provider, check date, answer excerpt, and
    cited sources.
-   [x] Compare results across providers.
-   [x] Allow users to review and correct false-positive brand matches.
-   [x] Keep historical snapshots so users can see changes over time.

Provider access, query limits, and result formats vary. Reports must
disclose which providers were tested, when they were tested, and whether
results came from an API, search result, or another supported source. Do
not describe a limited sample as a complete measure of all AI answers.

## 8.4 GEO competitor comparison

-   [x] Compare brand mentions for the same tracked question set.
-   [x] Compare cited URLs and source domains.
-   [x] Identify questions where competitors appear but the user's brand
    does not.
-   [ ] Identify competitor pages that are repeatedly cited for a topic.
-   [x] Suggest content gaps based on observed results.
-   [ ] Track changes in competitor visibility over time.
-   [ ] Separate measured observations from AI-generated explanations.

------------------------------------------------------------------------

# 9. AI crawler diagnostics extensions

Build on the existing crawler access map without changing its current
crawler classifications or access tests.

-   [ ] Add a crawler registry with crawler name, operator, purpose,
    published user-agent patterns, and reference links.
-   [ ] Track registry updates and crawler identity changes.
-   [ ] Show the result of each access test with timestamp, URL,
    response code, and relevant robots rule.
-   [x] Test access to selected important pages, not only the home page.
-   [ ] Compare crawler access across selected URLs.
-   [ ] Detect differences between raw HTML and rendered content
    available to supported fetchers.
-   [ ] Add optional server-log analysis to distinguish actual visits
    from Crawlvane's test requests.
-   [ ] Show verified crawler visits by bot, URL, status code, and time
    period when logs are available.
-   [ ] Alert users to meaningful access changes.
-   [x] Explain the difference between search indexing crawlers,
    user-triggered fetchers, and model-training crawlers.
-   [ ] Provide a policy review that explains the likely effect of
    allow/disallow rules without changing the user's robots.txt.
-   [ ] Allow users to export a crawler access report.

Crawler identity can be spoofed. Log-based reporting should distinguish
verified identities from user-agent-only matches and should explain the
verification method.

------------------------------------------------------------------------

# 10. Search Console and analytics integrations

These are proposed integrations and must not be represented as available
until OAuth, permissions, data retrieval, and error handling are
implemented.

## 10.1 Google Search Console

-   [x] Connect a verified Search Console property through OAuth.
-   [x] Import clicks, impressions, CTR, and average position.
-   [x] Break down performance by query, page, country, device, and date
    where the API supports it.
-   [ ] Link Crawlvane audit findings to affected pages and relevant
    search queries.
-   [x] Identify pages with high impressions but low CTR.
-   [ ] Identify pages receiving impressions for queries that do not
    closely match their content.
-   [ ] Detect pages with declining clicks or impressions over a
    selected period.
-   [x] Identify queries where a page is close to a stronger position,
    subject to data limitations.
-   [ ] Compare search performance before and after an audit or
    deployment.
-   [ ] Clearly label Search Console data and its reporting delay.

## 10.2 Google Analytics 4

-   [x] Connect a GA4 property through OAuth.
-   [x] Import supported sessions, engaged sessions, landing-page, and
    conversion metrics.
-   [ ] Connect landing pages to Crawlvane audit findings.
-   [x] Identify high-traffic pages with technical or content issues.
-   [ ] Identify pages with declining engagement or conversions.
-   [ ] Compare organic landing-page performance across date ranges.
-   [ ] Allow users to select which supported metrics appear in reports.
-   [ ] Respect property permissions and data availability.

## 10.3 Bing Webmaster Tools

-   [ ] Explore supported property connection and authentication
    options.
-   [ ] Import available search performance and crawl information.
-   [ ] Link imported data to relevant Crawlvane pages and findings.
-   [ ] Clearly label the source, date range, and data limitations.

------------------------------------------------------------------------

# 11. Keyword and SERP intelligence

This module depends on a suitable search data provider. Do not invent
search volume, keyword difficulty, ranking, or SERP features.

-   [ ] Discover related keywords for a domain, URL, or topic.
-   [ ] Show provider-sourced search volume, difficulty, and trend data
    where available.
-   [ ] Group keywords by topic and search intent.
-   [ ] Map keywords to existing pages.
-   [ ] Identify keywords with no suitable target page.
-   [ ] Identify possible keyword cannibalization using keyword and URL
    evidence.
-   [ ] Track selected keyword rankings by location, device, and search
    engine where supported.
-   [ ] Track SERP features for selected keywords where the provider
    supports them.
-   [ ] Compare ranking URLs and keyword coverage against competitors.
-   [ ] Identify competitor keyword gaps.
-   [ ] Track ranking changes over time.
-   [ ] Provide a keyword-to-page mapping export.

Every metric must identify its provider and retrieval date. Estimates
must be labelled as estimates.

------------------------------------------------------------------------

# 12. Backlink and authority intelligence

This module requires a licensed backlink data source or an explicitly
supported external integration.

-   [ ] Show referring domains and backlinks from the connected
    provider.
-   [ ] Track new and lost referring domains.
-   [ ] Identify links pointing to broken or redirected URLs.
-   [ ] Identify backlinks to pages that are no longer available.
-   [ ] Show anchor-text distribution where provider data supports it.
-   [ ] Identify potentially suspicious link patterns for manual review.
-   [ ] Compare referring-domain profiles with selected competitors.
-   [ ] Identify pages that attract the most referring domains.
-   [ ] Track changes in backlink metrics over time.
-   [ ] Provide source, freshness, and coverage disclosures.

Do not label a link toxic or recommend disavowal solely from an
automated score. Present evidence and require human review.

------------------------------------------------------------------------

# 13. Local SEO extensions

-   [ ] Allow users to configure business name, address, phone number,
    service areas, and business locations.
-   [ ] Compare business details across the user's own site pages.
-   [ ] Check consistency of business details in supported connected
    listings or data providers.
-   [ ] Audit location landing pages for unique, useful local
    information.
-   [ ] Identify duplicate or near-duplicate location pages.
-   [ ] Review local business structured data against visible page
    content.
-   [ ] Assess location-specific title, description, headings, and
    contact information.
-   [ ] Track location-specific search performance when connected data
    supports it.
-   [ ] Support multiple business locations.
-   [ ] Provide a location-page comparison report.

External listing accuracy and local pack rankings require supported
third-party data. Do not imply complete listing coverage without it.

------------------------------------------------------------------------

# 14. International and multilingual SEO extensions

-   [ ] Inventory language and regional versions of pages.
-   [ ] Validate hreflang relationships across page sets.
-   [ ] Detect missing, invalid, conflicting, or non-reciprocal hreflang
    references.
-   [ ] Check language and regional URL consistency.
-   [ ] Identify pages that claim a language but contain materially
    different language content.
-   [ ] Compare translated page coverage across sections of a site.
-   [ ] Detect likely duplicate language or regional variants.
-   [ ] Review canonical and hreflang signals together.
-   [ ] Support country, language, and region groupings in reports.
-   [ ] Provide an international URL relationship view.

Language detection should be presented as an automated assessment and
allow manual correction.

------------------------------------------------------------------------

# 15. Content planning and publishing workflow extensions

-   [ ] Create a content opportunity backlog from audit findings,
    question gaps, and connected search data.
-   [ ] Prioritize opportunities by impact, confidence, effort, and
    business relevance.
-   [ ] Create content briefs from selected opportunities.
-   [x] Assign a content task to a team member.
-   [x] Add owner, status, due date, and notes to a recommendation.
-   [ ] Track draft, review, published, and re-audit stages.
-   [ ] Store the URL and date when a recommended change is published.
-   [ ] Recheck the affected page after publication.
-   [ ] Show whether the intended issue was resolved.
-   [ ] Export tasks to CSV or supported project-management
    integrations.

Do not automatically publish changes to customer websites in the initial
implementation. Keep content suggestions reviewable and user-controlled.

------------------------------------------------------------------------

# 16. Agency and collaboration extensions

These are workflow enhancements. They must not silently change current
Agency plan limits or entitlements.

-   [ ] Add internal notes to sites, audits, and recommendations.
-   [x] Add task assignment and ownership.
-   [ ] Add configurable client-facing report sections.
-   [ ] Add report annotations and agency commentary.
-   [ ] Add reusable report templates.
-   [ ] Add client approval or review status.
-   [ ] Add a per-client activity history.
-   [ ] Add team activity logs for important account actions.
-   [ ] Add role-aware permissions for site, report, and integration
    access.
-   [ ] Add bulk actions for supported site and report workflows.
-   [x] Add webhook events for completed audits, monitoring alerts, and
    report generation.
-   [ ] Add scheduled report configuration with delivery history.
-   [ ] Add API usage visibility and key management improvements.
-   [ ] Add integration health status and reconnect guidance.

Any change to seat counts, client-site limits, API quotas, or plan
packaging requires a separate decision and documentation update.

------------------------------------------------------------------------

# 17. Reporting and data export extensions

-   [ ] Add a site-wide opportunity report combining related findings
    without changing existing scores.
-   [x] Add an executive summary with the most important changes since
    the previous audit.
-   [ ] Add page-group and directory-level summaries.
-   [ ] Add evidence details and affected URL lists to exported reports.
-   [x] Add comparison reports between two audit dates.
-   [ ] Add separate exports for crawl coverage, content opportunities,
    internal links, AI crawler access, and AI visibility.
-   [x] Add CSV export for supported tables and datasets.
-   [ ] Add machine-readable API output for new modules where
    appropriate.
-   [ ] Include source, timestamp, scope, and limitations in every
    provider-backed report.
-   [x] Preserve existing PDF, Markdown, JSON, share-link, and report
    workflows.

------------------------------------------------------------------------

# 18. Suggested delivery sequence

This sequence is a recommendation, not a commitment to change existing
release plans.

## Phase 1: Reliability and deeper site understanding

-   Crawl coverage diagnostics.
-   Crawl comparison and regression detection.
-   Duplicate and near-duplicate page groups.
-   Orphan pages and click-depth analysis.
-   Advanced redirect and sitemap diagnostics.
-   Raw HTML versus rendered DOM comparison.

## Phase 2: Content, internal links, and AEO

-   Topic clustering and content overlap.
-   Internal-link opportunity recommendations.
-   Answer quality and question coverage.
-   Answer extraction evidence view.
-   Content briefs and reviewable suggestions.

## Phase 3: GEO and AI crawler intelligence

-   Entity consistency analysis.
-   Citation-readiness assessment.
-   Expanded AI crawler diagnostics.
-   Optional verified server-log analysis.
-   Historical AI mention and citation tracking with provider
    disclosures.

## Phase 4: Connected search data

-   Google Search Console.
-   Google Analytics 4.
-   Bing Webmaster Tools, subject to API feasibility.
-   Connect audit findings with search and landing-page performance.

## Phase 5: Competitive and specialist modules

-   Keyword and SERP intelligence.
-   Backlink intelligence.
-   Local SEO.
-   International and multilingual SEO.

## Phase 6: Workflow and agency improvements

-   Content opportunity backlog.
-   Assignment and collaboration.
-   Advanced report templates.
-   Webhooks and workflow integrations.

------------------------------------------------------------------------

# 19. Technical and product guardrails

## 19.1 Architecture

-   Add new modules alongside existing modules.
-   Prefer new check IDs for genuinely new checks.
-   Keep existing check IDs and response contracts stable.
-   Version APIs when a breaking change is unavoidable.
-   Use background jobs for expensive crawls, provider requests, and AI
    visibility checks.
-   Cache provider data where permitted and show its age.
-   Apply per-provider quotas, timeouts, retries, and failure handling.
-   Keep provider integrations isolated so one provider outage does not
    break core audits.
-   Use feature flags for incomplete or experimental modules.

## 19.2 Security and privacy

-   Apply the existing SSRF protections to every new URL-fetching path.
-   Validate every redirect destination.
-   Do not expose OAuth tokens, API keys, or provider credentials to the
    browser.
-   Request the minimum OAuth scopes required.
-   Provide clear disconnect and data-deletion behavior for
    integrations.
-   Respect provider terms, rate limits, and data-retention
    requirements.
-   Sanitize imported content before displaying or processing it.
-   Do not treat crawled page content as trusted instructions for AI
    systems.

## 19.3 Evidence and confidence

Every new finding should, where applicable, include:

-   What was checked.
-   Which URL or entity was checked.
-   The evidence or observed value.
-   When the check was performed.
-   The source of the data.
-   Whether the result is measured, inferred, estimated, or
    AI-generated.
-   A confidence or limitation note where appropriate.
-   A practical recommended action.

## 19.4 Scoring compatibility

-   New modules may have their own diagnostic summaries or opportunity
    indicators.
-   Do not add new checks to existing score calculations by default.
-   Do not change the existing SEO/AEO/GEO weighting or score caps in
    this extension.
-   Any future score change must be separately designed, versioned,
    tested against historical reports, and communicated to users.
-   Never imply that an audit score guarantees rankings, traffic,
    featured snippets, or AI citations.

------------------------------------------------------------------------

# 20. Definition of done for each extension

A capability is not complete merely because its UI exists. Before
release, verify that:

-   [ ] It does not regress any existing feature.
-   [ ] It has a clear scope and user-facing explanation.
-   [ ] It has stable identifiers and documented data structures where
    needed.
-   [ ] It handles timeouts, missing data, invalid responses, and
    provider outages.
-   [ ] It has unit and integration tests appropriate to its behavior.
-   [ ] It respects authentication, plan checks, rate limits, and
    permissions.
-   [ ] It includes evidence and data-source disclosure.
-   [ ] It is included in relevant exports only after those exports are
    tested.
-   [ ] It is documented in the product guide and release notes.
-   [ ] It is enabled only for the intended users and plans.
-   [ ] Existing checks, scores, plans, and workflows remain unchanged.

------------------------------------------------------------------------

## 21. Explicit exclusions

This document does not authorize:

-   Replacing or removing any current Crawlvane feature.
-   Rewriting the existing 49 documented checks.
-   Changing current check logic, weights, severity, or scoring formula.
-   Changing current plan names, prices, limits, or entitlements.
-   Replacing the existing crawler, report, monitoring, authentication,
    billing, or hosting architecture.
-   Claiming provider integrations or data sources are available before
    they are implemented.
-   Claiming AI visibility results are exhaustive or guaranteed.
-   Automatically editing or publishing customer website content without
    explicit user approval.

**Guiding principle:** Extend Crawlvane by adding new layers of
intelligence and workflow around the existing product. Preserve the
current product as the stable foundation.
