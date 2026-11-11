export type Category = "seo" | "aeo" | "geo";
export type Status = "pass" | "warn" | "fail" | "info";

export interface Check {
  id: string;
  category: Category;
  group: string;
  title: string;
  status: Status;
  /** What we found */
  detail: string;
  /** How to fix (shown when not passing) */
  fix?: string;
  /** The fix is hidden until the visitor signs up (see lib/tiers.ts). */
  fixLocked?: boolean;
  /** 1 (minor) .. 3 (major). Info checks don't count towards the score. */
  weight: 1 | 2 | 3;
}

export interface BotAccess {
  bot: string;
  owner: string;
  purpose: "search" | "user-fetch" | "training" | "classic-search";
  allowed: boolean;
  matchedGroup: string;
}

/** Files that link a website to its mobile app. */
export interface AppFiles {
  aasa: FetchedResource | null;
  assetlinks: FetchedResource | null;
}

export interface FetchedResource {
  url: string;
  ok: boolean;
  status: number;
  body: string;
  headers: Record<string, string>;
  redirects: string[];
  ms: number;
  bytes: number;
  error?: string;
  /** True when the body came from a headless browser (JavaScript ran) instead of the raw HTML. */
  rendered?: boolean;
}

export interface AuditFacts {
  finalUrl: string;
  status: number;
  responseMs: number;
  htmlBytes: number;
  redirects: string[];
  title: string;
  metaDescription: string;
  canonical: string;
  h1: string[];
  lang: string;
  wordCount: number;
  schemaTypes: string[];
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesMissingAlt: number;
  questionHeadings: number;
  robotsTxtFound: boolean;
  sitemapUrls: number | null;
  llmsTxtFound: boolean;
  bots: BotAccess[];
  /** "What AI sees": first headings (level 1-6) found in the HTML. Optional: older saved reports lack it. */
  outline?: { level: number; text: string }[];
  /** "What AI sees": start of the main text as found in the HTML. */
  textExcerpt?: string;
  /** True when JavaScript was rendered before analysis, so the text is what a browser sees. */
  rendered?: boolean;
}

export interface AuditResult {
  url: string;
  auditedAt: string;
  scores: { overall: number; seo: number; aeo: number; geo: number };
  checks: Check[];
  facts: AuditFacts;
}
