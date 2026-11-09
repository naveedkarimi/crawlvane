import type { Post } from "./types";

export const contentPosts: Post[] = [
  {
    slug: "does-llms-txt-matter",
    updated: "2026-11-08",
    title: "Does llms.txt matter in 2026? What the data says",
    description: "Thousands of sites added llms.txt, but log studies show AI crawlers rarely read it. Should you bother? An honest look at the evidence.",
    date: "2026-11-06",
    tags: ["GEO", "llms.txt"],
    cta: "llms",
    body: `
llms.txt is a proposed standard: a plain Markdown file at yoursite.com/llms.txt that gives AI tools a short, clean map of your most important pages. It spread fast through SEO advice in 2025. The question is whether anything actually reads it.

## What the logs show

- **Ahrefs analyzed server logs across about 137,000 domains** and found that 97% of published llms.txt files received no requests at all in May 2026; AI retrieval bots made up about 1% of the requests that did arrive. ([Ahrefs](https://ahrefs.com/blog/llmstxt-study/))
- Adoption kept growing anyway: one tracker counted roughly 8.8 times more llms.txt files in May 2026 than a year earlier. ([PPC Land](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/))
- Google's John Mueller has said none of the AI services have said they use it, and the major crawler documentation points to robots.txt for access control.
- **Google's own AI optimization guide now says** you don't need llms.txt to appear in Google Search, and that keeping one "will neither harm nor help" your visibility there. It also says it's fine to maintain one for other services. ([Google](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide))

## So should you add one?

Our view: **yes, if it takes you ten minutes; no, if it would delay anything else.** It costs almost nothing, it can help AI tools and agents that do look for it, and it forces you to decide which pages matter most. It is not a ranking factor and it won't fix a site that AI crawlers can't read.

> Treat llms.txt like a business card, not a marketing plan. Useful when someone asks for it; worthless if the front door is locked.

[[cta]]

## What actually moves the needle first

1. **Let AI search bots in.** Check robots.txt and your firewall.
2. **Make your text readable without JavaScript.** Most AI crawlers read raw HTML.
3. **Answer questions directly** under question-style headings.
4. **Add Organization or Person schema** with links to your real profiles.

## A good llms.txt in 30 seconds

\`\`\`
# Your Business

> One sentence on what you do, for whom, and where.

## Key pages
- [Services](https://yoursite.com/services): What we offer and prices
- [About](https://yoursite.com/about): Who we are
- [Contact](https://yoursite.com/contact): How to reach us
\`\`\`

Keep it short, keep the links current, and update it when your main pages change. Our free [llms.txt generator](/tools/llms-txt-generator) builds a first draft from your key pages and checks an existing file.
`,
  },
  {
    slug: "ai-overviews-cutting-clicks",
    title: "AI Overviews are cutting clicks. Here's what still works",
    description: "Studies show AI Overviews reduce organic clicks by roughly 35 to 60%. What that means for your traffic, and how to become the source AI cites.",
    date: "2026-11-06",
    tags: ["AEO", "Google", "Strategy"],
    cta: "audit",
    body: `
If your search traffic has slipped while your rankings look fine, AI Overviews are a likely reason. Google now answers many questions at the top of the page, and fewer people scroll down to click.

## What the studies found

- **Pew Research:** about 8% of users clicked an organic result when an AI Overview appeared, versus 15% when it didn't.
- **A randomized field study** found about 38% fewer organic clicks on queries with AI Overviews, with little change in user satisfaction. ([Search Engine Journal](https://www.searchenginejournal.com/ai-overviews-cut-organic-clicks-38-field-study-finds/573145/))
- **Ahrefs:** the top organic result gets about 58% fewer clicks when an AI Overview is present.
- **Seer Interactive:** a click-through gap of roughly 37% between queries with and without AI Overviews was still there in early 2026.

Numbers vary by method and industry, but the direction is consistent: informational queries send fewer clicks than they used to. ([Relevant Audience summary](https://www.relevantaudience.com/seo/ai-overview-impact-on-organic-search-2026/))

## What still works

**Be the source the answer cites.** AI Overviews link to pages. Clear, quotable passages with facts and dates are what get picked.

**Answer the question in the first lines.** Put a direct 40 to 60 word answer under a question-style heading, then add depth. Long scene-setting intros are what answer engines skip.

**Win the queries AI can't fully answer.** Comparisons, local services, prices, tools, original data and expert opinion still earn clicks because people need more than a summary.

**Build your brand name.** When people search for you by name, AI summaries help rather than hurt. Consistent brand signals (schema, profiles, mentions) make that easier.

[[cta]]

## Measure the right things

- Track impressions as well as clicks in Search Console. Rising impressions with falling clicks is the AI Overview pattern.
- Track AI referrals (chatgpt.com, perplexity.ai and others) in analytics. They're small but growing.
- Watch conversions, not just sessions. Fewer, better-informed visitors can still mean more customers.

## The short version

AI Overviews reward pages that are easy to quote and hard to replace. Make your answers clear, your facts specific and your pages fast, and give people a reason to click: something the summary can't do for them.
`,
  },
  {
    slug: "write-content-ai-assistants-quote",
    title: "How to write content AI assistants quote",
    description: "Question headings, short direct answers, facts and sources: a practical guide to writing pages that ChatGPT, Perplexity and AI Overviews can lift and cite.",
    date: "2026-11-06",
    tags: ["AEO", "GEO", "Content"],
    cta: "audit",
    body: `
AI assistants don't read your page like a person scrolling from the top. They pull out passages that answer a specific question, check them against other sources, and cite the ones they trust. Writing for that is mostly writing clearly.

## 1. Use the questions people actually ask as headings

Turn vague headings into questions: "Pricing" becomes "How much does a website audit cost?" Answer engines match questions to headings, and readers scan for them too. Aim for at least three question-style headings on pages meant to answer things.

## 2. Answer first, in 40 to 60 words

Put a direct answer in the first paragraph under each question. Then explain, give examples and add caveats. A passage that stands on its own can be lifted without losing meaning.

> **Weak:** "Pricing depends on many factors, and every business is different..."
> **Strong:** "A basic website audit costs nothing with free tools; a professional audit usually costs a few hundred to a few thousand dollars, depending on site size."

## 3. Be specific

Assistants prefer passages with concrete facts: numbers, dates, prices, names, places. "Loads in under 2 seconds on mobile" beats "fast". Original data, such as results from your own customers or tests, is especially valuable because nobody else has it.

## 4. Show your sources

Link to the studies, documentation and standards you rely on. Pages that cite evidence are easier to trust, for people and machines.

[[cta]]

## 5. Use lists and tables

Steps, comparisons and specs are easier to extract as lists and tables than as paragraphs. Keep paragraphs to one idea each, roughly 40 to 80 words.

## 6. Cover the related questions on one page

Google's AI Mode uses "query fan-out": it splits one question into many smaller searches and builds an answer from the best pages for each. A page that answers the main question plus the obvious follow-ups (cost, time, alternatives, risks) fits that well. Google warns against mass-producing near-duplicate pages for every variation, so build one strong page, not fifty thin ones. ([Xponent21](https://xponent21.com/insights/query-fan-out-one-page-per-question/))

## 7. Make trust visible

- An author name and short bio on articles
- A visible "last updated" date, kept honest
- About and Contact pages linked from every page
- Organization or Person schema with links to your real profiles

## 8. Make sure the text is in the HTML

All of this only works if crawlers can read it. If your page builds its content with JavaScript, many AI crawlers see an empty page. Check before you rewrite anything.
`,
  },
  {
    slug: "structured-data-for-ai-search",
    updated: "2026-11-08",
    title: "Structured data for AI search: the schema that actually helps",
    description: "Which schema types help search engines and AI assistants understand your business in 2026, and which rich results Google no longer shows.",
    date: "2026-11-06",
    tags: ["SEO", "GEO", "Schema"],
    cta: "schema",
    body: `
Structured data is a small block of JSON-LD in your page that tells machines, in their own format, who you are and what the page is about. It won't rescue thin content, but it removes guesswork, and guesswork is what makes assistants skip or misdescribe you.

## Start with your identity

The most useful schema for AI visibility is the simplest: an **Organization** (or **Person**, for personal brands) with links to your real profiles.

\`\`\`
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Business",
  "url": "https://yoursite.com",
  "logo": "https://yoursite.com/logo.png",
  "sameAs": [
    "https://www.linkedin.com/company/your-business",
    "https://www.youtube.com/@yourbusiness"
  ]
}
\`\`\`

The sameAs links help search engines and AI models connect your site with your profiles, so they're confident they're talking about the right business. Use the exact same business name everywhere.

## Then describe the page

| Page | Schema type | Why |
|---|---|---|
| Homepage | Organization + WebSite | Who you are and your site name |
| Article or blog post | Article (author, datePublished, dateModified) | Shows who wrote it and how fresh it is |
| Product page | Product with Offer | Price, availability, reviews |
| Local business | LocalBusiness | Address, hours, phone |
| FAQ section | FAQPage | Clear question and answer pairs |

[[cta]]

## What changed with rich results

Google removed HowTo rich results in 2023 and stopped showing FAQ rich results for every site on May 7, 2026. ([Google's documentation updates](https://developers.google.com/search/updates)) FAQPage markup is still valid and there's no need to delete it, but it won't change how your page looks in Google. Keep FAQ content on the page because people read it. If visitors post their own answers to a single question, QAPage is still a supported rich result.

## Common mistakes

- **Schema that doesn't match the page.** Marking up reviews, prices or FAQs that aren't visible is against Google's guidelines.
- **Invalid JSON.** One missing comma breaks the whole block. Generate it with a tool such as our free [schema generator](/tools/schema-generator), then validate with Google's Rich Results Test or the Schema.org validator.
- **Different names in different places.** "Acme", "Acme Ltd" and "Acme Coffee Roasters" look like three businesses.
- **Relying on schema alone.** If the page's text is only rendered by JavaScript, schema can't make up for missing content.

## A quick checklist

1. Organization or Person schema on the homepage, with sameAs links
2. Article schema with author and dates on every post
3. Product, LocalBusiness or Service schema where it fits
4. Validate, then re-check after theme or plugin updates
`,
  },
];
