"use client";

import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { Plan } from "@/lib/plans";

/** "$39" → 39. Null when the label isn't a plain price. */
const amount = (label?: string) => {
  const m = label?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** How much a year costs less than 12 months, rounded, or null if it can't be worked out. */
function saving(p: Plan): number | null {
  const month = amount(p.price), year = amount(p.yearly);
  if (!month || !year) return null;
  const pct = Math.round((1 - year / (month * 12)) * 100);
  return pct > 0 ? pct : null;
}

/**
 * The plans in one panel, with the recommended plan raised as a dark card. Used on /pricing and
 * the home page. The Monthly/Yearly switch only appears once a yearly price is set.
 */
export default function PlanCards({ plans, limit, headingLevel = 2 }: { plans: Plan[]; limit?: number; headingLevel?: 2 | 3 }) {
  const hasYearly = plans.some((p) => p.yearly);
  const [yearly, setYearly] = useState(false);
  const best = Math.max(0, ...plans.map((p) => saving(p) ?? 0));
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="plan-cards-wrap">
      {hasYearly && (
        <div className="billing-toggle">
          <span className={!yearly ? "on" : ""} aria-hidden="true">Monthly</span>
          <button type="button" role="switch" aria-checked={yearly} aria-label="Bill yearly" className="switch" onClick={() => setYearly(!yearly)}><i /></button>
          <span className={yearly ? "on" : ""} aria-hidden="true">Yearly</span>
          {best ? <span className="save">Save {best}%</span> : null}
        </div>
      )}
      <div className="plan-cards">
        {plans.map((p) => {
          const useYear = yearly && !!p.yearly;
          const price = useYear ? p.yearly! : p.price;
          const period = p.price ? (useYear ? "/year" : p.period ? "/month" : "") : "";
          const pct = useYear ? saving(p) : null;
          return (
            <article key={p.name} className={`plan-card-x ${p.featured ? "featured" : ""}`}>
              {p.featured && <span className="pc-flag"><Sparkles size={11} aria-hidden="true" /> Recommended</span>}
              <div className="pc-top">
                <H className="pc-name">{p.name}</H>
                <p className="pc-price">
                  {price ? <><strong>{price}</strong>{period && <span>{period}</span>}</> : <strong className="pc-tba">Price coming</strong>}
                </p>
                <p className="pc-blurb">{p.blurb}</p>
                {(p.note || pct) && <p className="pc-note">{[pct ? `Save ${pct}% yearly` : "", p.note ?? ""].filter(Boolean).join(" · ")}</p>}
              </div>
              <ul>
                {(limit ? p.features.slice(0, limit) : p.features).map((f) => <li key={f}><Check size={16} aria-hidden="true" /> {f}</li>)}
              </ul>
              <a className={`btn btn-block pc-cta ${p.featured ? "btn-light" : "btn-primary"}`} href={p.cta.href}>
                {p.cta.label} <ArrowRight size={16} aria-hidden="true" />
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
