"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { browserAuth } from "@/lib/supabaseBrowser";

/** Where to go after signing in: the ?next= path if it's on this site, otherwise the dashboard. */
function nextPath(): string {
  const n = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}
const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;

/** Google sign-in shows once it's switched on in Supabase and NEXT_PUBLIC_AUTH_GOOGLE=1 is set. */
const GOOGLE = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";

/** Email sign-in link, and optionally Google. No passwords to remember or leak. */
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error") ? "That sign-in link has expired or was already used. Send a new one." : "",
  );

  if (sent)
    return (
      <p className="lead-done login-done" role="status">
        <CheckCircle2 size={18} aria-hidden="true" /> Check your inbox. We sent a sign-in link to <strong>{email}</strong>. It works once and expires in an hour.
      </p>
    );

  const google = async () => {
    const auth = browserAuth();
    if (!auth) return setErr("Sign-in isn't set up yet.");
    setErr("");
    setBusy(true);
    const { error } = await auth.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) {
      setBusy(false);
      setErr("Google sign-in isn't available right now. Use the email link instead.");
    }
  };

  return (
    <div className="login-wrap">
      <form
        className="search login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const auth = browserAuth();
          if (!auth) return setErr("Sign-in isn't set up yet.");
          setBusy(true);
          setErr("");
          const { error } = await auth.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback() } });
          setBusy(false);
          if (error) setErr(/rate|seconds/i.test(error.message) ? "Too many sign-in emails. Wait a minute and try again." : "We couldn't send the link. Check the address and try again.");
          else setSent(true);
        }}
      >
        <label htmlFor="login-email" className="sr-only">Email</label>
        <input id="login-email" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"} {!busy && <ArrowRight size={16} aria-hidden="true" />}</button>
      </form>
      {GOOGLE && (
        <>
          <p className="login-or"><span>or</span></p>
          <button type="button" className="btn btn-light login-google" disabled={busy} onClick={google}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
        </>
      )}
      {err && <p className="c-fail small login-error" role="alert">{err}</p>}
    </div>
  );
}
