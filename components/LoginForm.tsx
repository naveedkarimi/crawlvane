"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { browserAuth } from "@/lib/supabaseBrowser";

/** Where to go after signing in: the ?next= path if it's on this site, otherwise the dashboard. */
function nextPath(): string {
  const n = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}
const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;

/* Brand marks for the sign-in buttons, as each company's guidelines allow for "Sign in with". */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
);
const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
);
const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
);

/**
 * Social sign-in buttons. Each shows only once it's switched on in Supabase (Authentication →
 * Providers) and its flag is set, so nobody sees a button that can't work.
 */
const PROVIDERS: { id: Provider; label: string; icon: ReactNode; on: boolean; scopes?: string }[] = [
  { id: "google", label: "Google", icon: <GoogleIcon />, on: process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1" },
  { id: "azure", label: "Microsoft", icon: <MicrosoftIcon />, on: process.env.NEXT_PUBLIC_AUTH_MICROSOFT === "1", scopes: "email" },
  { id: "github", label: "GitHub", icon: <GitHubIcon />, on: process.env.NEXT_PUBLIC_AUTH_GITHUB === "1" },
];

const RESEND_AFTER = 60;

/**
 * Sign in or sign up in one flow, like most sites: a social account, or an email address that gets
 * a one-time code (the email also has a link). No passwords to remember or leak.
 */
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "code">("start");
  const [busy, setBusy] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e === "oauth") setErr("Sign-in didn't finish. Try again, or use your email.");
    else if (e) setErr("That sign-in link has expired or was already used. Enter your email to get a new code.");
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const providers = PROVIDERS.filter((p) => p.on);

  const social = async (p: (typeof PROVIDERS)[number]) => {
    const auth = browserAuth();
    if (!auth) return setErr("Sign-in isn't set up yet.");
    setErr("");
    setBusy(p.id);
    const { error } = await auth.auth.signInWithOAuth({ provider: p.id, options: { redirectTo: callback(), scopes: p.scopes } });
    if (error) {
      setBusy(null);
      setErr(`${p.label} sign-in isn't available right now. Use your email instead.`);
    }
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const auth = browserAuth();
    if (!auth) return setErr("Sign-in isn't set up yet.");
    setBusy("email");
    setErr("");
    const { error } = await auth.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback() } });
    setBusy(null);
    if (error) return setErr(/rate|seconds|security purposes/i.test(error.message) ? "Too many sign-in emails. Wait a minute and try again." : "We couldn't send the email. Check the address and try again.");
    setStep("code");
    setCode("");
    setWait(RESEND_AFTER);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    const auth = browserAuth();
    if (!auth) return setErr("Sign-in isn't set up yet.");
    setBusy("code");
    setErr("");
    const { error } = await auth.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setBusy(null);
      return setErr("That code is wrong or has expired. Check the latest email, or send a new code.");
    }
    window.location.href = nextPath();
  };

  if (step === "code")
    return (
      <div className="auth-card">
        <span className="auth-icon" aria-hidden="true"><Mail size={22} /></span>
        <h2 className="auth-title">Check your email</h2>
        <p className="auth-sub">We sent a sign-in code to <strong>{email.trim()}</strong>. Enter it below, or click the link in the email.</p>
        <form className="auth-form" onSubmit={verify}>
          <label htmlFor="login-code" className="sr-only">Sign-in code</label>
          <input
            id="login-code" className="field auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10}
            required autoFocus placeholder="Enter code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy !== null || code.length < 6}>
            {busy === "code" ? "Checking…" : "Sign in"} {busy !== "code" && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>
        {err && <p className="c-fail small auth-error" role="alert">{err}</p>}
        <div className="auth-links">
          <button type="button" className="link" onClick={() => { setStep("start"); setErr(""); }}><ArrowLeft size={14} aria-hidden="true" /> Use a different email</button>
          <button type="button" className="link" disabled={wait > 0 || busy !== null} onClick={() => sendCode()}>
            {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
          </button>
        </div>
      </div>
    );

  return (
    <div className="auth-card">
      {providers.length > 0 && (
        <>
          <div className="auth-providers">
            {providers.map((p) => (
              <button key={p.id} type="button" className="btn btn-block auth-provider" disabled={busy !== null} onClick={() => social(p)}>
                {p.icon} {busy === p.id ? "Opening…" : `Continue with ${p.label}`}
              </button>
            ))}
          </div>
          <p className="auth-or"><span>or</span></p>
        </>
      )}
      <form className="auth-form" onSubmit={sendCode}>
        <label htmlFor="login-email" className="auth-label">Email</label>
        <input id="login-email" className="field" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy !== null}>
          {busy === "email" ? "Sending…" : "Continue with email"} {busy !== "email" && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </form>
      {err && <p className="c-fail small auth-error" role="alert">{err}</p>}
      <p className="auth-fine">New here? The same steps create your free account. By continuing you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</p>
    </div>
  );
}
