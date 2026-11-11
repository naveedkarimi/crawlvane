"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { appUrl } from "@/lib/hosts";

/**
 * Shows "create a free account" or "see plans" the moment someone hits a locked feature or a
 * limit. Listens for the cv:upsell event that api() sends on those errors. In the dashboard,
 * onPlans opens the Plan section instead of loading a page.
 */
export default function Upsell({ onPlans }: { onPlans?: () => void }) {
  const [shown, setShown] = useState<{ kind: "signup" | "upgrade"; message: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setShown((e as CustomEvent<{ kind: "signup" | "upgrade"; message: string }>).detail);
    window.addEventListener("cv:upsell", on);
    return () => window.removeEventListener("cv:upsell", on);
  }, []);
  if (!shown) return null;
  const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard";
  const signupHref = appUrl(`/login?next=${encodeURIComponent(next.startsWith("/dashboard") ? next : "/dashboard")}`);
  return (
    <div className="upsell" role="dialog" aria-live="polite" aria-label={shown.kind === "signup" ? "Create a free account" : "Upgrade your plan"}>
      <Sparkles size={20} aria-hidden="true" className="upsell-icon" />
      <div className="upsell-text">
        <strong>{shown.kind === "signup" ? "This is free with an account" : "You've reached your plan's limit"}</strong>
        <span>{shown.message}</span>
      </div>
      {shown.kind === "signup" ? (
        <a className="btn btn-primary btn-sm" href={signupHref}>Create a free account <ArrowRight size={15} aria-hidden="true" /></a>
      ) : onPlans ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { onPlans(); setShown(null); }}>See plans <ArrowRight size={15} aria-hidden="true" /></button>
      ) : (
        <a className="btn btn-primary btn-sm" href={appUrl("/dashboard?tab=plan")}>See plans <ArrowRight size={15} aria-hidden="true" /></a>
      )}
      <button type="button" className="upsell-close" aria-label="Close" onClick={() => setShown(null)}><X size={16} aria-hidden="true" /></button>
    </div>
  );
}
