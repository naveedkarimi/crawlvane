import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { BRAND, contactLink } from "@/lib/brand";
import LeadForm from "@/components/LeadForm";
import { plans } from "@/lib/plans";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${BRAND.name} is free during launch. See what's in the free plan and what's coming in Pro and Agency.`,
  alternates: { canonical: "/pricing" },
};

const faqs = [
  { q: "Is the free plan really free?", a: "Yes. Every feature marked live works without an account or a card during launch. Fair-use limits apply, such as a few full reports per hour." },
  { q: "What happens when paid plans launch?", a: "Quick page checks stay free. Full reports, monitoring and AI visibility tracking move into Pro and Agency. We'll announce prices before anything changes." },
  { q: "Can you fix the issues for me?", a: "Yes. Implementation is available as a fixed-price service. Send your report link and we'll quote." },
];

export default function PricingPage() {
  return (
    <main>
      <PageHero kicker="Pricing" title={<>Free while we launch.</>}>
        <p className="hero-sub">Use every live feature today at no cost. Paid plans for monitoring, AI visibility tracking and agencies are on the way.</p>
      </PageHero>

      <section className="section section-tight">
        <div className="container">
          <div className="plans">
            {plans.map((p) => (
              <article key={p.name} className={`plan ${p.featured ? "plan-featured" : ""}`}>
                <div className="plan-head">
                  <h2>{p.name}</h2>
                  {p.status === "live" && <span className="badge badge-live">Available now</span>}
                </div>
                <p className="plan-price">
                  <strong>{p.price}</strong>
                  {p.period && <span>{p.period}</span>}
                </p>
                <p className="plan-blurb">{p.blurb}</p>
                <ul>
                  {p.features.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
                </ul>
                <a className={`btn ${p.featured ? "btn-primary" : "btn-ghost"} btn-block`} href={p.cta.href}>
                  {p.cta.label} {p.featured && <ArrowRight size={16} />}
                </a>
              </article>
            ))}
          </div>

          <div className="dfy">
            <div>
              <h2>Done for you</h2>
              <p>Prefer not to touch code? We implement the fixes from your report for a fixed price.</p>
            </div>
            <a className="btn btn-ghost" href={contactLink(`${BRAND.name}: implement my fixes`)}>Get a quote <ArrowRight size={16} /></a>
          </div>

          <div className="waitlist" id="waitlist">
            <div>
              <h2>Get told when Pro opens</h2>
              <p>One email when monitoring, report history and AI visibility tracking go live. No newsletter.</p>
            </div>
            <LeadForm kind="waitlist" compact />
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                url: `${BRAND.url}/pricing`,
                dateModified: BRAND.updated,
                isPartOf: { "@id": `${BRAND.url}/#website` },
                mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              }),
            }}
          />
          <div className="faq-list pricing-faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary><h3>{f.q}</h3><span className="faq-icon" aria-hidden="true" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
