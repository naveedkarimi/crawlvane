import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { BRAND, contactLink } from "@/lib/brand";
import { siteLink } from "@/lib/hosts";

/** How to use the app, step by step, with screenshots. Shown in the dashboard under Help & about. */
type Shot = { src: string; alt: string; w: number; h: number; caption: string; phone?: boolean };
type Section = { id: string; title: string; intro: ReactNode; steps: ReactNode[]; shot?: Shot; tip?: ReactNode };

const dash = (tab: string) => `/dashboard?tab=${tab}`;
const EXAMPLE = "Example data from the dashboard preview.";

const sections = (ttl: number, paidTtl: number): Section[] => [
  {
    id: "page-check",
    title: "Run your first page check",
    intro: "A page check scores one page for search engines, answer engines and AI assistants. You don't need an account.",
    steps: [
      <>Go to the <a href={siteLink("/#audit")}>home page</a> and make sure <strong>Page check</strong> is selected.</>,
      <>Type the address of the page you want to check, such as <code>yourbusiness.com</code>, and choose <strong>Run audit</strong>.</>,
      <>Wait about 20 seconds. The results open on the same page.</>,
    ],
    shot: { src: "/images/guide/home.webp", alt: "The home page with the Page check and Full site report switch and the address box", w: 1440, h: 900, caption: "Start a check from the box on the home page." },
    tip: "Check the page that matters most first, usually your home page or your main service page.",
  },
  {
    id: "results",
    title: "Read the results",
    intro: "The results show where you stand and what to change, with the biggest problems first.",
    steps: [
      <><strong>Scores:</strong> an overall score from 0 to 100, plus SEO (search engines), AEO (answer engines) and GEO (AI assistants). 85 and above is good, 60 to 84 needs work, below 60 is poor.</>,
      <><strong>Failed, Warnings and Passed:</strong> choose a number to see only those checks. Fix failed checks first.</>,
      <><strong>How to fix:</strong> each problem says what's wrong and what to do in plain English.</>,
      <><strong>What AI sees:</strong> your page as people see it, next to the text AI crawlers can actually read.</>,
      <><strong>AI crawler access:</strong> which AI bots your robots.txt allows, with search bots and training bots kept apart.</>,
    ],
    shot: { src: "/images/app-product-shot.webp", alt: "Page check results with an overall score of 90, SEO 99, answers 69 and AI search 93, and the What AI sees panel", w: 1600, h: 1931, caption: "A real page check of naveedkarimi.com, November 2026." },
    tip: "Scores are readiness signals. They show what search engines and AI tools can read, not a promise of rankings or citations.",
  },
  {
    id: "account",
    title: "Create a free account",
    intro: "An account saves your sites, keeps score history and unlocks full reports, the AI fix plan and downloads.",
    steps: [
      <>Choose <strong>Sign in</strong> at the top of any page, then <strong>Create an account</strong>.</>,
      <>Sign up with an email and password, <strong>Continue with Google</strong>, or <strong>Email me a sign-in code</strong>.</>,
      <>You land on the dashboard. The <strong>Get set up</strong> list shows the next steps.</>,
    ],
    shot: { src: "/images/guide/login.webp", alt: "The log in page with email and password fields, Continue with Google and Email me a sign-in code", w: 1440, h: 900, caption: "Sign in with a password, Google or an emailed code." },
  },
  {
    id: "dashboard",
    title: "Find your way around the dashboard",
    intro: "The sidebar groups everything into three areas, with your profile at the bottom. On a phone, the main sections sit in a bar at the bottom and the rest are under More.",
    steps: [
      <><strong>Overview</strong> shows each saved site's score, its trend, recent alerts, the top fixes and AI crawler access.</>,
      <><strong>Monitor</strong>: Websites, Apps, AI visibility and Alerts.</>,
      <><strong>Work</strong>: Fixes, Reports and Keywords &amp; content.</>,
      <><strong>Account</strong>: Team, and Agency on the Agency plan. Your plan and usage are at the bottom of the sidebar.</>,
      <><strong>Your profile</strong>, at the very bottom, has Settings, Plan and billing, this guide, About, the privacy policy and terms, and Sign out.</>,
    ],
    shot: { src: "/images/guide/overview.webp", alt: "The dashboard overview with three website score cards, a score trend chart, alerts, fixes to do and an AI crawler access table", w: 1440, h: 1000, caption: `The Overview. ${EXAMPLE}` },
  },
  {
    id: "websites",
    title: "Add your websites and turn on weekly checks",
    intro: "Saved websites get a score history, a weekly check and email alerts when something changes.",
    steps: [
      <>Open <a href={dash("websites")}>Websites</a> and add your site&apos;s address.</>,
      <>Choose <strong>Check now</strong> for a first score, then turn on <strong>weekly checks</strong> and add the email address for alerts.</>,
      <>Optional: connect <strong>Search Console and GA4</strong> or <strong>Bing and IndexNow</strong> on the same page to see real search data next to your scores.</>,
      <>On the Agency plan, you can also schedule a monthly client report for each site here.</>,
    ],
    tip: "Checks of a saved site, including ones you run from New check, are added to its score history.",
  },
  {
    id: "full-report",
    title: "Run a full site report",
    intro: "A full report crawls many pages and finds the problems that repeat across your site, such as duplicate titles, broken links and thin pages.",
    steps: [
      <>Open <a href={dash("check")}>New check</a> and choose <strong>Full site report</strong>. You can pick one of your saved sites from the list.</>,
      <>Set how many pages to crawl. Your plan sets the limit.</>,
      <>Optional: add up to 3 competitors, and choose extras such as the <strong>AI fix plan</strong> or the <strong>AI visibility test</strong>. AI extras use AI credits.</>,
      <>Choose <strong>Generate full report</strong>. It takes 1 to 5 minutes, and you can watch each step as it runs.</>,
    ],
    shot: { src: "/images/guide/full-report.webp", alt: "The New check page with Full site report selected, the website box, the pages to crawl slider, competitor boxes and AI options", w: 1440, h: 900, caption: `Setting up a full site report. ${EXAMPLE}` },
  },
  {
    id: "report",
    title: "Use and share a report",
    intro: "Every full report has the same layout, whether you open it from the dashboard or from a shared link.",
    steps: [
      <><strong>Overview</strong> starts with a summary, the top priorities and, for your team&apos;s reports, what changed since your last report of the site.</>,
      <><strong>Issues</strong> lists every problem. Filter by area or result, search, and open the affected pages. <strong>Get the code</strong> jumps to the matching fix.</>,
      <><strong>Pages</strong> scores each page, with crawl coverage and other findings below. <strong>Fixes</strong> has ready-to-paste robots.txt, llms.txt, schema and head tags.</>,
      <><strong>Save as PDF</strong> makes a print-ready copy with a cover page. <strong>Copy link</strong> shares it, and <strong>Download</strong> gives Markdown, JSON or a pages CSV.</>,
      <>All your reports are listed under <a href={dash("reports")}>Reports</a>. Shared links work for {ttl} days, or {paidTtl} days on a paid plan.</>,
    ],
    shot: { src: "/images/guide/reports.webp", alt: "The Reports list with four reports, each showing the site, date, score and status", w: 1440, h: 700, caption: `The Reports list. ${EXAMPLE}` },
    tip: "Anyone with a report link can view it, so only share it with people you trust.",
  },
  {
    id: "fixes",
    title: "Work through your fixes",
    intro: "Fixes collects the problems from all your sites in one list, grouped by site and sorted by impact.",
    steps: [
      <>Open <a href={dash("fixes")}>Fixes</a>. Each issue shows its area (SEO, AEO or GEO) and its impact.</>,
      <>Set a status for each one: <strong>Open</strong>, <strong>In progress</strong> or <strong>Done</strong>. With a team, assign it to someone and add a note.</>,
      <>Choose <strong>Export for</strong> Jira, Linear or CSV to move the list into your own tools.</>,
      <>After you fix something, check the page again to confirm the score moves.</>,
    ],
    shot: { src: "/images/guide/fixes.webp", alt: "The Fixes list grouped by site, each issue with its area, impact and a View fix button, and export buttons for Jira, Linear and CSV", w: 1440, h: 900, caption: `Fixes, grouped by site. ${EXAMPLE}` },
  },
  {
    id: "alerts",
    title: "Stay on top of alerts",
    intro: "Alerts tell you when a score drops or rises, a new problem appears, an app's rating changes or a competitor updates.",
    steps: [
      <>Open <a href={dash("alerts")}>Alerts</a> to see every change. Unread alerts show a count in the sidebar.</>,
      <>Alerts are emailed to the address you set for each website.</>,
      <>Team owners can also send them to Slack or your own system with a Slack alert or a webhook in <a href={dash("settings")}>Settings</a>.</>,
    ],
    shot: { src: "/images/guide/alerts.webp", alt: "The Alerts list with a score drop, a score rise and a duplicate titles warning", w: 1440, h: 800, caption: `Alerts. ${EXAMPLE}` },
  },
  {
    id: "visibility",
    title: "Track AI visibility, apps and keywords",
    intro: "These sections track things over time, beyond the checks themselves.",
    steps: [
      <><a href={dash("visibility")}>AI visibility</a>: add a site and the questions your customers ask. Each week, ChatGPT, Claude, Perplexity and Gemini are asked those questions, and you see how often you&apos;re mentioned or cited.</>,
      <><a href={dash("apps")}>Apps</a>: track an App Store or Google Play listing and up to a few competitors. You&apos;re alerted when the rating drops or a competitor updates.</>,
      <><a href={dash("content")}>Keywords &amp; content</a>: see your keyword rankings and backlinks, and draft articles with the AI writer.</>,
    ],
    tip: "AI visibility results come from each provider's API, so they can differ a little from what people see in the apps.",
  },
  {
    id: "team",
    title: "Invite your team",
    intro: "Work on the same sites, fixes and reports together.",
    steps: [
      <>Open <a href={dash("team")}>Team</a> and choose <strong>Invite someone</strong>.</>,
      <>Pick a role: an <strong>editor</strong> can run checks and change things, a <strong>viewer</strong> can only look. Only owners manage the team and billing.</>,
      <>They get an email with a link to join. Invites expire after 14 days.</>,
    ],
  },
  {
    id: "agency",
    title: "Agency tools: branding, report domain and widget",
    intro: "On the Agency plan, client reports carry your brand instead of ours.",
    steps: [
      <>Open <a href={dash("agency")}>Agency</a> and add your logo, colour and company name under <strong>Report branding</strong>.</>,
      <>Optional: connect your own report domain, such as <code>reports.youragency.com</code>, so report links use your address.</>,
      <>Add the <strong>audit widget</strong> to your website. Visitors can check their site, and you receive their details as leads.</>,
      <>Schedule a monthly client report for any site under <a href={dash("websites")}>Websites</a>.</>,
    ],
  },
  {
    id: "settings",
    title: "Settings, API keys and your data",
    intro: "Manage your account and connect other tools.",
    steps: [
      <>Open <a href={dash("settings")}>Settings</a> from your profile menu. Change your email address and create <strong>API keys</strong>. Team owners can also add Slack alerts or a webhook.</>,
      <>Use an API key with the <a href={siteLink("/developers")}>public API</a> to run audits from your own code.</>,
      <>Choose <strong>Download my data</strong> to get everything your team has stored as one file, or <strong>Delete account</strong> to remove it.</>,
    ],
  },
  {
    id: "plan",
    title: "Plans, usage and AI credits",
    intro: "Your plan sets how many sites, reports and AI credits you get each month.",
    steps: [
      <>Open <strong>Plan and billing</strong> from your profile menu, or <strong>Manage plan</strong> in the sidebar, to see this month&apos;s usage.</>,
      <>AI features such as the fix plan and AI visibility use credits. Each credit covers about one AI answer, and you can buy more there.</>,
      <>Upgrade, change or cancel your plan any time. See <a href={siteLink("/pricing")}>pricing</a> or <a href={siteLink("/pricing/compare")}>compare plans</a>.</>,
    ],
  },
  {
    id: "phone",
    title: "Use it on your phone",
    intro: "Everything works on a phone.",
    steps: [
      <>The bar at the bottom has Overview, Check, Fixes and Reports.</>,
      <>Tap <strong>More</strong> for every other section, your profile, this guide, About and the legal pages.</>,
      <>Report PDFs and links work the same way as on a computer.</>,
    ],
    shot: { src: "/images/guide/phone.webp", alt: "The dashboard on a phone with the More menu open, listing Websites, Apps, AI visibility, Alerts, Keywords and content, Team and Settings", w: 780, h: 1688, caption: `The More menu on a phone. ${EXAMPLE}`, phone: true },
  },
];

export default function Guide({ ttl = 30, paidTtl = 365 }: { ttl?: number; paidTtl?: number }) {
  const list = sections(ttl, paidTtl);
  return (
    <div className="guide-layout in-app">
      <nav className="guide-toc" aria-label="Guide contents">
        <p className="guide-toc-title">In this guide</p>
        <ol>
          {list.map((s, i) => <li key={s.id}><a href={`#${s.id}`}><span>{i + 1}</span>{s.title}</a></li>)}
        </ol>
      </nav>
      <div className="guide-body">
        {list.map((s, i) => (
          <article key={s.id} id={s.id} className="guide-step" aria-labelledby={`${s.id}-title`}>
            <div className="guide-step-head">
              <span className="guide-num" aria-hidden="true">{i + 1}</span>
              <h2 id={`${s.id}-title`}>{s.title}</h2>
            </div>
            <p className="guide-intro">{s.intro}</p>
            <ol className="guide-list">{s.steps.map((st, n) => <li key={n}>{st}</li>)}</ol>
            {s.tip && <p className="guide-tip"><Lightbulb size={18} aria-hidden="true" /><span>{s.tip}</span></p>}
            {s.shot && (
              <figure className={`guide-shot ${s.shot.phone ? "is-phone" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.shot.src} alt={s.shot.alt} width={s.shot.w} height={s.shot.h} loading={i < 2 ? "eager" : "lazy"} decoding="async" />
                <figcaption>{s.shot.caption}</figcaption>
              </figure>
            )}
          </article>
        ))}
        <div className="guide-help">
          <div>
            <h2>Still stuck?</h2>
            <p className="muted">Tell us what you were trying to do and we&apos;ll help.</p>
          </div>
          <div className="actions">
            <a className="btn btn-primary" href={contactLink(`${BRAND.name}: help with the app`)}>Contact us</a>
          </div>
        </div>
      </div>
    </div>
  );
}
