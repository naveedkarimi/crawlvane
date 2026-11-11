"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import type { UsageSummary } from "@/lib/entitlements";

const PLAN_NAME = { free: "Free", pro: "Pro", agency: "Agency" } as const;

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="meter">
      <div className="meter-head"><span>{label}</span><strong>{unlimited ? `${used}` : `${used} of ${limit}`}</strong></div>
      {!unlimited && (
        <div className="bar-outer" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}>
          <div className={`bar-inner ${pct >= 100 ? "bad" : pct >= 80 ? "ok" : "good"}`} style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

/** Plan, this month's usage and the ways to get more. */
export default function PlanPanel({ isOwner }: { isOwner: boolean }) {
  const [u, setU] = useState<UsageSummary | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [yearly, setYearly] = useState(false);
  // Coming from a "Choose Pro" button on the pricing page.
  const [chosen] = useState(() => {
    const b = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("buy") : null;
    return b === "pro" || b === "agency" ? (b as "pro" | "agency") : null;
  });
  useEffect(() => { api<UsageSummary>("/api/me/usage").then(setU).catch((e: Error) => setErr(e.message)); }, []);

  const go = async (path: string, body?: Record<string, string>) => {
    setBusy(body?.item ?? path);
    setErr("");
    try {
      const r = await api<{ url: string }>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
      window.location.href = r.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
      setBusy("");
    }
  };

  if (err && !u) return <p className="c-fail small" role="alert">{err}</p>;
  if (!u) return <div className="loading"><div className="spinner" /> Loading your plan…</div>;
  const hasYearly = !!(u.billing?.yearly.pro || u.billing?.yearly.agency);
  /** The checkout item for a plan, yearly when chosen and offered. */
  const itemFor = (plan: "pro" | "agency") => (yearly && u.billing?.yearly[plan] ? `${plan}_yearly` : plan);
  const trial = u.billing?.trialDays ?? 0;
  return (
    <section className="dash-section" aria-label="Plan and usage">
      <div className="card plan-card">
        <div className="plan-card-head">
          <div>
            <p className="muted small">Current plan</p>
            <h3>{PLAN_NAME[u.plan]}</h3>
          </div>
          {!u.paywall && <span className="plan-badge">Everything is free during launch</span>}
        </div>
        <div className="meters">
          <Meter label="Saved sites" used={u.used.sites} limit={u.limits.sites} />
          <Meter label="Full reports this month" used={u.used.fullReports} limit={u.limits.fullReportsPerMonth} />
          <Meter label="AI credits used this month" used={u.used.aiCredits} limit={u.limits.aiCreditsPerMonth} />
        </div>
        {u.paywall && (
          <p className="muted small">
            {u.creditsLeft ?? 0} AI credits left this month{u.packs.ai ? `, including ${u.packs.ai} bought` : ""}.
            {u.packs.report ? ` ${u.packs.report} one-off report${u.packs.report === 1 ? "" : "s"} ready to use.` : ""}
          </p>
        )}
      </div>
      {isOwner && u.paywall && chosen && u.plan !== chosen && !(chosen === "pro" && u.plan === "agency") && (
        <div className="card plan-chosen">
          <p>You chose <strong>{PLAN_NAME[chosen]}</strong>. Payment is handled securely by Stripe.</p>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => go("/api/billing/checkout", { item: itemFor(chosen) })}>{busy.startsWith(chosen) ? "Opening…" : `Continue to checkout`} <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      )}
      {isOwner && u.paywall && u.plan !== "agency" && (hasYearly || trial > 0) && (
        <div className="plan-options">
          {hasYearly && (
            <div className="segmented billing-toggle" role="group" aria-label="Billing period">
              <button type="button" className={!yearly ? "on" : ""} aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
              <button type="button" className={yearly ? "on" : ""} aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly</button>
            </div>
          )}
          {trial > 0 && u.plan === "free" && <p className="muted small">New subscriptions start with a {trial}-day free trial. You won&apos;t be charged until it ends, and you can cancel before then.</p>}
        </div>
      )}
      {isOwner ? (
        <div className="plan-actions">
          {u.plan === "free" && <button className="btn btn-primary" disabled={!!busy} onClick={() => go("/api/billing/checkout", { item: itemFor("pro") })}>{busy.startsWith("pro") ? "Opening…" : "Upgrade to Pro"} <ArrowRight size={16} aria-hidden="true" /></button>}
          {u.plan !== "agency" && <button className="btn" disabled={!!busy} onClick={() => go("/api/billing/checkout", { item: itemFor("agency") })}>{busy.startsWith("agency") ? "Opening…" : "Upgrade to Agency"}</button>}
          <button className="btn" disabled={!!busy} onClick={() => go("/api/billing/checkout", { item: "report" })}>{busy === "report" ? "Opening…" : "Buy a one-off report"}</button>
          <button className="btn" disabled={!!busy} onClick={() => go("/api/billing/checkout", { item: "credits" })}>{busy === "credits" ? "Opening…" : "Buy AI credits"}</button>
          {u.plan !== "free" && <button className="btn btn-ghost" disabled={!!busy} onClick={() => go("/api/billing/portal")}>{busy === "/api/billing/portal" ? "Opening…" : "Manage billing and invoices"}</button>}
        </div>
      ) : (
        <p className="muted small">Only the team owner can change the plan.</p>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </section>
  );
}
