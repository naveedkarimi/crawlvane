import type { Metadata } from "next";
import DocPage from "@/components/DocPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The rules for using ${BRAND.name}'s free audit and tools: what you can check, fair use, and the limits of what the scores mean.`,
  alternates: { canonical: "/terms" },
};

const UPDATED = "2026-11-06";

const body = `
These terms apply when you use ${BRAND.host}, including the audit, the free tools and the blog. By using the site you agree to them.

## The service

${BRAND.name} checks public websites for search engine, answer engine and AI search readiness and suggests fixes. It's free during launch. Paid plans, when they arrive, will have their own terms that you'll see before paying.

## What the results mean

Scores and checks are readiness signals based on public information and published guidance. They are **not** a promise of rankings, traffic, AI citations or sales. Search engines and AI companies change their systems often and don't publish exactly how they work.

Generated files and code (robots.txt, llms.txt, schema and others) are suggestions. Review them before you put them on a website, and keep a backup of the original. You're responsible for changes you make to your site.

## Fair use

You agree not to:

- Use ${BRAND.name} to overload, attack or disrupt any website, including running checks in bulk or in a loop
- Get around our rate limits or other protections, or use automated scripts against the site without our permission
- Use the AI Bot Checker on a site you don't own or manage. It sends requests with search and AI crawler user-agents, and some site owners consider that unwelcome on their site
- Use the service for anything illegal

We may limit or block access that breaks these rules or puts the service at risk.

## Shared reports

Anyone with a full site report's link can view it. Don't share a link you want to keep private. Ask us if you'd like a report removed.

## Our content

The site's design, text, code and blog posts belong to ${BRAND.name} unless stated otherwise. You may quote short passages with a link back. Photos and open-source software are used under their own licences; see [Credits](/credits).

Product and company names on this site, such as Google, ChatGPT, Claude, Perplexity, Gemini and Bing, are trademarks of their owners. ${BRAND.name} is independent and isn't affiliated with or endorsed by them.

## No warranty

The service is provided "as is" and "as available". We work to keep it accurate and online but can't guarantee that it's error-free or always available.

## Limitation of liability

As far as the law allows, we aren't liable for indirect or consequential losses, or for lost profits, revenue, traffic or data, arising from your use of ${BRAND.name}. Nothing in these terms limits liability that can't legally be limited.

## Changes

We may update these terms. The date at the top shows the latest version. If a change is significant, we'll say so on the site.

## Contact

Questions about these terms? [Contact us](${BRAND.contactUrl}).
`;

export default function Page() {
  return <DocPage title="Terms of use" dek={`The rules for using ${BRAND.name}, in plain English.`} updated={UPDATED} body={body} />;
}
