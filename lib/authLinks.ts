import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Shared rules for the sign-in pages and the link in account emails. No imports with side effects,
 * so the browser forms, the callback route and the tests all use the same rules.
 */
export const MIN_PASSWORD = 10;
/** Supabase hashes passwords with bcrypt, which only reads the first 72 bytes. */
export const MAX_PASSWORD = 72;

/** What's wrong with a new password, or null when it's fine. */
export function passwordProblem(p: string): string | null {
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.${p.length ? ` You have ${p.length}.` : ""}`;
  if (new TextEncoder().encode(p).length > MAX_PASSWORD) return `Use ${MAX_PASSWORD} characters or fewer.`;
  if (!p.trim()) return "A password can't be only spaces.";
  return null;
}

const LINK_TYPES: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "invite", "email_change"];
/** The ?type= on an emailed link, if it's one Supabase can check. */
export const linkType = (t: string | null | undefined): EmailOtpType | null => (LINK_TYPES.includes(t as EmailOtpType) ? (t as EmailOtpType) : null);

/** The page to open once an emailed link is checked. Password reset links always go to the new-password page. */
export const afterLink = (type: EmailOtpType | null, next: string): string => (type === "recovery" ? "/reset-password" : next);

/** A sign-in page address that keeps the ?next= page, so switching between log in and sign up doesn't lose it. */
export const authHref = (path: string, next?: string | null): string => (next && next !== "/dashboard" ? `${path}?next=${encodeURIComponent(next)}` : path);
