# Privacy & Legal Audit Report

**App:** Findable (SEO, AEO and AI search audit), working domain crawlvane.com
**Date:** 2026-11-06
**Documents audited:** Privacy policy (`app/privacy/page.tsx`, updated 2026-11-06), Terms of use (`app/terms/page.tsx`, updated 2026-11-06), Accessibility statement (`app/accessibility/page.tsx`). No cookie policy or DPA exists.
**Method:** code analysis of this repository (API routes, `lib/` data stores, client storage, third-party calls) compared with what the documents claim.
**Jurisdictions:** GDPR (EU) and UK GDPR as the baseline, plus US state privacy laws such as the CCPA, because the policy names them.

> This audit is not legal advice and doesn't replace a qualified lawyer. Thresholds such as the CCPA's apply to the business, and a lawyer should confirm which laws apply to you.

---

## Executive summary

The policy is unusually honest and readable for a launch-stage product: it collects little, and most of its claims match the code. The serious gaps all come from features added after it was written:
- The **agency widget**: visitor emails go to third-party agencies and are stored without a time limit.
- **Retention promises** that depend on a cron job that isn't scheduled yet.
- **Missing GDPR basics**: legal bases, international transfers, a postal or email identity for the controller, and a response time for requests.

The terms also contradict the new bulk audit and have no API or agency terms.

---

## App data reality (from the code)

### Data collected and stored

| Data | Where | Personal? | Retention in code |
|---|---|---|---|
| URL of the site being checked | Request body. Stored only for full reports (`data/reports/`), badges (`data/badges/`, host and score) and widget leads | Rarely: a URL can identify a sole trader | Reports: deleted after `REPORT_TTL_DAYS` (30) **only when `/api/cron` runs**. Badges: 60 days via cron |
| Waitlist, "fix it for me" and contact forms: email, optional name, optional website, message, page path | `data/leads/{id}.json` (`lib/leads.ts`) | Yes | Pruned after 730 days by cron |
| **Widget leads: visitor email, optional name, website, score** | `data/widget-leads/{id}.json` (`lib/widgets.ts`) | Yes | **No deletion in code** |
| Widget configs: agency name, notification email, webhook URL, logo, colour | `data/widgets/` | Yes (the agency contact's email) | No deletion |
| Monitoring: email, URL, schedule, secret token (feature off by default) | `data/monitors/` (`lib/monitor.ts`) | Yes | Until stopped |
| API keys: name of the holder, SHA-256 hash, use count, last used | `data/apikeys/` | Yes (holder's name) | Until revoked |
| AI usage: token counts per day, provider and feature | `data/usage/` | No | No deletion |
| Audit counter | `data/stats/` | No | Permanent |
| IP address | In memory for rate limits (`lib/rateLimit.ts`), via `x-forwarded-for` | Yes | About 1 hour, not written to disk |
| Browser `localStorage`: last 10 runs per page (scores, failing check ids) and marked-fixed ids (`findable:v1:*`); admin key (`nk_admin_key`) | Visitor's browser (`lib/history.ts`, `lib/client.ts`) | Device storage (ePrivacy) | Until cleared |
| Server logs | Hosting provider (cPanel) | Yes (IP, user agent) | Host's policy |

No cookies are set. No accounts, passwords, payment data or special-category data are collected.

### Data subjects

- **Visitors** using the audit and tools.
- **Form senders.**
- **Agency widget visitors.** They are the agency's customers, so Findable acts for the agency here.
- **Agency contacts.**
- **API key holders.**
- **Indirectly, the owners of checked websites.** We fetch their public pages, and the AI bot checker sends requests with crawler user-agents.

### Third parties and processors found in code

| Service | Code | Data sent | On by default? |
|---|---|---|---|
| Google PageSpeed Insights (US) | `lib/pagespeed.ts` | URL | Yes, when used |
| Anthropic Claude API (US) | `lib/ai/anthropic.ts` (fix plan, research, social posts, prompts, visibility) | URL, audit findings and page text summaries | Fix plan yes (with key); others behind flags |
| OpenAI, Perplexity, Google Gemini APIs (US) | `lib/ai/visibility.ts` | Brand name, domain, buyer questions | No (`FEATURE_AI_VISIBILITY`) |
| Browserless (headless Chrome) | `lib/render.ts` | URL being checked | No (`FEATURE_JS_RENDER`) |
| SMTP mailbox (cPanel) via nodemailer | `lib/mail.ts` | Lead and monitor emails, message content | Only if configured |
| Plausible Analytics (EU) | `app/layout.tsx`, `lib/track.ts` | Page views and events (`Audit started`, `Report finished`, `Fix requested` and others), no personal props | Only if `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set |
| **Agency webhook URLs and agency email addresses** | `lib/widgets.ts` | Widget visitor's email, name, website and score | Per widget |
| Hosting provider (cPanel, location not documented) | Everything | All requests | Yes |
| Third-party websites (images and favicons) | Link preview tool renders `og:image` and favicon `<img>` directly in the visitor's browser | **Visitor's IP and user agent go to the checked site's image host** | Yes, in that tool |

Fonts are self-hosted through `next/font`, so there are no runtime Google Fonts calls. Blog images are local.

---

## 🔴 Critical gaps (legal risk)

### 1. The agency widget isn't disclosed, and its leads are kept forever

- **Affects:** the privacy policy and the code (`lib/widgets.ts`).
- **Reality:**
  - People who use an agency's embedded widget give their email, name and website to Findable.
  - Findable stores them and forwards them to the agency by email and webhook.
  - The policy never mentions widgets, agencies or webhooks.
  - Nothing deletes `data/widget-leads/`.
- **Why it matters:**
  - Under GDPR the agency is the controller and Findable is its processor (Art. 28). That needs a processor agreement with each agency and a policy section that explains the role.
  - Storing data with no retention limit breaks the storage-limitation principle (Art. 5(1)(e)).
  - The widget's note ("{agency} will receive your email and results") is good, but it doesn't link to any notice from Findable.
- **Fix:**
  - Add a "Widgets on other websites" section (draft below).
  - Prune `widget-leads` after a set period, for example 12 months, in the cron job.
  - Add a link to the agency's privacy policy, plus ours, under the widget form.
  - Before onboarding agencies, sign a short DPA and Agency terms with each one.

> **Draft:** "**Widgets on other websites.** Some agencies show our audit on their own website. If you use it, the agency decides why your details are collected and is responsible for them; we process them for the agency. We store your email address, name (if given), the website you checked and its score, send them to that agency by email or webhook, and delete our copy after 12 months. For anything about how the agency uses your details, contact the agency."

### 2. The retention promises depend on a cron job that isn't running

- **Affects:** the privacy policy ("Full site reports are deleted automatically after 30 days"; "no more than 24 months").
- **Reality:** report, lead and badge deletion only happens inside `GET /api/cron`, which needs `CRON_SECRET` and a scheduled job. TODO.md lists "Schedule `/api/cron`" as not done.
- **Why it matters:** an inaccurate retention statement breaks transparency (Art. 13(2)(a)) and storage limitation (Art. 5(1)(e)).
- **Fix:** schedule the cron job before launch. Also run the pruning on start-up or once a day from a request, so deletion doesn't depend only on the cron.

### 3. No legal basis for each kind of processing

- **Affects:** the privacy policy.
- **Reality:** none is stated anywhere.
- **Why it matters:** GDPR Art. 13(1)(c) requires a legal basis for each purpose, and Art. 13(1)(d) requires the legitimate interest to be named when you rely on it.
- **Fix:** add a table.

> | Purpose | Legal basis |
> |---|---|
> | Running audits and tools you ask for | Performing the service you request (Art. 6(1)(b)) |
> | Replying to forms and fix requests | Steps you ask us to take before a contract (Art. 6(1)(b)) |
> | Waitlist email | Your consent (Art. 6(1)(a)); withdraw any time |
> | Rate limits, security, abuse prevention, server logs | Our legitimate interest in keeping the service available and safe (Art. 6(1)(f)) |
> | Cookie-free usage statistics (Plausible) | Our legitimate interest in understanding which features are used (Art. 6(1)(f)) |
> | Agency widget | Processing on the agency's behalf (Art. 28); the agency is responsible for the basis |

### 4. International transfers aren't disclosed

- **Affects:** the privacy policy.
- **Reality:** Anthropic and Google PageSpeed are US services. OpenAI, Perplexity, Gemini and Browserless are also US when switched on. The hosting location isn't stated.
- **Why it matters:** GDPR Art. 13(1)(f) and Chapter V require naming transfers outside the UK and EEA and the safeguard used.
- **Fix:**
  - Add a section naming the US as a destination.
  - Name the safeguard: the EU-US Data Privacy Framework where the provider is certified, otherwise the Standard Contractual Clauses (or the UK IDTA/Addendum).
  - Say where the hosting is.
  - Check each provider's certification before publishing.

### 5. No identity or address for the controller, and requests only through a form

- **Affects:** privacy policy and terms.
- **Reality:** the controller is a named individual, and the only contact is `/contact`, a web form.
- **Why it matters:** Art. 13(1)(a) requires the controller's identity and contact details. Many authorities expect a postal or email address, and the form only works while the site is up.
- **Fix:** name the legal entity or sole trader, give a country and postal address (or a registered address service), and a privacy email such as `privacy@yourdomain`.

---

## 🟡 Important gaps (compliance risk)

### 6. The terms forbid what the product now offers

- **Affects:** the terms ("Fair use: … running checks in bulk or in a loop").
- **Reality:** `/bulk` (20 URLs at once) and the public API (`/api/v1/audit`) exist.
- **Fix:** reword to "running more checks than the bulk tool or your API key allows, or checking sites in a way that overloads them". Add an API section: keys are personal, limits apply, results aren't stored, and keys can be revoked.

### 7. No agency or widget terms

- **Affects:** the terms.
- **Reality:** agencies get a widget that collects their visitors' personal data. Nothing covers:
  - their duty to have their own privacy notice;
  - the lawful basis for collecting visitors' data;
  - what Findable does as their processor.
- **Fix:** write Agency terms, including a short DPA (Art. 28(3) points a–h), and require acceptance before a widget is created.

### 8. Browser storage not described as such (ePrivacy)

- **Affects:** the privacy policy.
- **Reality:** the policy mentions the "short history" in the browser but not that it uses `localStorage`, which counts as device storage under ePrivacy Art. 5(3). The admin key in `localStorage` only affects the admin.
- **Why it matters:** history kept in the browser is arguably part of the service the visitor asked for, but some regulators read the "strictly necessary" exemption narrowly.
- **Fix:**
  - Name it: "We use your browser's local storage (not cookies) to keep your last 10 checks per page and the issues you marked as fixed. It stays on your device."
  - Optionally add a "Clear my history" button on the report.

### 9. The list of processors is incomplete

- **Affects:** the policy's "Services that receive data" table.
- **Missing from the table:**
  - OpenAI, Perplexity, Google Gemini (AI visibility test);
  - Browserless (JavaScript rendering);
  - agency webhooks;
  - third-party image hosts in the link preview tool.
- **Fix:** add rows, each marked "only when this feature is on".

### 10. The link preview tool exposes visitors' IP addresses to third parties

- **Affects:** the privacy policy and the code (`app/tools/link-preview-checker/PreviewTool.tsx`).
- **Reality:** the share image and favicon load directly from the checked site, so that site's server sees the visitor's IP. `referrerPolicy="no-referrer"` hides the page address but not the IP.
- **Fix:** either proxy the images through our server (the server already fetches the image to check it), or disclose it: "The link preview tool shows images straight from the website you check, so that website can see your IP address."

### 11. No response time for requests, and rights not named individually

- **Affects:** the privacy policy.
- **Reality:** the policy covers access, correction, deletion and stopping emails, and mentions "further rights". It doesn't name restriction, portability or objection (Art. 18, 20, 21), or say how quickly we reply.
- **Fix:** list them and add "We reply within one month (Art. 12(3)), and tell you if we need longer for a complex request."

### 12. No breach procedure

- **Affects:** the privacy policy and internal process.
- **Reality:** not mentioned. Leads are plain JSON files on shared hosting.
- **Why it matters:** Art. 33 requires notifying the authority within 72 hours, and Art. 34 requires telling affected people when the risk is high.
- **Fix:**
  - Write an internal one-page breach plan.
  - Optionally add a line to the policy: "If a security incident affects your data, we will tell you and the regulator where the law requires it."
  - Restrict permissions on the `data/` folder (chmod 700) and keep it outside `public_html` (DEPLOY-CPANEL.md already does this).

### 13. Terms have no governing law or provider details

- **Affects:** the terms.
- **Reality:** no governing law, place of jurisdiction or provider address. TODO.md already lists this.
- **Fix:** add after the lawyer review.

---

## 🟢 Minor issues (best practice)

| # | Issue | Document | Fix |
|---|---|---|---|
| 14 | "Cached results … about 15 minutes": the code caches page tools and site tools for 10 minutes, and PageSpeed, bot test and llms.txt for 15 | Privacy | "up to 15 minutes" |
| 15 | "The schema generator and the robots.txt builder work in your browser" leaves out the GA4 regex builder and the log analyzer. For the log analyzer this matters, because logs contain other people's IP addresses | Privacy | List all four and say log files are never uploaded |
| 16 | "No accounts or passwords yet": API keys now exist (holder name, hashed key) | Privacy | Mention API keys under "What we collect" |
| 17 | The badge stores the checked host and score for 60 days, and the embed image request reveals viewers' IPs to our server | Privacy | One line under "Websites you check" |
| 18 | The policy's opening "short version" says "we don't use … analytics", but the body says Plausible may be used | Privacy | "we don't use tracking cookies, and analytics, if on, is cookie-free" |
| 19 | The AI fix plan sends "the URL and a summary of the audit findings"; the code also sends facts such as title, description and headings | Privacy | "the URL, the page's title, headings and the audit findings" |
| 20 | No plain-language "at a glance" box | Privacy | Optional summary table at the top |
| 21 | The accessibility statement has no contact other than the form | Accessibility | Add the privacy or contact email once you have one |

---

## GDPR checklist

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Controller identity and contact | ⚠️ | Name only, contact form only (gap 5) |
| 2 | DPO contact | N/A | Not required at this scale; say "We haven't appointed a DPO" |
| 3 | Purposes of processing | ✅ | Clear per feature |
| 4 | Legal basis per purpose | ❌ | Gap 3 |
| 5 | Legitimate interests stated | ❌ | Gap 3 |
| 6 | Recipients | ⚠️ | Missing AI engines, Browserless, agencies, image hosts (gaps 1, 9, 10) |
| 7 | Third-country transfers and safeguards | ❌ | Gap 4 |
| 8 | Retention periods | ⚠️ | Stated but enforced only by cron; widget leads unlimited (gaps 1, 2) |
| 9 | Source of data not collected from the person | ⚠️ | Widget leads come through agencies (gap 1) |
| 10 | Right of access | ✅ | |
| 11 | Rectification | ✅ | |
| 12 | Erasure | ✅ | |
| 13 | Restriction | ⚠️ | Covered only as "further rights" |
| 14 | Portability | ⚠️ | Same |
| 15 | Objection | ⚠️ | Same; important when relying on legitimate interest |
| 16 | Automated decisions | N/A | Scores are about websites, not people |
| 17 | How to exercise rights | ⚠️ | Form only |
| 18 | Response time | ❌ | Gap 11 |
| 19 | Complaint to an authority | ✅ | |
| 20 | Consent freely given and specific | ✅ | Waitlist is opt-in and separate |
| 21 | Withdrawing consent as easy as giving it | ⚠️ | No unsubscribe flow for the waitlist yet; add a link in the launch email |
| 22 | No bundled consent | ✅ | |
| 23 | Minors | ✅ | Under-16 statement |
| 24 | Special-category data | N/A | None |
| 25 | Art. 9 basis | N/A | |
| 26 | Privacy by design | ✅ | Minimal collection, browser-only tools, hashed API keys, no cookies |
| 27 | Records of processing (internal) | ❌ | Create one; this report's tables are a start |
| 28 | Breach procedure | ❌ | Gap 12 |
| 29 | DPAs with processors | ❌ | Accept Anthropic's, Google's and the host's DPAs; write one for agencies (gap 7) |
| 30 | Security measures | ⚠️ | Not described; files are plain JSON |
| 31 | Cookie categories | ✅ | No cookies; local storage to be named (gap 8) |
| 32 | Consent for non-essential cookies | ✅ | None used |
| 33 | Withdrawable cookie consent | N/A | |
| 34 | Third-party trackers disclosed | ✅ | Plausible disclosed; image hosts not (gap 10) |
| 35 | Cookie lifetime | ⚠️ | Say local storage lasts until cleared |
| 36 | Transfer countries named | ❌ | Gap 4 |
| 37 | Transfer mechanism | ❌ | Gap 4 |
| 38 | Post-Schrems II safeguards | ❌ | Check DPF certification per provider |

### US (CCPA/CPRA and similar)

The thresholds ($25M revenue, 100k consumers, or 50% of revenue from selling data) are almost certainly not met. The policy already says data isn't sold or shared for advertising. Once you near the thresholds, add a "Your US state privacy rights" section and a "Do not sell or share" statement.

---

## Recommended next steps

1. **Before launch (code):**
   - Schedule `/api/cron` and add a deletion fallback.
   - Prune `widget-leads` (12 months).
   - Proxy or disclose link-preview images.
   - Add a "Clear my history" button.
2. **Before launch (policy):**
   - Legal bases table.
   - International transfers and hosting location.
   - Controller identity, address and privacy email.
   - Widget section.
   - Full processor list.
   - Named rights and a one-month response time.
   - Local storage wording.
   - The minor fixes 14–19.
3. **Before onboarding any agency:** Agency terms with a DPA, accepted before the widget is created; agency privacy-policy link in the widget.
4. **Terms:** bulk and API wording, API section, governing law.
5. **Internal:**
   - Record of processing activities.
   - One-page breach plan.
   - Accept DPAs from Anthropic, Google Cloud and the host.
   - Confirm each US provider's DPF status.
6. **Lawyer review** of the updated documents. Already on TODO.md.
