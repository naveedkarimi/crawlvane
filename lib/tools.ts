/** Free single-purpose tools. Used by /tools, the sitemap, llms.txt, the footer and the home page. */

export type ToolIcon = "eye" | "shield" | "file" | "list" | "braces" | "gauge" | "share" | "message" | "markdown" | "bot" | "redirect" | "sitemap" | "lock" | "chart" | "logs" | "a11y";

export type ToolGroup = "ai" | "content" | "seo";

export const TOOL_GROUPS: { key: ToolGroup; title: string; intro: string }[] = [
  { key: "ai", title: "Can AI find and read you?", intro: "Crawler access, JavaScript and agents: the reasons AI assistants never see a site." },
  { key: "content", title: "Answers and content", intro: "Make your pages easy for answer engines and language models to quote." },
  { key: "seo", title: "Search basics", intro: "Speed, previews and structured data that help in Google and everywhere else." },
];

export interface Tool {
  slug: string;
  name: string;
  /** Short label for the footer and menus. */
  short: string;
  group: ToolGroup;
  /** Card and llms.txt summary. */
  summary: string;
  icon: ToolIcon;
}

export const TOOLS: Tool[] = [
  {
    slug: "ai-visibility-checker",
    name: "Can AI read my page?",
    short: "AI visibility checker",
    group: "ai",
    summary: "See your page as people see it next to the text ChatGPT, Claude and Perplexity crawlers actually read.",
    icon: "eye",
  },
  {
    slug: "ai-bot-checker",
    name: "AI Bot Checker",
    short: "AI bot checker",
    group: "ai",
    summary: "Request your page as GPTBot, ClaudeBot, PerplexityBot, Googlebot and more to find firewall and CDN blocks.",
    icon: "shield",
  },
  {
    slug: "robots-txt-checker",
    name: "AI robots.txt checker and generator",
    short: "robots.txt checker",
    group: "ai",
    summary: "See which search and AI crawlers your robots.txt allows, then build a new one in a few clicks.",
    icon: "file",
  },
  {
    slug: "llms-txt-generator",
    name: "llms.txt generator and validator",
    short: "llms.txt generator",
    group: "content",
    summary: "Build an llms.txt from your key pages and check the one you already have.",
    icon: "list",
  },
  {
    slug: "schema-generator",
    name: "Schema markup generator",
    short: "Schema generator",
    group: "seo",
    summary: "Fill in a short form and copy JSON-LD for Organization, LocalBusiness, Person, Article, FAQ or Product.",
    icon: "braces",
  },
  {
    slug: "page-speed-test",
    name: "Mobile page speed test",
    short: "Page speed test",
    group: "seo",
    summary: "Google PageSpeed scores and Core Web Vitals on mobile and desktop, with the top fixes in plain English.",
    icon: "gauge",
  },
  {
    slug: "link-preview-checker",
    name: "Link preview checker",
    short: "Link preview checker",
    group: "seo",
    summary: "See how your link looks on Google, LinkedIn, Facebook, X and WhatsApp, and fix the title, description and image.",
    icon: "share",
  },
  {
    slug: "answer-readiness-checker",
    name: "Answer readiness checker (AEO)",
    short: "Answer readiness (AEO)",
    group: "content",
    summary: "Find the questions your page answers and check each answer is short and direct enough for AI Overviews to quote.",
    icon: "message",
  },
  {
    slug: "page-to-markdown",
    name: "Page to Markdown",
    short: "Page to Markdown",
    group: "content",
    summary: "Turn any page into the clean Markdown an AI model reads, with a word and token count. Copy or download it.",
    icon: "markdown",
  },
  {
    slug: "ai-agent-readiness",
    name: "AI agent readiness checker",
    short: "AI agent readiness",
    group: "ai",
    summary: "Check whether AI agents can understand and use your page: landmarks, labelled forms, named buttons, facts as text.",
    icon: "bot",
  },
  {
    slug: "redirect-checker",
    name: "Redirect and canonical checker",
    short: "Redirect checker",
    group: "seo",
    summary: "Follow every redirect hop with its status code, and check http to https, www and the canonical tag.",
    icon: "redirect",
  },
  {
    slug: "sitemap-validator",
    name: "XML sitemap validator",
    short: "Sitemap validator",
    group: "seo",
    summary: "Find your sitemap, check its URLs and lastmod dates, and spot-check that listed pages load without redirects.",
    icon: "sitemap",
  },
  {
    slug: "security-headers-checker",
    name: "Security headers checker",
    short: "Security headers",
    group: "seo",
    summary: "Check HSTS, Content-Security-Policy, clickjacking protection and version leaks, with the header to add for each.",
    icon: "lock",
  },
  {
    slug: "ga4-ai-traffic-regex",
    name: "GA4 AI traffic regex builder",
    short: "GA4 AI traffic regex",
    group: "ai",
    summary: "Build the regex that groups visits from ChatGPT, Perplexity, Claude, Gemini and Copilot into one AI channel in Google Analytics 4.",
    icon: "chart",
  },
  {
    slug: "ai-bot-log-analyzer",
    name: "AI bot log analyzer",
    short: "AI bot log analyzer",
    group: "ai",
    summary: "Upload your server log to see which AI crawlers read your site, what gets blocked, and the visits ChatGPT and Perplexity send.",
    icon: "logs",
  },
  {
    slug: "accessibility-checker",
    name: "Website accessibility checker (ADA / WCAG)",
    short: "Accessibility checker",
    group: "seo",
    summary: "Check a page against the WCAG 2.2 rules that can be tested automatically: alt text, labels, zoom, headings, landmarks, ARIA and media.",
    icon: "a11y",
  },
];

export const toolUrl = (slug: string) => `/tools/${slug}`;
