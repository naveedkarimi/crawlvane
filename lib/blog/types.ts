export type CtaKind = "audit" | "aiView" | "botTest" | "speed" | "fixes" | "robots" | "llms" | "schema";

export interface Post {
  slug: string;
  title: string;
  /** Meta description and card summary (about 150 characters). */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  updated?: string;
  tags: string[];
  /** Which tool the post points readers to. */
  cta: CtaKind;
  /** Markdown body. A line with only [[cta]] places the inline call to action. */
  body: string;
}

export const CTAS: Record<CtaKind, { title: string; text: string; href: string; label: string }> = {
  audit: {
    title: "Check your site for SEO, AEO and AI search",
    text: "About 50 checks in 20 seconds, with a fix for every issue. Free, no sign-up.",
    href: "/#audit",
    label: "Run a free audit",
  },
  aiView: {
    title: "See what AI sees on your page",
    text: "Your page as people see it, next to the text AI crawlers actually read. Free, in about 20 seconds.",
    href: "/tools/ai-visibility-checker",
    label: "Check what AI sees",
  },
  botTest: {
    title: "Can AI bots load your site?",
    text: "We request your page as GPTBot, ClaudeBot, PerplexityBot, Googlebot and more, and show which ones get blocked.",
    href: "/tools/ai-bot-checker",
    label: "Check AI bot access",
  },
  speed: {
    title: "Test your mobile speed",
    text: "Google PageSpeed scores and Core Web Vitals on mobile and desktop, with the top fixes in plain English.",
    href: "/tools/page-speed-test",
    label: "Run a free speed test",
  },
  fixes: {
    title: "Get the fixes generated for you",
    text: "The full site report writes your robots.txt, llms.txt and Organization schema, ready to paste.",
    href: "/?mode=full#audit",
    label: "Generate my fixes",
  },
  robots: {
    title: "Check and build your robots.txt",
    text: "See which search and AI crawlers your robots.txt allows, then generate a new one in a few clicks.",
    href: "/tools/robots-txt-checker",
    label: "Check my robots.txt",
  },
  llms: {
    title: "Generate your llms.txt in 20 seconds",
    text: "We read your key pages and write the file for you. Already have one? We check it against the format.",
    href: "/tools/llms-txt-generator",
    label: "Generate llms.txt",
  },
  schema: {
    title: "Generate your schema markup",
    text: "Organization, LocalBusiness, Person, Article, FAQ or Product JSON-LD from a short form. Runs in your browser.",
    href: "/tools/schema-generator",
    label: "Open the schema generator",
  },
};
