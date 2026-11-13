"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FileText, Sparkles, X } from "lucide-react";
import { appUrl } from "@/lib/hosts";

/**
 * Shows "create a free account" or "see plans" the moment someone hits a locked feature or a
 * limit. Listens for the cv:upsell event that api() sends on those errors. In the dashboard,
 * onPlans opens the Plan section instead of loading a page.
 *
 * A dialog rather than a toast: it says plainly that a free account is needed, what the account
 * gives (only things the free plan really includes), and offers log in for people who have one.
 */
type Shown = { kind: "signup" | "upgrade"; message: string };

const FREE_GETS = [
  "Your full report, saved so you can come back to it",
  "Download it as a PDF or Markdown",
  "Your score over time, with a weekly check and email alerts",
];

export default function Upsell({ onPlans }: { onPlans?: () => void }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const primary = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      returnTo.current = document.activeElement as HTMLElement | null;
      setShown((e as CustomEvent<Shown>).detail);
    };
    window.addEventListener("cv:upsell", on);
    return () => window.removeEventListener("cv:upsell", on);
  }, []);

  const close = () => {
    setShown(null);
    returnTo.current?.focus?.();
  };

  useEffect(() => {
    if (!shown) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [shown]);

  if (!shown) return null;
  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard";
  const next = encodeURIComponent(here.startsWith("/dashboard") ? here : "/dashboard");
  const signup = shown.kind === "signup";
  const aboutReport = /report|download|pdf/i.test(shown.message);
  const title = signup ? (aboutReport ? "One quick step to get your report" : "One quick step to continue") : "You've reached your plan's limit";

  return (
    <div className="upsell-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="upsell" role="dialog" aria-modal="true" aria-labelledby="upsell-title" aria-describedby="upsell-msg">
        <button type="button" className="upsell-close" aria-label="Close" onClick={close}><X size={18} aria-hidden="true" /></button>
        <span className="upsell-icon" aria-hidden="true">{aboutReport ? <FileText size={22} /> : <Sparkles size={22} />}</span>
        <h2 id="upsell-title">{title}</h2>
        <p id="upsell-msg" className="upsell-msg">{shown.message}</p>

        {signup ? (
          <>
            <p className="upsell-gets-title">A free account gives you</p>
            <ul className="upsell-gets">
              {FREE_GETS.map((g) => <li key={g}><Check size={15} aria-hidden="true" /> {g}</li>)}
            </ul>
            <a ref={primary} className="btn btn-primary btn-block upsell-primary" href={appUrl(`/signup?next=${next}`)}>
              Create free account <ArrowRight size={16} aria-hidden="true" />
            </a>
            {!/no card/i.test(shown.message) && <p className="upsell-fine">Free, no card needed. Takes about a minute.</p>}
            <p className="upsell-login">Already have an account? <a href={appUrl(`/login?next=${next}`)}>Log in</a></p>
          </>
        ) : (
          <>
            {onPlans ? (
              <button ref={primary} type="button" className="btn btn-primary btn-block upsell-primary" onClick={() => { onPlans(); setShown(null); }}>
                See plans <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <a ref={primary} className="btn btn-primary btn-block upsell-primary" href={appUrl("/dashboard?tab=plan")}>See plans <ArrowRight size={16} aria-hidden="true" /></a>
            )}
            <button type="button" className="link upsell-later" onClick={close}>Not now</button>
          </>
        )}
      </div>
    </div>
  );
}
