import { callClaude, parseJsonLoose } from "./ai/anthropic";
import type { AppListing, AppReview } from "./appStore";

/** Premium app features: AI rewrites of the listing and review analysis. */
const listingText = (l: AppListing) =>
  [
    `Store: ${l.store === "apple" ? "Apple App Store" : "Google Play"} (${l.country.toUpperCase()})`,
    `Name: ${l.title}`,
    l.store === "apple" ? `Subtitle: ${l.subtitle || "(none)"}` : "",
    `Category: ${l.category ?? "unknown"}`,
    `Rating: ${l.rating ?? "none"} from ${l.ratingCount ?? 0}`,
    `Description${l.descriptionComplete ? "" : " (start only)"}:\n${l.description.slice(0, 3500)}`,
  ]
    .filter(Boolean)
    .join("\n");

export interface ListingAdvice {
  names: { text: string; why: string }[];
  subtitles: { text: string; why: string }[];
  opening: string;
  keywords: string[];
  screenshotIdeas: string[];
}

export async function adviseListing(l: AppListing): Promise<ListingAdvice> {
  const apple = l.store === "apple";
  const r = await callClaude({
    feature: "app-advice",
    system: `You are an app store optimisation (ASO) expert. Improve this listing using only what it says about the app.
Rules:
- Never invent features, numbers, awards or claims the listing doesn't support.
- Names: at most 30 characters, keep the brand first.
- ${apple ? "Subtitles: at most 30 characters, no words already in the name." : "Short descriptions: at most 80 characters."}
- Keywords: phrases people would type, ${apple ? "suitable for Apple's 100-character keywords field (comma separated, no spaces after commas)" : "to use naturally in the description"}.
- Plain, specific English. No hype. Never promise rankings.
Respond with ONLY valid JSON:
{"names":[{"text":string,"why":string}] (3 options),"subtitles":[{"text":string,"why":string}] (3 options),"opening":string (a new first paragraph under 250 characters),"keywords":[string] (8-12),"screenshotIdeas":[string] (5 captions, one benefit each)}`,
    user: listingText(l),
    maxTokens: 8000,
  });
  const j = parseJsonLoose<ListingAdvice>(r.text);
  const cap = (n: number) => (x: { text: string; why: string }) => ({ text: String(x.text ?? "").slice(0, n), why: String(x.why ?? "") });
  return {
    names: (j.names ?? []).slice(0, 3).map(cap(30)),
    subtitles: (j.subtitles ?? []).slice(0, 3).map(cap(apple ? 30 : 80)),
    opening: String(j.opening ?? "").slice(0, 300),
    keywords: (j.keywords ?? []).map(String).slice(0, 12),
    screenshotIdeas: (j.screenshotIdeas ?? []).map(String).slice(0, 5),
  };
}

export interface ReviewInsights {
  summary: string;
  complaints: { theme: string; share: string; example: string }[];
  praise: { theme: string; share: string; example: string }[];
  requests: string[];
  reviewsRead: number;
  averageRecent: number | null;
}

export async function analyzeReviews(l: AppListing, reviews: AppReview[]): Promise<ReviewInsights> {
  const recent = reviews.slice(0, 120);
  const averageRecent = recent.length ? Math.round((recent.reduce((n, r) => n + r.rating, 0) / recent.length) * 10) / 10 : null;
  if (!recent.length) return { summary: "There are no recent written reviews to analyse.", complaints: [], praise: [], requests: [], reviewsRead: 0, averageRecent };
  // Reviewer names are left out on purpose: they aren't needed for the analysis.
  const text = recent.map((r, i) => `${i + 1}. [${r.rating}★] ${r.title ? r.title + ": " : ""}${r.text.replace(/\s+/g, " ").slice(0, 500)}`).join("\n");
  const r = await callClaude({
    feature: "app-reviews",
    system: `You analyse app store reviews for the app's developer. Group what people say into themes.
Rules:
- Use only the reviews given. Quote short real examples (under 120 characters), never invent them.
- "share" is a rough share of these reviews, like "about 1 in 5".
- Plain English, specific, useful to a product team.
Respond with ONLY valid JSON:
{"summary":string (2-3 sentences),"complaints":[{"theme":string,"share":string,"example":string}] (up to 5, most common first),"praise":[{"theme":string,"share":string,"example":string}] (up to 4),"requests":[string] (up to 5 feature requests)}`,
    user: `App: ${l.title}\nRecent reviews (newest first):\n${text}`,
    maxTokens: 8000,
  });
  const j = parseJsonLoose<Omit<ReviewInsights, "reviewsRead" | "averageRecent">>(r.text);
  const theme = (x: { theme: string; share: string; example: string }) => ({ theme: String(x.theme ?? ""), share: String(x.share ?? ""), example: String(x.example ?? "").slice(0, 160) });
  return {
    summary: String(j.summary ?? ""),
    complaints: (j.complaints ?? []).slice(0, 5).map(theme),
    praise: (j.praise ?? []).slice(0, 4).map(theme),
    requests: (j.requests ?? []).map(String).slice(0, 5),
    reviewsRead: recent.length,
    averageRecent,
  };
}
