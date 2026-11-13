import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import FeatureGrid from "@/components/FeatureGrid";
import HowItWorks from "@/components/HowItWorks";
import { AUDIENCES } from "@/components/navLinks";
import { BRAND } from "@/lib/brand";
import { ldJson } from "@/lib/jsonLd";

export const metadata: Metadata = {
  title: "Features: SEO, answer engine and AI search audits",
  description: `Page checks, full-site crawls, AI crawler access, competitor comparison, ready-to-paste fixes and an AI fix plan, for site owners, consultants and agencies.`,
  alternates: { canonical: "/features" },
};

/** Only facts that are true today; keep in step with the home page and pricing. */
const FEATURE_FAQ = [
  { q: "What does " + BRAND.name + " check?", a: "About 50 checks across three areas: SEO (can search engines crawl and index the page), answer engines (does it answer questions in a way they can quote) and AI assistants (can ChatGPT, Claude, Perplexity and others read it, and which AI crawlers are allowed)." },
  { q: "Is it free?", a: "Page checks and full site reports are free during launch, with no card needed. Paid plans will add more sites, monitoring and agency features." },
  { q: "Do I need an account?", a: "Not for a page check. A free account saves your reports, tracks your score over time and runs a weekly check with email alerts." },
  { q: "How is it different from a regular SEO tool?", a: "Most SEO tools check how search engines see a page. " + BRAND.name + " also checks what answer engines and AI assistants can read and quote, and writes the fixes, such as robots.txt, llms.txt and schema, for you to paste in." },
];

export default function FeaturesPage() {
  return (
    <main>
      <PageHero kicker="Features" title="Everything in the free launch plan.">
        <p className="hero-sub">No account and no credit card. Monitoring, AI visibility tracking and white-label reports are coming in paid plans.</p>
        <div className="center-actions"><a className="btn btn-primary" href="/#audit">Run a free audit <ArrowRight size={16} /></a></div>
      </PageHero>

      <section className="section section-features" id="features" aria-labelledby="features-title">
        <div className="container features-layout">
          <div className="features-aside">
            <div className="kicker">What you get</div>
            <h2 id="features-title">From a score to the exact fix.</h2>
            <p className="lead">Every check comes with a plain-English explanation and, where it can, the code to paste.</p>
            <figure className="photo features-photo">
              <img src="/images/pexels-notes-laptop.webp" alt="Someone planning website changes in a notebook next to a laptop" width={900} height={1125} loading="lazy" decoding="async" />
            </figure>
          </div>
          <FeatureGrid />
        </div>
      </section>

      <HowItWorks ctaHref="/#audit" />

      <section className="section section-muted" id="who" aria-labelledby="who-title">
        <div className="container">
          <div className="section-head">
            <div className="kicker kicker-center">Who it&apos;s for</div>
            <h2 id="who-title">Start with a free audit. Grow into more.</h2>
          </div>
          <div className="people">
            {AUDIENCES.map(({ id, icon: Icon, title, text, img, alt }) => (
              <article key={id} id={id} className="person-card">
                <img src={img} alt={alt} width={1200} height={800} loading="lazy" decoding="async" />
                <div className="person-body">
                  <span className="feature-icon"><Icon size={20} strokeWidth={2} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section" aria-labelledby="features-faq">
        <div className="container faq-layout">
          <div className="section-head left">
            <div className="kicker">FAQ</div>
            <h2 id="features-faq">What people ask about the features</h2>
          </div>
          <div className="faq-list">
            {FEATURE_FAQ.map((f) => (
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
              url: `${BRAND.url}/features`,
              mainEntity: FEATURE_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            }),
          }}
        />
      </section>
    </main>
  );
}

