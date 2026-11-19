import type { Metadata } from "next";
import { Fragment } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import { BRAND, contactLink } from "@/lib/brand";
import { paidPlans } from "@/lib/plans";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { appUrl } from "@/lib/hosts";
import { ladder, type LadderGroup, type Tier } from "@/lib/tiers";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Compare plans",
  description: `Every ${BRAND.name} feature side by side: what you get without an account, and on the Free, Pro and Agency plans.`,
  alternates: { canonical: "/pricing/compare" },
};

const TIERS: Tier[] = ["visitor", "free", "pro", "agency"];
const GROUP_NOTE: Record<LadderGroup, string> = {
  Audits: "Checks, fixes and reports.",
  Monitoring: "Tracking your sites, apps and AI visibility over time.",
  "Team and agency": "Working with colleagues and clients.",
};

function CellValue({ v }: { v: string | boolean }) {
  if (v === true) return <span className="cmp-yes"><Check size={16} aria-hidden="true" /><span className="sr-only">Included</span></span>;
  if (v === false || v === "") return <span className="cmp-no"><Minus size={16} aria-hidden="true" /><span className="sr-only">Not included</span></span>;
  return <span className="cmp-val">{v}</span>;
}

export default function ComparePage() {
  const plans = paidPlans(PLAN_LIMITS, appUrl);
  const byName = Object.fromEntries(plans.map((p) => [p.name.toLowerCase(), p]));
  const head: Record<Tier, { name: string; price: string; period: string; cta: { label: string; href: string }; featured?: boolean }> = {
    visitor: { name: "No account", price: "$0", period: "", cta: { label: "Run a check", href: "/#audit" } },
    free: { name: "Free", price: byName.free.price, period: "", cta: byName.free.cta },
    pro: { name: "Pro", price: byName.pro.price, period: byName.pro.price ? "/month" : "", cta: byName.pro.cta, featured: true },
    agency: { name: "Agency", price: byName.agency.price, period: byName.agency.price ? "/month" : "", cta: byName.agency.cta },
  };
  const rows = ladder();
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <main>
      <PageHero kicker="Pricing" title="Compare plans">
        <p className="hero-sub">Every feature side by side. Numbers are the limits we enforce, so what you see here is what you get.</p>
      </PageHero>

      <section className="section section-tight">
        <div className="container">
          <a className="back-link small cmp-back" href="/pricing"><ArrowLeft size={15} aria-hidden="true" /> Back to pricing</a>
          <div className="cmp-wrap" tabIndex={0} role="region" aria-label="Plan comparison table">
            <table className="cmp-table">
              <caption className="sr-only">Features in each plan</caption>
              <thead>
                <tr>
                  <th scope="col" className="cmp-corner"><span className="sr-only">Feature</span></th>
                  {TIERS.map((t) => {
                    const h = head[t];
                    return (
                      <th key={t} scope="col" className={h.featured ? "cmp-featured" : ""}>
                        <div className="cmp-head">
                          {h.featured && <span className="badge-rec"><Sparkles size={11} aria-hidden="true" /> Recommended</span>}
                          <span className="cmp-name">{h.name}</span>
                          <span className="cmp-price">{h.price ? <><strong>{h.price}</strong>{h.period && <span>{h.period}</span>}</> : <span className="muted">Price coming</span>}</span>
                          <a className={`btn btn-sm btn-block ${h.featured ? "btn-primary" : ""}`} href={h.cta.href}>{h.cta.label}</a>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g}>
                    <tr className="cmp-group">
                      <th scope="colgroup" colSpan={5}><strong>{g}</strong> <span>{GROUP_NOTE[g]}</span></th>
                    </tr>
                    {rows.filter((r) => r.group === g).map((r) => (
                      <tr key={r.label}>
                        <th scope="row">{r.label}</th>
                        {TIERS.map((t) => <td key={t} className={head[t].featured ? "cmp-featured" : ""}><CellValue v={r.cells[t]} /></td>)}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cmp-help">
            <div>
              <h2>Not sure which plan fits?</h2>
              <p className="muted">Start with a free check. You can upgrade, downgrade or cancel any time from the dashboard.</p>
            </div>
            <div className="actions">
              <a className="btn btn-primary" href="/#audit">Run a free check <ArrowRight size={16} aria-hidden="true" /></a>
              <a className="btn" href={contactLink(`${BRAND.name}: which plan?`)}>Ask us</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
