import { Suspense } from "react";
import { ArrowRight, Link2, ListChecks, Share2, Wrench, Bot, Briefcase, Building2, Check, Globe, MessageCircleQuestion, Search, Sparkles, Store } from "lucide-react";
import { ToolGrid } from "@/components/ToolPage";
import { TOOLS } from "@/lib/tools";
import Home from "@/components/Home";
import FeatureGrid from "@/components/FeatureGrid";
import type { Metadata } from "next";
import { BRAND, contactLink } from "@/lib/brand";
import { posts } from "@/lib/blog";
import PostCard from "@/components/PostCard";
import { plans } from "@/lib/plans";
import AuditCount from "@/components/AuditCount";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const steps = [
  { icon: Link2, title: "Enter your URL", text: "Check one page in about 20 seconds, or crawl up to 300 pages to find problems that repeat across the site." },
  { icon: ListChecks, title: "See what matters", text: "Scores for SEO, answers and AI search, with the biggest issues first and the AI crawlers that can or can't read you." },
  { icon: Wrench, title: "Apply the fixes", text: "Copy the generated robots.txt, llms.txt and schema, follow the fix plan, then re-run the check to see the score move." },
  { icon: Share2, title: "Compare and share", text: "Line up to 3 competitors side by side, then share the report link or download it as a PDF." },
];

const faqs = [
  {
    q: "What is the difference between SEO, AEO and GEO?",
    a: "SEO helps search engines crawl, understand and index your pages. AEO (answer engine optimization) shapes clear, direct answers that featured snippets, voice assistants and AI Overviews can lift. GEO (generative engine optimization) makes your expertise and brand easier for ChatGPT, Claude, Perplexity and Gemini to read, trust and cite. None of them guarantees a ranking or a citation.",
  },
  {
    q: "What does the audit check?",
    a: "Around 50 checks in three areas: technical and on-page SEO (indexability, titles, canonicals, sitemap, schema, speed), answer readiness (question headings, short answers, lists, readability, server-rendered text) and AI search readiness (AI crawler access in robots.txt, llms.txt, entity schema, citations and quotable facts).",
  },
  {
    q: "Should I block GPTBot or ClaudeBot?",
    a: "That is a business decision. Training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) are separate from AI search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot). You can block training and still allow the search bots that cite and link to you. The audit shows each one separately.",
  },
  {
    q: "Does llms.txt improve rankings?",
    a: "No search engine has confirmed using llms.txt for ranking. It is a low-effort convention that gives AI tools a clean map of your key pages, so we flag it as optional.",
  },
  {
    q: "Is it free?",
    a: "Yes. Every live feature is free during launch: page checks, full-site crawls, competitor comparison, ready-to-paste fixes and the AI fix plan. Paid Pro and Agency plans with monitoring and white-label reports come later.",
  },
  {
    q: "How is the score calculated?",
    a: "Each check is weighted 1 to 3 by impact. A pass earns the full weight, a warning half and a fail nothing; info items are not scored. The overall score is SEO 45%, AI search 30% and answer readiness 25%, and it is capped when something blocks the page, such as noindex or blocked AI search bots.",
  },
];

// Names only, with generic icons: the companies' logos are trademarks we don't have permission to use.
const engines: { name: string; kind: "search" | "ai" | "answer" }[] = [
  { name: "Google", kind: "search" },
  { name: "Bing", kind: "search" },
  { name: "ChatGPT", kind: "ai" },
  { name: "Claude", kind: "ai" },
  { name: "Perplexity", kind: "ai" },
  { name: "Gemini", kind: "ai" },
  { name: "AI Overviews", kind: "answer" },
];
const ENGINE_ICON = { search: Search, ai: Bot, answer: Sparkles };

const pillars = [
  {
    icon: Globe,
    label: "SEO",
    title: "Search-ready",
    text: "Can Google and Bing find, crawl and index every important page?",
    checks: ["Indexability and canonicals", "Sitemap and robots.txt", "Titles, headings, schema", "Speed and Core Web Vitals"],
  },
  {
    icon: MessageCircleQuestion,
    label: "AEO",
    title: "Answer-ready",
    text: "Can snippets, voice assistants and AI Overviews lift a direct answer?",
    checks: ["Question-style headings", "A short answer first", "Lists and tables", "Content without JavaScript"],
  },
  {
    icon: Sparkles,
    label: "GEO",
    title: "AI-ready",
    text: "Can ChatGPT, Claude, Perplexity and Gemini read, trust and cite you?",
    checks: ["AI crawler access", "Entity schema and sameAs", "Citations and concrete facts", "llms.txt (optional)"],
  },
];

const audiences = [
  {
    icon: Store, title: "Site owners", text: "Know what to fix, in what order, before you spend more on content or development.",
    img: "/images/pexels-site-owner.jpg", alt: "A small business owner checking orders on a laptop among shipping boxes",
  },
  {
    icon: Briefcase, title: "Consultants", text: "Open client conversations with clear, shareable findings and a ready-made plan.",
    img: "/images/pexels-consultant.jpg", alt: "A consultant reviewing work on a laptop in a studio",
  },
  {
    icon: Building2, title: "Agencies", text: "Audit client sites at scale. White-label reports and monitoring are on the way.",
    img: "/images/pexels-agency-team.jpg", alt: "An agency team gathered around a laptop reviewing a client site",
  },
];

/** Real audit of a free Open Graph image maker, run with Crawlvane on 2026-11-05. */
const example = {
  subject: "a free Open Graph image maker",
  scores: [
    { label: "Overall", value: 58 },
    { label: "SEO", value: 86 },
    { label: "Answers", value: 30 },
    { label: "AI search", value: 40 },
  ],
};

/** Small hand-drawn rays beside the hero headline. Decorative only. */

export default function Page() {
  return (
    <main>
      <section className="hero hero-dark" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <h1 id="hero-title">
            Get found on search engines.<br />
            <span className="accent-text">Get cited by AI.</span>
          </h1>
          <p className="hero-sub">
            See how search engines and AI assistants like ChatGPT, Claude and Perplexity read your site, in about 20 seconds.<span className="hide-phone"> Then get an AI-powered plan of what to fix first.</span>
          </p>
          <Suspense fallback={<div className="tool tool-fallback" id="audit" />}>
            <Home />
          </Suspense>
          <ul className="hero-points">
            <li><Check size={16} /> Free during launch</li>
            <li><Check size={16} /> About 50 checks</li>
            <li><Check size={16} /> AI-powered fix plan</li>
          </ul>
        </div>
      </section>

      <section className="engines-band" aria-label="Search engines and AI assistants covered">
        <div className="container engines-row">
          <span className="engines-title">Checks your readiness for</span>
          {/* On phones the list scrolls slowly in one line; the second copy makes the loop seamless. */}
          <div className="engines-track">
            {[0, 1].map((copy) => (
              <ul key={copy} className={copy ? "engines-dup" : undefined} aria-hidden={copy ? true : undefined}>
                {engines.map((e) => {
                  const Icon = ENGINE_ICON[e.kind];
                  return <li key={e.name}><Icon size={16} aria-hidden="true" /> {e.name}</li>;
                })}
              </ul>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="preview-title">
        <div className="container split">
          <div className="split-copy">
            <div className="kicker">The report</div>
            <h2 id="preview-title">See what search engines and AI see. Then fix it.</h2>
            <p className="lead">Most AI visibility tools only track numbers. {BRAND.name} tells you what to change and gives you the code.</p>
            <ul className="ticks">
              <li><Check size={18} /><span><strong>Scores you can act on.</strong> SEO, answer and AI readiness from 0 to 100, with the biggest problems first.</span></li>
              <li><Check size={18} /><span><strong>What AI sees.</strong> Your page as people see it, next to the text AI crawlers actually get.</span></li>
              <li><Check size={18} /><span><strong>AI crawler map.</strong> See which AI bots can read your site, with search and training bots kept apart.</span></li>
              <li><Check size={18} /><span><strong>Ready-to-paste fixes.</strong> robots.txt, llms.txt, schema and meta tags generated for your site.</span></li>
            </ul>
            <a className="btn btn-primary" href="#audit">Audit your site <ArrowRight size={16} /></a>
          </div>
          <figure className="product-frame">
            <div className="shot-bar">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="shot-url">{BRAND.host}/check</span>
            </div>
            <div className="product-crop">
              <img
                src="/images/app-product-shot.webp"
                alt={`${BRAND.name} page check for ${example.subject}: overall score 58, SEO 86, answers 30, AI search 40, and the What AI sees view showing a polished page for people but no text for AI crawlers`}
                width={1600}
                height={2883}
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption>A real page check of {example.subject}, November 2026.</figcaption>
          </figure>
        </div>
      </section>

      <section className="section section-dark" aria-labelledby="pillars-title">
        <div className="container">
          <div className="section-head">
            <div className="kicker">Three ways people find you</div>
            <h2 id="pillars-title">One audit for search, answers and AI.</h2>
            <p className="lead">Search is no longer one results page. People ask Google, voice assistants and chatbots. Each one reads your site differently.</p>
          </div>
          <div className="pillars">
            {pillars.map(({ icon: Icon, label, title, text, checks }) => (
              <article key={label} className="pillar">
                <div className="pillar-top">
                  <span className="pillar-icon"><Icon size={20} strokeWidth={1.75} /></span>
                  <span className="pillar-label">{label}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <ul>{checks.map((c) => <li key={c}><Check size={14} /> {c}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-features" id="features" aria-labelledby="features-title">
        <div className="container features-layout">
          <div className="features-aside">
            <div className="kicker">Features</div>
            <h2 id="features-title">Everything in the free launch plan.</h2>
            <p className="lead">No account and no credit card. Monitoring, AI visibility tracking and white-label reports are coming in paid plans.</p>
            <figure className="photo features-photo">
              <img src="/images/pexels-notes-laptop.webp" alt="Someone planning website changes in a notebook next to a laptop" width={900} height={1125} loading="lazy" decoding="async" />
            </figure>
          </div>
          <FeatureGrid />
        </div>
      </section>

      <section className="section section-dark how-section" id="how" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <div className="kicker kicker-center">How it works</div>
            <h2 id="how-title">From URL to a clear plan in minutes.</h2>
            <p className="lead">No setup and no account. Paste a link and get a report you can act on the same day.</p>
          </div>
          <ol className="timeline">
            {steps.map((st, i) => {
              const Icon = st.icon;
              return (
                <li key={st.title}>
                  <span className="timeline-icon" aria-hidden="true"><Icon size={24} strokeWidth={1.7} /></span>
                  <span className="timeline-step">Step {String(i + 1).padStart(2, "0")}</span>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                </li>
              );
            })}
          </ol>
          <div className="center-actions"><a className="btn btn-light" href="#audit">Try it on your site <ArrowRight size={16} /></a></div>
        </div>
      </section>

      <section className="section section-muted" id="example" aria-labelledby="example-title">
        <div className="container split split-example">
          <div className="split-copy">
            <div className="kicker">Real example</div>
            <h2 id="example-title">A good-looking site that AI assistants can&apos;t read.</h2>
            <p className="lead">
              We audited {example.subject}. It has rich schema and lets every AI bot in, yet it scored 58 out of 100.
            </p>
            <dl className="example-stats">
              {example.scores.map((x) => (
                <div key={x.label} className={x.value >= 85 ? "good" : x.value >= 60 ? "ok" : "bad"}>
                  <dt>{x.label}</dt>
                  <dd data-count={x.value}>{x.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="ticks">
              <li><Check size={18} /><span><strong>0 words in the HTML.</strong> The page is built in the browser with JavaScript. Most AI crawlers read the raw HTML, so they see an empty page.</span></li>
              <li><Check size={18} /><span><strong>No H1, headings or paragraphs</strong> for answer engines to quote, and no question-style headings.</span></li>
              <li><Check size={18} /><span><strong>No llms.txt, About or Contact page</strong>, so AI tools have less to understand and trust.</span></li>
              <li><Check size={18} /><span><strong>Slow on mobile.</strong> Performance 65: the phone spends about 3.4 seconds running JavaScript before the page responds.</span></li>
            </ul>
            <p className="example-fix"><strong>The fix:</strong> prerender the page so its text ships in the HTML, then add an H1, a short intro and an FAQ. {BRAND.name} generates the llms.txt.</p>
            <a className="btn btn-ghost" href="#audit">Audit your own site <ArrowRight size={16} /></a>
          </div>
          <figure className="photo-shot">
            <img
              src="/images/app-speed-test.webp"
              alt={`${BRAND.name} speed test for ${example.subject}: performance 65, accessibility 93, best practices 100, SEO 100; top fix too much JavaScript work, saves about 3.4 seconds`}
              width={1400}
              height={1201}
              loading="lazy"
              decoding="async"
            />
            <figcaption>The speed test for the same page, with the top fixes in plain English.</figcaption>
          </figure>
        </div>
      </section>

      <section className="section" aria-labelledby="tools-title">
        <div className="container">
          <div className="section-head">
            <div className="kicker kicker-center">Free tools</div>
            <h2 id="tools-title">Quick checks, no sign-up.</h2>
            <p className="lead">Single-purpose tools for the most common reasons AI assistants skip a site.</p>
          </div>
          <ToolGrid tools={TOOLS.slice(0, 6)} />
          <div className="center-actions"><a className="btn btn-ghost" href="/tools">All {TOOLS.length} free tools <ArrowRight size={16} /></a></div>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="who-title">
        <div className="container">
          <div className="section-head">
            <div className="kicker kicker-center">Who it&apos;s for</div>
            <h2 id="who-title">Start with a free audit. Grow into more.</h2>
          </div>
          <div className="people">
            {audiences.map(({ icon: Icon, title, text, img, alt }) => (
              <article key={title} className="person-card">
                <img src={img} alt={alt} width={1200} height={800} loading="lazy" decoding="async" />
                <div className="person-body">
                  <span className="feature-icon"><Icon size={20} strokeWidth={1.75} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark pricing-preview" aria-labelledby="pricing-title">
        <div className="container">
          <div className="section-head">
            <div className="kicker kicker-center">Pricing</div>
            <h2 id="pricing-title">Free while we launch.</h2>
            <p className="lead">Every live feature costs nothing today. Pro and Agency add tracking over time and client reporting.</p>
            <AuditCount />
          </div>
          <div className="price-cols">
            {plans.map((p) => (
              <article key={p.name} className={p.featured ? "featured" : ""}>
                <h3>{p.name}</h3>
                <p className="price-line"><strong>{p.price}</strong>{p.period && <span> {p.period}</span>}</p>
                <p>{p.blurb}</p>
                <ul>
                  {p.features.slice(p.name === "Launch" ? 0 : 1, 4).map((f) => <li key={f}><Check size={15} aria-hidden="true" /> {f}</li>)}
                </ul>
                <a className={`btn ${p.featured ? "btn-light" : "btn-outline-light"} btn-block`} href={p.cta.href}>{p.cta.label}</a>
              </article>
            ))}
          </div>
          <div className="center-actions">
            <a className="btn btn-outline-light" href="/pricing">Compare plans <ArrowRight size={16} /></a>
            <a className="btn btn-outline-light" href={contactLink(`${BRAND.name}: agency pilot`)}>Talk about an agency pilot</a>
          </div>
        </div>
      </section>

      <section className="section home-blog" aria-labelledby="blog-title">
        <div className="container">
          <div className="section-head">
            <div className="kicker kicker-center">From the blog</div>
            <h2 id="blog-title">Learn how search and AI read your site.</h2>
          </div>
          <div className="post-grid">
            {posts.slice(0, 3).map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
          <div className="center-actions"><a className="btn btn-ghost" href="/blog">All guides <ArrowRight size={16} /></a></div>
        </div>
      </section>

      <section className="section section-muted" id="faq" aria-labelledby="faq-title">
        <div className="container faq-layout">
          <div className="section-head left">
            <div className="kicker">FAQ</div>
            <h2 id="faq-title">Questions, answered.</h2>
            <p className="lead">Short answers to what people ask before their first audit.</p>
            <div className="faq-card">
              <span className="feature-icon"><MessageCircleQuestion size={22} /></span>
              <div>
                <strong>Still have a question?</strong>
                <p>Ask us anything about your results or the fixes. A real person replies.</p>
                <div className="row wrap">
                  <a className="btn btn-primary btn-sm" href="#audit">Run a free audit</a>
                  <a className="btn btn-ghost btn-sm" href={BRAND.contactUrl}>Get in touch</a>
                </div>
              </div>
            </div>
          </div>
          <div className="faq-list">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>
                  <h3>{f.q}</h3>
                  <span className="faq-icon" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              url: `${BRAND.url}/`,
              dateModified: BRAND.updated,
              isPartOf: { "@id": `${BRAND.url}/#website` },
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      </section>
    </main>
  );
}
