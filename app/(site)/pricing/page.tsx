import type { Metadata } from "next";
import { ldJson } from "@/lib/jsonLd";
import { ArrowRight, Check } from "lucide-react";
import { BRAND, contactLink } from "@/lib/brand";
import LeadForm from "@/components/LeadForm";
import { paidPlans, plans as launchPlans } from "@/lib/plans";
import { PAYWALL_ENABLED } from "@/lib/config";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { appUrl } from "@/lib/hosts";
import { ladder, type Tier } from "@/lib/tiers";
import { Minus } from "lucide-react";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Pricing and plans",
  description: `${BRAND.name} is free during launch. See what's in the free plan and what's coming in Pro and Agency.`,
  alternates: { canonical: "/pricing" },
};

const LAUNCH_FAQS = [
  { q: "Is the free plan really free?", a: "Yes. Every feature marked live works without an account or a card during launch. Fair-use limits apply, such as a few full reports per hour." },
  { q: "What happens when paid plans launch?", a: "Quick page checks stay free. Full reports, monitoring and AI visibility tracking move into Pro and Agency. We'll announce prices before anything changes." },
  { q: "Can you fix the issues for me?", a: "Yes. Implementation is available as a fixed-price service. Send your report link and we'll quote." },
];
const PAID_FAQS = [
  { q: "Is there a free plan?", a: "Yes. Quick page checks, the AI crawler map and one saved site are free for good, with no card needed." },
  { q: "Can I cancel any time?", a: "Yes. Cancel from the dashboard under Plan. You keep your plan until the end of the period you've paid for." },
  { q: "What are AI credits?", a: "AI features such as fix plans and AI visibility tracking use credits. Each credit covers about one AI answer. You can buy more in the dashboard." },
  { q: "Can you fix the issues for me?", a: "Yes. Implementation is available as a fixed-price service. Send your report link and we'll quote." },
];

/** Paid plans show once the paywall is on and both prices are set; until then, the launch offer. */
const PAID = PAYWALL_ENABLED && !!process.env.PRICE_PRO_LABEL && !!process.env.PRICE_AGENCY_LABEL;

export default function PricingPage() {
  const plans = PAID ? paidPlans(PLAN_LIMITS, appUrl) : launchPlans;
  const faqs = PAID ? PAID_FAQS : LAUNCH_FAQS;
  return (
    <main>
      {PAID ? (
        <PageHero kicker="Pricing" title={<>Simple plans. Cancel any time.</>}>
          <p className="hero-sub">Start free. Upgrade when you want monitoring, AI visibility tracking or client reporting. Prices in USD; tax may be added at checkout.</p>
        </PageHero>
      ) : (
        <PageHero kicker="Pricing" title={<>Free while we launch.</>}>
          <p className="hero-sub">Use every live feature today at no cost. Paid plans for monitoring, AI visibility tracking and agencies are on the way.</p>
        </PageHero>
      )}

      <section className="section section-tight">
        <div className="container">
          <div className="plans">
            {plans.map((p) => (
              <article key={p.name} className={`plan ${p.featured ? "plan-featured" : ""}`}>
                <div className="plan-head">
                  <h2>{p.name}</h2>
                  {p.status === "live" && !PAID && <span className="badge badge-live">Available now</span>}
                </div>
                <p className="plan-price">
                  <strong>{p.price}</strong>
                  {p.period && <span>{p.period}</span>}
                </p>
                {p.note && <p className="plan-note">{p.note}</p>}
                <p className="plan-blurb">{p.blurb}</p>
                <ul>
                  {p.features.map((f) => <li key={f}><Check size={16} /> {f}</li>)}
                </ul>
                <a className={`btn ${p.featured ? "btn-primary" : "btn-ghost"} btn-block plan-cta`} href={p.cta.href}>
                  {p.cta.label} <span className="cta-circle" aria-hidden="true"><ArrowRight size={14} /></span>
                </a>
              </article>
            ))}
          </div>

          {PAID && (
            <div className="compare-wrap">
              <h2>Compare plans</h2>
              <div className="table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr><th scope="col"><span className="sr-only">Feature</span></th><th scope="col">No account</th><th scope="col">Free</th><th scope="col">Pro</th><th scope="col">Agency</th></tr>
                  </thead>
                  <tbody>
                    {ladder().map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        {(["visitor", "free", "pro", "agency"] as Tier[]).map((t) => {
                          const v = row.cells[t];
                          return <td key={t}>{v === true ? <Check size={18} className="c-pass" aria-label="Included" /> : v === false || v === "" ? <Minus size={18} className="muted" aria-label="Not included" /> : v}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="dfy">
            <div>
              <h2>Done for you</h2>
              <p>Prefer not to touch code? We implement the fixes from your report for a fixed price.</p>
            </div>
            <a className="btn btn-ghost" href={contactLink(`${BRAND.name}: implement my fixes`)}>Get a quote <ArrowRight size={16} /></a>
          </div>

          {!PAID && <div className="waitlist" id="waitlist">
            <div>
              <h2>Get told when Pro opens</h2>
              <p>One email when monitoring, report history and AI visibility tracking go live. No newsletter.</p>
            </div>
            <LeadForm kind="waitlist" compact />
          </div>}

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
