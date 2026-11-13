import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import FeatureGrid from "@/components/FeatureGrid";
import HowItWorks from "@/components/HowItWorks";
import { AUDIENCES } from "@/components/navLinks";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Features: SEO, answer engine and AI search audits",
  description: `Page checks, full-site crawls, AI crawler access, competitor comparison, ready-to-paste fixes and an AI fix plan, for site owners, consultants and agencies.`,
  alternates: { canonical: "/features" },
};

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
    </main>
  );
}
