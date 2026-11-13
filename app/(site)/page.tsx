import { Suspense } from "react";
import { ldJson } from "@/lib/jsonLd";
import { ArrowRight, Check, Globe, MessageCircleQuestion, ShieldCheck, Sparkles } from "lucide-react";
import Home from "@/components/Home";
import HowItWorks from "@/components/HowItWorks";
import type { Metadata } from "next";
import { BRAND, contactLink } from "@/lib/brand";
import { plans } from "@/lib/plans";
import AuditCount from "@/components/AuditCount";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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

// Names only, as plain text: the companies' logos are trademarks we don't have permission to use.
// The terms and credits pages say the names belong to their owners and that we aren't affiliated.
const engines = ["Google", "Bing", "ChatGPT", "Claude", "Perplexity", "Gemini", "AI Overviews", "Copilot"];

const pillars = [
  {
    icon: Globe,
    label: "SEO",
    title: "Search-ready",
    text: "Can search engines find, crawl and index every important page?",
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

/** Real page check of naveedkarimi.com (the owner's portfolio, used with permission), run with Crawlvane on 2026-11-11. */
const example = {
  subject: "naveedkarimi.com",
  scores: [
    { label: "Overall", value: 90 },
    { label: "SEO", value: 99 },
    { label: "Answers", value: 69 },
    { label: "AI search", value: 93 },
  ],
};

/** Small hand-drawn rays beside the hero headline. Decorative only. */

export default function Page() {
  return (
    <main>
      <section className="hero hero-dark" aria-labelledby="hero-title">
        <div className="container hero-inner">
          {/* The tagline (BRAND.tagline): "AI." in solid red with a pale-blue underline that draws itself.
              The words themselves don't animate, so the largest element paints straight away. */}
          <h1 id="hero-title" className="hero-title">
            <span className="hero-line">Get found on search engines</span>{" "}
            <span className="hero-line">
              and in{" "}
              <span className="hero-ai">
                AI.
                <svg className="hero-swoosh" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 9 C 25 3, 60 2, 98 6" pathLength={1} />
                </svg>
                <Sparkles className="hero-spark" aria-hidden="true" />
              </span>
            </span>
          </h1>
          <p className="hero-sub">
            See how search engines and AI assistants like ChatGPT, Claude and Perplexity read your site, in about 20 seconds.<span className="hide-phone"> Then get an AI-powered plan of what to fix first.</span>
          </p>
          <Suspense fallback={<div className="tool tool-fallback" id="audit" />}>
            <Home />
          </Suspense>
          <p className="hero-note"><ShieldCheck size={15} aria-hidden="true" /> No sign-up needed for a page check</p>
        </div>
      </section>

      <section className="engines-band" aria-label="Search engines and AI assistants covered">
        <div className="container engines-row">
          <span className="engines-title">Checks your readiness for</span>
          {/* The names glide slowly in one line, pausing on hover; the second copy makes the loop seamless.
              With reduced motion they sit still and wrap instead. */}
          <div className="engines-viewport">
            <div className="engines-track">
              {[0, 1].map((copy) => (
                <ul key={copy} className={copy ? "engines-dup" : undefined} aria-hidden={copy ? true : undefined}>
                  {engines.map((name) => <li key={name}>{name}</li>)}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />

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
                alt={`${BRAND.name} page check for ${example.subject}: overall score 90, SEO 99, answers 69, AI search 93, 1 failed check, 6 warnings and 45 passed, and the What AI sees view showing the title, headings and 304 words of text AI crawlers can read`}
                width={1600}
                height={1931}
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
            <p className="lead">Search is no longer one results page. People ask search engines, voice assistants and chatbots. Each one reads your site differently.</p>
          </div>
          <div className="pillars">
            {pillars.map(({ icon: Icon, label, title, text, checks }) => (
              <article key={label} className="pillar">
                <div className="pillar-top">
                  <span className="pillar-icon"><Icon size={20} strokeWidth={2} /></span>
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

      <section className="section section-muted" id="example" aria-labelledby="example-title">
        <div className="container split split-example">
          <div className="split-copy">
            <div className="kicker">Real example</div>
            <h2 id="example-title">A strong site that still misses easy answers.</h2>
            <p className="lead">
              We audited {example.subject}, a developer portfolio. Search engines and AI crawlers read it well, yet answer readiness scored only 69 out of 100.
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
              <li><Check size={18} /><span><strong>No question-style headings.</strong> None of the 10 headings is phrased the way people ask, so answer engines have nothing to match.</span></li>
              <li><Check size={18} /><span><strong>A 7-word opening.</strong> The first paragraph is a greeting, not a short summary that an answer engine can quote.</span></li>
              <li><Check size={18} /><span><strong>No facts or numbers</strong> in the main text, such as statistics or dates, for AI tools to cite.</span></li>
              <li><Check size={18} /><span><strong>Images without sizes.</strong> All 3 images lack width and height, so the layout can shift as they load.</span></li>
            </ul>
            <p className="example-fix"><strong>The fix:</strong> open with a two-sentence summary, turn a few headings into the questions clients ask, add concrete facts, and give the images fixed sizes. {BRAND.name} lists each change in plain English.</p>
            <a className="btn btn-ghost" href="#audit">Audit your own site <ArrowRight size={16} /></a>
          </div>
          <figure className="photo-shot">
            <img
              src="/images/app-example-issues.webp"
              alt={`${BRAND.name} issues for ${example.subject}: question-style headings failed, plus warnings for the answer-first opening, specific facts and numbers, the contact page link and image dimensions, each with a plain-English fix`}
              width={1400}
              height={1479}
              loading="lazy"
              decoding="async"
            />
            <figcaption>The issues from the same check, each with the fix in plain English.</figcaption>
          </figure>
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
                <div className="price-head">
                  <h3>{p.name}</h3>
                  {p.status === "live" && <span className="badge badge-live">Available now</span>}
                </div>
                <p className="price-line"><strong>{p.price}</strong>{p.period && <span> {p.period}</span>}</p>
                <p>{p.blurb}</p>
                <ul>
                  {p.features.slice(p.name === "Launch" ? 0 : 1, 4).map((f) => <li key={f}><Check size={15} aria-hidden="true" /> {f}</li>)}
                </ul>
                <a className={`btn ${p.featured ? "btn-light" : "btn-outline-light"} btn-block plan-cta`} href={p.cta.href}>
                  {p.cta.label} <span className="cta-circle" aria-hidden="true"><ArrowRight size={14} /></span>
                </a>
              </article>
            ))}
          </div>
          <div className="center-actions">
            <a className="btn btn-outline-light" href="/pricing">Compare plans <ArrowRight size={16} /></a>
            <a className="btn btn-outline-light" href={contactLink(`${BRAND.name}: agency pilot`)}>Talk about an agency pilot</a>
          </div>
        </div>
      </section>

      <section className="section section-muted" id="faq" aria-labelledby="faq-title">
        <div className="container faq-layout">
          <div className="section-head left">
            <div className="kicker">FAQ</div>
            <h2 id="faq-title">Questions, answered.</h2>
            <p className="lead">Short answers to what people ask before their first audit.</p>
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
            __html: ldJson({
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
