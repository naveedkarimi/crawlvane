import type { Metadata } from "next";
import DocPage from "@/components/DocPage";
import { BRAND } from "@/lib/brand";
import { LIMITS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${BRAND.name} collects when you run an audit or use a free tool, what we share with other services, and how to ask us to delete your data.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-11-08";

const body = `
${BRAND.name} ("we") is a website audit. This page explains what happens to your data when you use ${BRAND.host}. The short version: we collect as little as we can, we don't use tracking cookies, and we don't sell data.

## Who is responsible for your data

${BRAND.legalName ? `${BRAND.name} is run by ${BRAND.legalName}${BRAND.legalAddress ? `, ${BRAND.legalAddress}` : ""}.` : `${BRAND.name} is responsible for the data described on this page.`} ${BRAND.privacyEmail ? `For anything about your data, email [${BRAND.privacyEmail}](mailto:${BRAND.privacyEmail}) or use our [contact form](${BRAND.contactUrl}).` : `For anything about your data, use our [contact form](${BRAND.contactUrl}).`}

## What we collect

**Websites you check.** When you run an audit or a tool, we receive the web address you enter. Our server then visits that public website, reads its pages, robots.txt, sitemap and llms.txt, and works out the results.

**Page checks.** A single page check is processed and returned to your browser. We don't save the full result on our server. We use your browser's local storage (not cookies) to keep a short history of the pages you checked, with scores and the issues you marked as fixed, so it can show before-and-after results. It never leaves your device, and you can clear it by clearing this site's data in your browser.

**Forms.** When you join the waitlist, ask us to fix your site or use the contact form, we store your email address, what you wrote, the website (if you gave one) and the page you sent it from, so we can reply.

**Newsletter.** If you subscribe, we store your email address, the page you signed up from and the date, so we can send you SEO and AI search tips. Every email has an unsubscribe link.

**Full site reports.** A full site report is saved on our server for ${LIMITS.reportTtlDays} days so it can run in the background and so you can open or share it by its link. Anyone with the link can view the report. It contains information about the website, not about you.

**Monitoring and email (when available).** If you sign up for monitoring or updates, we store your email address, the website and the schedule. Every email has a link to stop it and delete the monitor.

**Your network address.** We use your IP address in memory to limit how many checks one network can run per hour. It isn't written to our database and is forgotten within about an hour. Our hosting provider may keep standard server logs, which include IP addresses, for security and troubleshooting.

**Usage statistics.** When a check or tool runs, we record the website's domain name and the page's path (never anything after a ? in the address), which tool ran, the scores, which checks failed and the date. A full site report records this for each page it crawls. We don't record your IP address or email with it, or anything else that links it to you. We use it to improve the product and to publish overall totals, never a list of the sites people checked.

**Widgets on other websites.** Some agencies show our audit on their own website. If you use it, the agency decides why your details are collected and is responsible for them, and we process them for the agency. We store your email address, your name (if given), the website you checked and its score, send them to that agency by email or webhook, and delete our copy after 12 months. For anything about how the agency uses your details, contact the agency.

**Link preview tool.** This tool shows images straight from the website you check, so that website can see your IP address.

**Tools that run in your browser.** The schema generator and the robots.txt builder work in your browser. What you type there isn't sent to us.

## What we don't do

- No advertising or tracking cookies. If we measure visits, we use Plausible Analytics, which sets no cookies and doesn't collect personal data
- No selling or renting of data
- No accounts or passwords yet

## Services that receive data

Some features need another service. They receive only what the feature needs:

| Service | When | What they receive |
|---|---|---|
| Google PageSpeed Insights | Speed test and screenshots | The URL being tested |
| Anthropic (Claude) | AI fix plan and AI research features, when you use them | The URL and a summary of the audit findings |
| Our email provider | Monitoring alerts and replies, when available | Your email address and the message |
| Plausible Analytics (if enabled) | Page views and events such as "audit started" | The page address, referrer, browser type and country, without cookies or IP storage |
| Our hosting provider | Always | Requests to this site, as with any website |
| Supabase (database) | When you send a form, subscribe, or save a report or monitor | What you sent us, stored in our database |
| OpenAI, Perplexity and Google Gemini | Only when the AI visibility test is on | Questions about the website being checked |
| Browserless | Only when JavaScript rendering is on | The URL being checked |
| The agency that runs a widget | Only when you use an agency's widget | Your email address, name, the website and its results |
| The website you check | Only in the link preview tool | Your IP address, when its images load |

Each service handles data under its own privacy policy.

## Why we use your data

| Purpose | Legal basis (GDPR) |
|---|---|
| Running the audits and tools you ask for | Providing the service you request (Art. 6(1)(b)) |
| Replying to forms and quote requests | Steps you ask us to take (Art. 6(1)(b)) |
| Waitlist and newsletter emails | Your consent (Art. 6(1)(a)), which you can withdraw at any time |
| Rate limits, security, preventing abuse and server logs | Our legitimate interest in keeping the service safe and available (Art. 6(1)(f)) |
| Usage statistics and cookie-free analytics | Our legitimate interest in understanding and improving the product (Art. 6(1)(f)) |
| Agency widgets | Processing on the agency's behalf (Art. 28). The agency is responsible for the legal basis |

## Where data is processed

Some services we use are based in the United States, including Anthropic and Google, and OpenAI, Perplexity and Browserless when those features are on. Our hosting and database providers may also process data outside your country. Where the law requires a safeguard for these transfers, we rely on the EU-US Data Privacy Framework if the provider is certified, or on Standard Contractual Clauses (and the UK Addendum) if not.

## How long we keep data

Full site reports are deleted automatically after ${LIMITS.reportTtlDays} days, or sooner if you ask. Monitors are kept until you stop them using the link in any alert email. Messages and waitlist sign-ups are kept until you ask us to delete them, and for no more than 24 months. Newsletter sign-ups are kept until you unsubscribe, which deletes them. Usage statistics and our copy of widget leads are deleted after 12 months. Cached results for the free tools are kept in memory for about 15 minutes.

## Your choices and rights

You can ask us what we hold about you, ask us to correct or delete it, or ask us to stop emails at any time. Depending on where you live (for example under the GDPR in the UK and EU, or under US state laws such as the CCPA), you also have the right to restrict or object to how we use your data, to receive a copy in a portable format, to withdraw consent, and to complain to your data protection authority.

To make a request, [contact us](${BRAND.contactUrl}). Include the report link or email address involved so we can find it. We reply within one month, and tell you if a complex request needs longer.

## Children

${BRAND.name} is a business tool and isn't meant for children under 16.

## Changes

If we change how we handle data, we'll update this page and the date at the top. When accounts and paid plans launch, this policy will be updated before they go live.
`;

export default function Page() {
  return <DocPage title="Privacy policy" dek={`What ${BRAND.name} collects, why, and what you can ask us to do.`} updated={UPDATED} body={body} />;
}
