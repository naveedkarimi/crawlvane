"use client";

/**
 * Remembers a referral code from a ?ref= link for 30 days in this browser (localStorage, no cookie),
 * so the referrer gets credit if the visitor signs up later. Sent once after sign-in, then forgotten.
 */
const KEY = "cv_ref";
const DAYS = 30;

export function rememberReferral(): void {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && /^[a-hj-km-np-z2-9]{8}$/.test(code)) localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* storage blocked: no referral, nothing else breaks */
  }
}

/** The saved code, if it's still fresh. Removes it either way. */
export function takeReferral(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number };
    return code && at && Date.now() - at < DAYS * 86400000 ? code : null;
  } catch {
    return null;
  }
}
