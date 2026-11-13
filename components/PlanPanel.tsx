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
      {isOwner && u.paywall && u.plan === "agency" && <AddonsCard />}
      {u.paywall && <ReferralCard />}
    </section>
  );
}

interface ReferralStats { link: string; referred: number; paying: number; monthsEarned: number; monthsWaiting: number }

/** The team's referral link: a free month for each team it refers that starts paying. */
function ReferralCard() {
  const [r, setR] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api<ReferralStats>("/api/me/referrals").then(setR).catch(() => {}); }, []);
  if (!r) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the link is visible to copy by hand */ }
  };
  return (
    <div className="card dash-card referral-card">
      <h3>Refer a team, get a free month</h3>
      <p className="muted small">Share your link. When a team that signs up through it starts paying, you get one month of your plan free, taken off your next bill.</p>
      <div className="team-invite-row">
        <label className="sr-only" htmlFor="ref-link">Your referral link</label>
        <input id="ref-link" className="field mono" readOnly value={r.link} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
      </div>
      <p className="muted small">
        {r.referred} team{r.referred === 1 ? "" : "s"} signed up · {r.paying} paying · {r.monthsEarned} free month{r.monthsEarned === 1 ? "" : "s"} earned
        {r.monthsWaiting ? ` · ${r.monthsWaiting} waiting until you subscribe` : ""}
      </p>
    </div>
  );
}

interface Addons { offered: boolean; labels: { seat: string; sites: string; sitesPerPack: number }; seats: number; sitePacks: number }

/** Agency add-ons: extra seats and extra sites, billed on the Agency subscription. */
function AddonsCard() {
  const [a, setA] = useState<Addons | null>(null);
  const [seats, setSeats] = useState(0);
  const [packs, setPacks] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    api<Addons>("/api/billing/addons").then((x) => { setA(x); setSeats(x.seats); setPacks(x.sitePacks); }).catch(() => {});
  }, []);
  if (!a?.offered) return null;
  const changed = seats !== a.seats || packs !== a.sitePacks;
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ seats: number; sitePacks: number }>("/api/billing/addons", { method: "POST", body: JSON.stringify({ seats, sitePacks: packs }) });
      setA({ ...a, seats: r.seats, sitePacks: r.sitePacks });
      setMsg({ ok: true, text: "Saved. Your bill is adjusted for the rest of this period." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't work." });
    } finally {
      setBusy(false);
    }
  };
  const num = (v: string) => Math.min(100, Math.max(0, Math.floor(Number(v) || 0)));
  return (
    <div className="card dash-card addons-card">
      <h3>Add-ons</h3>
      <p className="muted small">Grow past the Agency limits without changing plan. Changes are prorated on your next bill.</p>
      <div className="addons-grid">
        <label className="addon">
          <span><strong>Extra seats</strong><small className="muted">{a.labels.seat} each</small></span>
          <input className="field" type="number" min={0} max={100} value={seats} onChange={(e) => setSeats(num(e.target.value))} />
        </label>
        <label className="addon">
          <span><strong>Extra sites</strong><small className="muted">{a.labels.sites} per {a.labels.sitesPerPack} sites</small></span>
          <input className="field" type="number" min={0} max={100} value={packs} onChange={(e) => setPacks(num(e.target.value))} aria-describedby="packs-note" />
        </label>
      </div>
      <p className="muted small" id="packs-note">{packs} pack{packs === 1 ? "" : "s"} = {packs * a.labels.sitesPerPack} more saved and monitored sites.</p>
      <div className="site-actions">
        <button type="button" className="btn btn-primary" disabled={!changed || busy} onClick={save}>{busy ? "Saving…" : "Save add-ons"}</button>
      </div>
      {msg && <p className={`small ${msg.ok ? "c-pass" : "c-fail"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </div>
  );
}
