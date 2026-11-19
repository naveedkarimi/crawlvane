import type { Metadata } from "next";
import { ldJson } from "@/lib/jsonLd";
import { ArrowRight } from "lucide-react";
import PlanCards from "@/components/PlanCards";
import { BRAND, contactLink } from "@/lib/brand";
import { paidPlans } from "@/lib/plans";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { appUrl } from "@/lib/hosts";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Pricing and plans",
  description: `${BRAND.name} plans: start free, or choose Pro or Agency for monitoring, AI visibility tracking and client reports.`,
  alternates: { canonical: "/pricing" },
};

const FAQS = [
  { q: "Is there a free plan?", a: "Yes. Quick page checks, the AI crawler map and one saved site are free for good, with no card needed." },
  { q: "Can I cancel any time?", a: "Yes. Cancel from the dashboard under Plan. You keep your plan until the end of the period you've paid for." },
  { q: "What are AI credits?", a: "AI features such as fix plans and AI visibility tracking use credits. Each credit covers about one AI answer. You can buy more in the dashboard." },
  { q: "Can you fix the issues for me?", a: "Yes. Implementation is available as a fixed-price service. Send your report link and we'll quote." },
];

export default function PricingPage() {
  const plans = paidPlans(PLAN_LIMITS, appUrl);
  const faqs = FAQS;
  return (
    <main>
      <PageHero kicker="Pricing" title={<>Simple plans. Cancel any time.</>}>
        <p className="hero-sub">Start free. Upgrade when you want monitoring, AI visibility tracking or client reporting. Prices in USD; tax may be added at checkout.</p>
      </PageHero>

      <section className="section section-tight">
        <div className="container">
          <PlanCards plans={plans} />

          <p className="plan-compare-link"><a href="/pricing/compare">Compare all features <ArrowRight size={14} aria-hidden="true" /></a></p>

          <div className="dfy">
            <div>
              <h2>Done for you</h2>
              <p>Prefer not to touch code? We implement the fixes from your report for a fixed price.</p>
            </div>
            <a className="btn btn-ghost" href={contactLink(`${BRAND.name}: implement my fixes`)}>Get a quote <ArrowRight size={16} /></a>
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: ldJson({
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
