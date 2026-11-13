"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { useConfig } from "@/lib/client";
import { browserAuth } from "@/lib/supabaseBrowser";
import OpeningSpinner from "./OpeningSpinner";
import { appUrl } from "@/lib/hosts";

/**
 * The header's main button: "Sign in", or "Dashboard" once signed in. When accounts are
 * switched off it stays "Free audit". `mobile` is the full-width version in the mobile menu.
 */
export default function AccountLink({ variant = "cta", onNavigate }: { variant?: "cta" | "mobile"; onNavigate?: () => void }) {
  const { cfg, on } = useConfig();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    const auth = browserAuth();
    if (!auth) return setSignedIn(false);
    auth.auth.getSession().then(({ data }) => setSignedIn(!!data.session)).catch(() => setSignedIn(false));
  }, []);
  // Coming back with the browser's Back button can restore this page as it was, spinner included.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setOpening(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  // Accounts off: keep the audit button. Until we know, show "Sign in" so the button doesn't change size.
  const accountsOff = !!cfg && !on("accounts");
  const label = accountsOff ? "Free audit" : signedIn ? "Dashboard" : "Sign in";
  const href = accountsOff ? "/#audit" : appUrl(signedIn ? "/dashboard" : "/login");
  // A plain click on Dashboard shows the spinner while it loads. New-tab clicks are left alone.
  const open = (e: MouseEvent) => {
    onNavigate?.();
    if (signedIn && !accountsOff && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) && e.button === 0) setOpening(true);
  };

  return (
    <>
      {variant === "cta" ? (
        <a className="header-cta" href={href} onClick={open}>
          {label} <span className="cta-circle"><ArrowUpRight size={14} aria-hidden="true" /></span>
        </a>
      ) : (
        !accountsOff && <a className="btn btn-outline-light btn-block" href={href} onClick={open}>{label}</a>
      )}
      {opening && <OpeningSpinner />}
    </>
  );
}
