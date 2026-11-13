import type { Metadata } from "next";
import DocPage from "@/components/DocPage";
import { BRAND } from "@/lib/brand";
import { LIMITS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${BRAND.name} collects when you run an audit or use a free tool, what we share with other services, and how to ask us to delete your data.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-11-12";

const body = `
${BRAND.name} ("we") is a website audit. This page explains what happens to your data when you use ${BRAND.host}. The short version: we collect as little as we can, we don't use tracking cookies, and we don't sell data.

## Who is responsible for your data

${BRAND.legalName ? `${BRAND.name} is run by ${BRAND.legalName}${BRAND.legalAddress ? `, ${BRAND.legalAddress}` : ""}.` : `${BRAND.name} is responsible for the data described on this page.`} ${BRAND.privacyEmail ? `For anything about your data, email [${BRAND.privacyEmail}](mailto:${BRAND.privacyEmail}) or use our [contact form](${BRAND.contactUrl}).` : `For anything about your data, use our [contact form](${BRAND.contactUrl}).`}

## What we collect

**Websites you check.** When you run an audit or a tool, we receive the web address you enter. Our server then visits that public website, reads its pages, robots.txt, sitemap and llms.txt, and works out the results.

**Page checks.** A single page check is processed and returned to your browser. We don't save the full result on our server. We use your browser's local storage (not cookies) to keep a short history of the pages you checked, with scores and the issues you marked as fixed, so it can show before-and-after results. It never leaves your device, and you can clear it by clearing this site's data in your browser.

**Forms.** When you join the waitlist, ask us to fix your site or use the contact form, we store your email address, what you wrote, the website (if you gave one) and the page you sent it from, so we can reply. The "How does AI describe my business?" tool asks for your email too, and any free tool can email you its result if you ask. We store your email with the tool and the website you checked, send the result once, and may email you related tips, with an unsubscribe link in every email.

**Newsletter.** If you subscribe, we store your email address, the page you signed up from and the date, so we can send you SEO and AI search tips. Every email has an unsubscribe link.

**Full site reports.** A full site report is saved on our server for ${LIMITS.reportTtlDays} days so it can run in the background and so you can open or share it by its link. Reports run by a team on a paid plan are kept for ${LIMITS.paidReportTtlDays} days. Anyone with the link can view the report. It contains information about the website, not about you.

**Monitoring and email (when available).** If you sign up for monitoring or updates, we store your email address, the website and the schedule. Every email has a link to stop it and delete the monitor.

**Your network address.** We use your IP address in memory to limit how many checks one network can run per hour. It isn't written to our database and is forgotten within about an hour. Our hosting provider may keep standard server logs, which include IP addresses, for security and troubleshooting.

**Usage statistics.** When a check or tool runs, we record the website's domain name and the page's path (never anything after a ? in the address), which tool ran, the scores, which checks failed and the date. A full site report records this for each page it crawls. We don't record your IP address or email with it, or anything else that links it to you. We use it to improve the product and to publish overall totals, never a list of the sites people checked.

**Widgets on other websites.** Some agencies show our audit on their own website. If you use it, the agency decides why your details are collected and is responsible for them, and we process them for the agency. We store your email address, your name (if given), the website you checked and its score, send them to that agency by email or webhook, and delete our copy after 12 months. For anything about how the agency uses your details, contact the agency.

**Link preview tool.** This tool shows images straight from the website you check, so that website can see your IP address.

**App store checker.** When you check an app, we send the app link, ID or name you entered and the country to Apple (for the App Store) or SerpApi (for Google Play) to read the public store listing. We record the store, the app, the country, its score and which checks failed, with nothing about you. App icons load straight from Apple's or Google's servers, so they can see your IP address.

**Accounts.** If you sign in, we store your email address and your team, the sites you save, their score history (scores, failing checks and AI crawler access), which teammate each issue is assigned to, and links to the reports you run. Sign-in uses a one-time code or link we email you, or your Google, Microsoft or GitHub account if you choose one, handled by Supabase, so there's no password. If you use one of those accounts, that company gives us your email address and name, and Google and GitHub also give a profile picture link (GitHub adds your username); Supabase stores these with your account. Signing in sets a cookie that keeps you signed in; it's needed for the account to work and isn't used for tracking. You can change your email, download everything we hold about you and your team as a file, or delete your account from the dashboard. If you're the last member of a team, deleting your account deletes the team and everything in it.

**Teams.** When a team owner invites someone, we store that person's email address, their role and who invited them, and email them a link. The invite is deleted after 14 days, whether or not it was used. Everyone on a team can see the other members' email addresses.

**Dashboard monitoring.** If your team turns on weekly checks, app tracking or AI visibility tracking, we store the websites, apps and competitor apps you chose, their results over time, and for AI visibility the questions asked, short excerpts of the answers, and whether each answer describes your brand positively, neutrally or negatively. Alerts about changes are shown in the dashboard and emailed to the team's owners or the address you chose. Alerts are deleted after 180 days.

**Scheduled client reports.** If your team schedules a monthly report, we store the email address it goes to and send that person a link to the report each month. Remove the schedule in the dashboard to stop it.

**API keys.** If your team creates a key for our API, we store its name, its first characters, a one-way fingerprint of it (never the key itself) and how often it's used. Audits run with a key of your team's are added to your saved sites' history.

**Google Search Console and Analytics.** If a team owner connects Google, we store the Google account's email address and an encrypted token that lets us read (never change) Search Console and Google Analytics data, plus which property belongs to each saved site. When you look at a site's search data, we fetch clicks, impressions, top searches, top pages and visits by source for the last 28 days from Google and show them; we don't store that data. Disconnecting deletes the token and revokes our access at Google.

**GitHub pull requests.** If you open a pull request with your fixes, the GitHub token you paste is used for that one request to create a branch, add the fix files and open the pull request, and is never stored.

**Agency tools.** An agency team can save a name, logo and colour for its client reports, and a domain of its own for report links. To connect the domain we check its public DNS records. Audit widgets an agency creates are stored with the settings it chose, and the leads they collect are described under "Widgets on other websites". Deleting a widget deletes its leads.

**Payments.** Paid plans and credit packs are handled by Stripe. We send Stripe your email address and your team's ID. You enter card details on Stripe's page, and we never see or store them. We store your Stripe customer and subscription IDs, your plan, its status and renewal date, any add-ons (extra seats or sites), the credits you've bought and how much you've used this month. If you buy a one-off report before signing in, Stripe collects your email address and payment on its page, and we keep the payment's ID and the website address you paid for, so we can add the report to your account once you sign in.

**Referrals.** Each team has a referral link. If you open someone's link, your browser keeps the referral code in local storage (not a cookie) for up to 30 days, and after you sign up we record which team referred yours, so they can get their reward. When a team you referred starts paying, we record that too, and add one month's credit to your Stripe account.

**Tools that run in your browser.** The schema generator and the robots.txt builder work in your browser. What you type there isn't sent to us.

## What we don't do

- No advertising or tracking cookies. The only cookies are the ones that keep you signed in and remember which team you're viewing. If we measure visits, we use Plausible Analytics, which sets no cookies and doesn't collect personal data
- No selling or renting of data
- No passwords: you sign in with an emailed code or link, or a Google, Microsoft or GitHub account

## Services that receive data

Some features need another service. They receive only what the feature needs:

| Service | When | What they receive |
|---|---|---|
| Google PageSpeed Insights | Speed test and screenshots | The URL being tested |
| Anthropic (Claude) | AI fix plan, AI page helpers, the AI free tools, AI research and AI app features, when you use them; AI visibility tracking and its content briefs | The URL and a summary of the audit findings; for the page helpers and AI free tools, the page's title, headings and an excerpt of its text; for AI visibility tracking, excerpts of AI answers that mention your brand |
| Google (sign-in) | Only if you choose "Continue with Google" | The sign-in request. Google tells us your email address, name and profile picture link |
| Microsoft (sign-in) | Only if you choose "Continue with Microsoft" | The sign-in request. Microsoft tells us your email address and name |
| GitHub (sign-in) | Only if you choose "Continue with GitHub" | The sign-in request. GitHub tells us your email address, name, username and profile picture link |
| Our email provider | Sign-in codes and links, alerts, trial and plan-limit reminders, team invites, scheduled reports and replies | The recipient's email address and the message |
| Stripe | When you buy a plan, report, credit pack or add-on, or manage billing | Your email address and your team's ID (none for a one-off report bought before signing in). Card details go straight to Stripe |
| Google (Search Console and Analytics) | Only if a team owner connects Google | The connection token, and requests for your sites' search and visit data |
| GitHub | Only when you open a pull request with your fixes | The fix files and the pull request text, sent to the repository you chose |
| Your team's webhook | Only if your team sets one | Alert titles and details, and the address, scores and link of each finished full report, sent to the address you chose |
| Slack | Only if your team connects a Slack channel | Alert titles and details for your team's sites and apps, sent to the channel you chose |
| Plausible Analytics (if enabled) | Page views and events such as "audit started" | The page address, referrer, browser type and country, without cookies or IP storage |
| Our hosting provider | Always | Requests to this site, as with any website |
| Supabase (database and sign-in) | When you send a form, subscribe, sign in, or save a report, site or monitor | What you sent us, stored in our database |
| OpenAI, Perplexity and Google Gemini | When the AI visibility test or AI visibility tracking is on | Questions about the website being checked |
| Browserless | Only when JavaScript rendering is on | The URL being checked |
| The agency that runs a widget | Only when you use an agency's widget | Your email address, name, the website and its results |
| The website you check | Only in the link preview tool | Your IP address, when its images load |
| Apple (App Store) | When you check an App Store app | The app link, ID or name and the country |
| SerpApi (Google Play data) | When you check a Google Play app | The app link, ID or name and the country |

Each service handles data under its own privacy policy.

## Why we use your data

| Purpose | Legal basis (GDPR) |
|---|---|
| Running the audits and tools you ask for, your account, team and paid plan | Providing the service you request (Art. 6(1)(b)) |
| Keeping payment records | Our legal obligations, such as tax and accounting rules (Art. 6(1)(c)) |
| Replying to forms and quote requests | Steps you ask us to take (Art. 6(1)(b)) |
| Waitlist and newsletter emails | Your consent (Art. 6(1)(a)), which you can withdraw at any time |
| Rate limits, security, preventing abuse and server logs | Our legitimate interest in keeping the service safe and available (Art. 6(1)(f)) |
| Usage statistics and cookie-free analytics | Our legitimate interest in understanding and improving the product (Art. 6(1)(f)) |
| Agency widgets | Processing on the agency's behalf (Art. 28). The agency is responsible for the legal basis |

## Where data is processed

Some services we use are based in the United States, including Anthropic, Google, Microsoft, GitHub, Apple, SerpApi, Slack and Stripe, and OpenAI, Perplexity and Browserless when those features are on. Our hosting and database providers may also process data outside your country. Where the law requires a safeguard for these transfers, we rely on the EU-US Data Privacy Framework if the provider is certified, or on Standard Contractual Clauses (and the UK Addendum) if not.

## How long we keep data

Full site reports are deleted automatically after ${LIMITS.reportTtlDays} days, or after ${LIMITS.paidReportTtlDays} days when run by a team on a paid plan, or sooner if you ask. Monitors are kept until you stop them using the link in any alert email. Messages and waitlist sign-ups are kept until you ask us to delete them, and for no more than 24 months. Newsletter sign-ups are kept until you unsubscribe, which deletes them. Usage statistics, app check statistics and our copy of widget leads are deleted after 12 months. Account data, score history and tracking results are kept until you remove them or delete your account. Team invites are deleted after 14 days and alerts after 180 days. Stripe keeps payment records for as long as tax and accounting rules require. Cached results for the free tools are kept in memory for about 15 minutes.

## Your choices and rights

You can ask us what we hold about you, ask us to correct or delete it, or ask us to stop emails at any time. Depending on where you live (for example under the GDPR in the UK and EU, or under US state laws such as the CCPA), you also have the right to restrict or object to how we use your data, to receive a copy in a portable format, to withdraw consent, and to complain to your data protection authority.

To make a request, [contact us](${BRAND.contactUrl}). Include the report link or email address involved so we can find it. We reply within one month, and tell you if a complex request needs longer.

## Children

${BRAND.name} is a business tool and isn't meant for children under 16.

## Changes

If we change how we handle data, we'll update this page and the date at the top.
`;

export default function Page() {
  return <DocPage kicker="Legal" title="Privacy policy" dek={`What ${BRAND.name} collects, why, and what you can ask us to do.`} updated={UPDATED} body={body} />;
}
