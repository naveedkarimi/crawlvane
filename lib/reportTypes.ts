import type { SocialPosts, SocialPresence } from "./social";
import type { AuditResult, Category, Status } from "./types";

export interface PageSummary {
  url: string;
  status: number;
  depth: number;
  ms: number;
  title: string;
  description: string;
  h1: string;
  wordCount: number;
  noindex: boolean;
  canonical: string;
  scores: { overall: number; seo: number; aeo: number; geo: number };
  /** ids of failing / warning checks on this page */
  fails: string[];
  warns: string[];
  inlinks: number;
  /** Internal links on this page (added 2026-11-12; older reports don't have it). */
  outlinks?: number;
  /** Fingerprint of the main text, to group exact duplicates. */
  textKey?: string;
  error?: string;
}

export interface IssueGroup {
  id: string;
  category: Category | "site";
  title: string;
  status: Status;
  weight: number;
  fix?: string;
  count: number;
  examples: string[];
  /** Representative detail from one affected page */
  sample?: string;
}

export interface SiteAudit {
  origin: string;
  pagesCrawled: number;
  pagesDiscovered: number;
  scores: { overall: number; seo: number; aeo: number; geo: number };
  issues: IssueGroup[];
  pages: PageSummary[];
  /** Crawl coverage, page groups, likely soft 404s, URL variants and links to the wrong pages. Not scored. */
  diagnostics?: import("./siteDiagnostics").SiteDiagnostics;
  /** Pages with few internal links, and related pages that could link to them. */
  linkSuggestions?: import("./linkSuggest").LinkSuggestion[];
}

export interface CompetitorResult {
  url: string;
  ok: boolean;
  error?: string;
  scores?: AuditResult["scores"];
  /** check id -> status */
  statuses?: Record<string, Status>;
  wordCount?: number;
  schemaTypes?: string[];
  questionHeadings?: number;
  llmsTxt?: boolean;
  aiBotsBlocked?: string[];
}

export interface CompetitorGap {
  id: string;
  title: string;
  category: Category;
  you: Status;
  competitorsPassing: string[];
  fix?: string;
}

export interface GeneratedFix {
  id: string;
  title: string;
  filename?: string;
  language: "text" | "json" | "html" | "markdown";
  description: string;
  content: string;
}

export interface FixPlan {
  summary: string;
  actions: { priority: string; category: string; title: string; why: string; how: string; effort: string }[];
}

export type Sentiment = "positive" | "neutral" | "negative";
export interface SentimentCounts { positive: number; neutral: number; negative: number }

export interface VisibilityResult {
  brand: string;
  domain: string;
  prompts: string[];
  engines: string[];
  rows: {
    engine: string;
    prompt: string;
    mentioned: boolean;
    cited: boolean;
    citedUrls: string[];
    competitorsMentioned: string[];
    answerExcerpt: string;
    error?: string;
    /** How the answer describes the brand, when it's mentioned. Added by visibility tracking. */
    sentiment?: Sentiment;
  }[];
  summary: {
    engine: string;
    mentionRate: number;
    citationRate: number;
    answered: number;
  }[];
  shareOfVoice: { name: string; mentions: number }[];
}

export interface ResearchResult {
  niche: string;
  audienceQuestions: { question: string; intent: string; coveredOnSite: boolean }[];
  trustedSources: { name: string; url: string; why: string }[];
  contentGaps: string[];
  contentPlan: { title: string; format: string; targetQuestion: string; why: string }[];
  sources: string[];
}

export interface ReportOptions {
  maxPages: number;
  competitors: string[];
  aiPlan: boolean;
  aiVisibility: boolean;
  visibilityPrompts: string[];
  deepResearch: boolean;
  render: boolean;
  socialPosts: boolean;
  whiteLabel?: { name: string; logoUrl?: string; color?: string };
}

export type ReportStatus = "queued" | "running" | "done" | "error";

/** One line of the progress checklist. `at` is where it starts in the log. */
export interface ReportStage {
  id: string;
  label: string;
  at?: number;
  /** How many log lines this stage will write, when known. */
  total?: number;
}

export interface Report {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ReportStatus;
  progress: { step: string; done: number; total: number; log: string[]; stages?: ReportStage[] };
  input: { url: string; options: ReportOptions };
  home?: AuditResult;
  site?: SiteAudit;
  competitors?: CompetitorResult[];
  gaps?: CompetitorGap[];
  fixes?: GeneratedFix[];
  plan?: FixPlan | { error: string };
  visibility?: VisibilityResult | { error: string };
  research?: ResearchResult | { error: string };
  social?: SocialPresence;
  socialPosts?: SocialPosts | { error: string };
  error?: string;
}
