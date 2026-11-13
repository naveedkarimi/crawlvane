"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Info, KeyRound, Mail, MailCheck, ShieldCheck } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { browserAuth } from "@/lib/supabaseBrowser";
import { safeNextPath } from "@/lib/safeNext";
import { MIN_PASSWORD, authHref, passwordProblem } from "@/lib/authLinks";
import { BRAND } from "@/lib/brand";

/* ---------- Where to go next ---------- */

/** The ?next= page if it's on this site, otherwise the dashboard. */
function nextPath(): string {
  return safeNextPath(new URLSearchParams(window.location.search).get("next") ?? "/dashboard");
}
const callback = (next = nextPath()) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
const go = (path: string) => { window.location.href = path; };
const NOT_SET_UP = "Sign-in isn't set up yet.";
const RATE_LIMIT = /rate|seconds|security purposes|too many/i;
const RESEND_AFTER = 60;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Counts down to zero, once a second. */
function useCountdown(): [number, (s: number) => void] {
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  return [wait, setWait];
}

/* ---------- Social sign-in ---------- */

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

/** "or", then a pill per social account, plus any other way in (such as an emailed code). Placed after the main form, as in the design. */
function Providers({ busy, setBusy, setErr, extra }: { busy: string | null; setBusy: (b: string | null) => void; setErr: (e: string) => void; extra?: ReactNode }) {
  const on = PROVIDERS.filter((p) => p.on);
  if (!on.length && !extra) return null;
  const start = async (p: (typeof PROVIDERS)[number]) => {
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setErr("");
    setBusy(p.id);
    const { error } = await auth.auth.signInWithOAuth({ provider: p.id, options: { redirectTo: callback(), scopes: p.scopes } });
    if (error) {
      setBusy(null);
      setErr(`${p.label} sign-in isn't available right now. Use your email instead.`);
    }
  };
  return (
    <>
      <p className="auth-or"><span>or</span></p>
      <div className="auth-providers">
        {on.map((p) => (
          <button key={p.id} type="button" className="btn btn-block auth-provider" disabled={busy !== null} onClick={() => start(p)}>
            <span className="auth-provider-icon">{p.icon}</span>
            <span>{busy === p.id ? "Opening…" : `Continue with ${p.label}`}</span>
          </button>
        ))}
        {extra}
      </div>
    </>
  );
}

/* ---------- Small parts ---------- */

function Head({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <>
      {icon && <span className="auth-icon" aria-hidden="true">{icon}</span>}
      <div className="auth-head">
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{children}</p>
      </div>
    </>
  );
}

function Alert({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="auth-alert" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  if (!children) return null;
  return <p className="auth-field-error" id={id}><AlertCircle size={14} aria-hidden="true" /> <span>{children}</span></p>;
}

function Submit({ busy, label, busyLabel, disabled }: { busy: boolean; label: string; busyLabel: string; disabled?: boolean }) {
  return (
    <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={busy || disabled}>
      {busy ? busyLabel : label} {!busy && <ArrowRight size={16} aria-hidden="true" />}
    </button>
  );
}

function EmailField({ id, label = "Email", value, onChange, error, autoFocus }: { id: string; label?: string; value: string; onChange: (v: string) => void; error?: ReactNode; autoFocus?: boolean }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <input
        id={id} className={`field${error ? " is-invalid" : ""}`} type="email" required autoComplete="email" autoFocus={autoFocus} placeholder="you@yourbusiness.com"
        value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} data-lpignore="true"
      />
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, error, hint, aside }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: "current-password" | "new-password"; error?: ReactNode; hint?: ReactNode; aside?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const described = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label htmlFor={id} className="auth-label">{label}</label>
        {aside}
      </div>
      <div className="auth-password">
        <input
          id={id} className={`field${error ? " is-invalid" : ""}`} type={show ? "text" : "password"} required autoComplete={autoComplete}
          value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={described}
        />
        <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error ? <FieldError id={`${id}-err`}>{error}</FieldError> : hint ? <p className="auth-hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}

/** Errors from Supabase's ?error= on the way back to the page. */
function useLinkError(setErr: (e: string) => void, linkMessage: string) {
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e === "oauth") setErr("Sign-in didn't finish. Try again, or use your email.");
    else if (e) setErr(linkMessage);
  }, [setErr, linkMessage]);
}

/* ---------- Check your email: a code or the link ---------- */

/**
 * After a code sign-in or a sign-up, the email holds a code and a link. The code works in this
 * browser; the link works anywhere. kind decides which email a resend sends.
 */
function CheckEmail({ email, kind, onBack }: { email: string; kind: "signin" | "signup"; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [wait, setWait] = useCountdown();
  useEffect(() => setWait(RESEND_AFTER), [setWait]);

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy("code");
    setErr("");
    const { error } = await auth.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) {
      setBusy(null);
      return setErr("That code is wrong or has expired. Check the newest email, or send a new code.");
    }
    go(nextPath());
  };

  const resend = async () => {
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy("resend");
    setErr("");
    setNote("");
    const { error } = kind === "signup"
      ? await auth.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback() } })
      : await auth.auth.signInWithOtp({ email, options: { emailRedirectTo: callback() } });
    setBusy(null);
    if (error) return setErr(RATE_LIMIT.test(error.message) ? "Too many emails. Wait a minute and try again." : "We couldn't send the email. Try again in a moment.");
    setNote("Sent. Use the code from the newest email.");
    setWait(RESEND_AFTER);
  };

  return (
    <div className="auth-card">
      <Head icon={<Mail size={22} />} title="Check your email">
        {kind === "signup" ? "We sent a confirmation email to " : "We sent a sign-in code to "}<strong>{email}</strong>. Enter the code below, or open the link in the email.
      </Head>
      <Alert>{err}</Alert>
      <form className="auth-form" onSubmit={verify}>
        <div className="auth-field">
          <label htmlFor="auth-code" className="auth-label">{kind === "signup" ? "Confirmation code" : "Sign-in code"}</label>
          <input
            id="auth-code" className="field auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10}
            required autoFocus placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Submit busy={busy === "code"} label={kind === "signup" ? "Confirm and continue" : "Sign in"} busyLabel="Checking…" disabled={busy !== null || code.length < 6} />
      </form>
      <div className="auth-help">
        <Info size={18} aria-hidden="true" />
        <p><strong>Can&apos;t find it?</strong> Check your spam or promotions folder. The code and link expire after an hour; if you asked for more than one, use the newest.</p>
      </div>
      {note && <p className="auth-note" role="status"><Check size={15} aria-hidden="true" /> {note}</p>}
      <button type="button" className="btn btn-block auth-secondary" disabled={wait > 0 || busy !== null} onClick={resend}>
        {busy === "resend" ? "Sending…" : wait > 0 ? `Resend email in ${clock(wait)}` : "Resend email"}
      </button>
      <p className="auth-fine auth-center">
        Wrong address? <button type="button" className="link" onClick={onBack}>Change email</button>
      </p>
    </div>
  );
}

/* ---------- Log in ---------- */

export function LoginForm({ signupHref }: { signupHref: string }) {
  const [mode, setMode] = useState<"password" | "code" | "check">("password");
  const [checkKind, setCheckKind] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<ReactNode>("");
  const setErrText = setErr as (e: string) => void;
  useLinkError(setErrText, "That link has expired or was already used. Log in, or ask for a new code.");

  const sendConfirm = async () => {
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy("confirm");
    const { error } = await auth.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: callback() } });
    setBusy(null);
    if (error) return setErr(RATE_LIMIT.test(error.message) ? "Too many emails. Wait a minute and try again." : "We couldn't send the email. Try again in a moment.");
    setErr("");
    setCheckKind("signup");
    setMode("check");
  };

  const logIn = async (e: FormEvent) => {
    e.preventDefault();
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy("password");
    setErr("");
    const { error } = await auth.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return go(nextPath());
    setBusy(null);
    if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message))
      return setErr(<><strong>Confirm your email first.</strong> Open the link we sent when you signed up, or <button type="button" className="link" onClick={sendConfirm}>send a new confirmation email</button>.</>);
    if (RATE_LIMIT.test(error.message)) return setErr("Too many attempts. Wait a few minutes and try again.");
    // One message for both fields, so the page never reveals which emails have accounts.
    setErr(<><strong>Email or password is incorrect.</strong> Check both and try again, or <a href={authHref("/forgot-password", null)}>reset your password</a>.</>);
  };

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy("code");
    setErr("");
    const { error } = await auth.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback() } });
    setBusy(null);
    if (error) return setErr(RATE_LIMIT.test(error.message) ? "Too many sign-in emails. Wait a minute and try again." : "We couldn't send the email. Check the address and try again.");
    setCheckKind("signin");
    setMode("check");
  };

  if (mode === "check") return <CheckEmail email={email.trim()} kind={checkKind} onBack={() => { setMode(checkKind === "signin" ? "code" : "password"); setErr(""); }} />;

  if (mode === "code")
    return (
      <div className="auth-card">
        <Head title="Log in with a code">We&apos;ll email you a one-time code. No password needed. If you&apos;re new, this creates your free account.</Head>
        <Alert>{err}</Alert>
        <form className="auth-form" onSubmit={sendCode}>
          <EmailField id="login-email" value={email} onChange={setEmail} autoFocus />
          <Submit busy={busy === "code"} label="Email me a code" busyLabel="Sending…" disabled={busy !== null} />
        </form>
        <p className="auth-fine auth-center"><button type="button" className="link" onClick={() => { setMode("password"); setErr(""); }}>Log in with your password instead</button></p>
      </div>
    );

  return (
    <div className="auth-card">
      <Head title="Log in">New to {BRAND.name}? <a href={signupHref}>Create an account</a></Head>
      <Alert>{err}</Alert>
      <form className="auth-form" onSubmit={logIn}>
        <EmailField id="login-email" value={email} onChange={setEmail} />
        <PasswordField id="login-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="auth-row"><a className="auth-forgot" href="/forgot-password">Forgot password?</a></div>
        <Submit busy={busy === "password"} label="Log in" busyLabel="Logging in…" disabled={busy !== null} />
      </form>
      <Providers
        busy={busy} setBusy={setBusy} setErr={setErrText}
        extra={
          <button type="button" className="btn btn-block auth-provider" disabled={busy !== null} onClick={() => { setMode("code"); setErr(""); }}>
            <span className="auth-provider-icon"><Mail size={18} aria-hidden="true" /></span>
            <span>Email me a sign-in code</span>
          </button>
        }
      />
    </div>
  );
}

/* ---------- Sign up ---------- */

export function SignupForm({ loginHref }: { loginHref: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [emailErr, setEmailErr] = useState<ReactNode>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [check, setCheck] = useState(false);
  useLinkError(setErr, "That link has expired or was already used. Sign up again or log in.");

  const pwProblem = passwordProblem(password);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setEmailErr("");
    setErr("");
    if (pwProblem) return;
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy("signup");
    const { data, error } = await auth.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: callback() } });
    if (error) {
      setBusy(null);
      if (error.code === "weak_password") return setErr(error.message);
      if (error.code === "user_already_exists") return setEmailErr(<>An account with this email already exists. <a href={authHref("/login", nextPath())}>Log in instead</a></>);
      if (error.code === "signup_disabled") return setErr("New sign-ups are paused right now. Try again later.");
      return setErr(RATE_LIMIT.test(error.message) ? "Too many attempts. Wait a minute and try again." : "We couldn't create your account. Check your email and try again.");
    }
    // With email confirmation off, Supabase signs the person in straight away.
    if (data.session) return go(nextPath());
    setBusy(null);
    // With confirmation on, an email that already has an account comes back with no identities and no email is sent.
    if (data.user && data.user.identities?.length === 0)
      return setEmailErr(<>An account with this email already exists. <a href={authHref("/login", nextPath())}>Log in instead</a></>);
    setCheck(true);
  };

  if (check) return <CheckEmail email={email.trim()} kind="signup" onBack={() => { setCheck(false); setTried(false); }} />;

  return (
    <div className="auth-card">
      <Head title="Create your account">Already have an account? <a href={loginHref}>Log in</a></Head>
      <Alert>{err}</Alert>
      <form className="auth-form" onSubmit={submit}>
        <EmailField id="signup-email" label="Work email" value={email} onChange={(v) => { setEmail(v); setEmailErr(""); }} error={emailErr} />
        <PasswordField
          id="signup-password" label="Password" value={password} onChange={setPassword} autoComplete="new-password"
          error={tried ? pwProblem : null} hint={`At least ${MIN_PASSWORD} characters. A short phrase is easy to remember.`}
        />
        <Submit busy={busy === "signup"} label="Create account" busyLabel="Creating account…" disabled={busy !== null} />
      </form>
      <Providers busy={busy} setBusy={setBusy} setErr={setErr} />
      <p className="auth-fine auth-center">By creating an account you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
    </div>
  );
}

/* ---------- Forgot password ---------- */

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useCountdown();
  useLinkError(setErr, "That reset link has expired or was already used. Ask for a new one below.");

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy(true);
    setErr("");
    const { error } = await auth.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback("/reset-password") });
    setBusy(false);
    // Only a rate limit is shown: anything else looks the same as success, so the page never reveals which emails have accounts.
    if (error && RATE_LIMIT.test(error.message)) return setErr("Too many reset emails. Wait a minute and try again.");
    setSent(true);
    setWait(RESEND_AFTER);
  };

  if (sent)
    return (
      <div className="auth-card">
        <Head icon={<MailCheck size={22} />} title="Check your email">
          If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a link to set a new password. It works once and expires after an hour.
        </Head>
        <Alert>{err}</Alert>
        <div className="auth-help">
          <Info size={18} aria-hidden="true" />
          <p><strong>Nothing arrived?</strong> Check your spam folder. If you signed up with Google, Microsoft or GitHub, log in with that instead.</p>
        </div>
        <button type="button" className="btn btn-block auth-secondary" disabled={wait > 0 || busy} onClick={() => send()}>
          {busy ? "Sending…" : wait > 0 ? `Resend link in ${clock(wait)}` : "Resend link"}
        </button>
        <p className="auth-fine auth-center">
          Wrong address? <button type="button" className="link" onClick={() => setSent(false)}>Change email</button> · <a href="/login">Back to log in</a>
        </p>
      </div>
    );

  return (
    <div className="auth-card">
      <Head icon={<KeyRound size={22} />} title="Reset your password">Enter the email you signed up with. We&apos;ll send a link to set a new password.</Head>
      <Alert>{err}</Alert>
      <form className="auth-form" onSubmit={send}>
        <EmailField id="forgot-email" value={email} onChange={setEmail} autoFocus />
        <Submit busy={busy} label="Send reset link" busyLabel="Sending…" />
      </form>
      <p className="auth-fine auth-center"><a href="/login">Back to log in</a></p>
    </div>
  );
}

/* ---------- Set a new password ---------- */

export function ResetForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const rules = [
    { ok: password.length >= MIN_PASSWORD, label: `At least ${MIN_PASSWORD} characters` },
    { ok: !passwordProblem(password) || password.length < MIN_PASSWORD, label: "No more than 72 characters, and not only spaces" },
    { ok: password.length > 0 && password === again, label: "Both passwords match" },
  ];
  const ready = rules.every((r) => r.ok) && !passwordProblem(password);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const auth = browserAuth();
    if (!auth) return setErr(NOT_SET_UP);
    setBusy(true);
    setErr("");
    const { error } = await auth.auth.updateUser({ password });
    if (!error) return go("/dashboard");
    setBusy(false);
    if (error.code === "same_password") return setErr("That's your current password. Choose a different one.");
    if (error.code === "weak_password") return setErr(error.message);
    if (error.code === "session_not_found" || error.code === "session_expired" || /session/i.test(error.message))
      return setErr("Your reset link has expired. Ask for a new one from the forgot password page.");
    setErr("We couldn't save your password. Try again in a moment.");
  };

  return (
    <div className="auth-card">
      <Head icon={<ShieldCheck size={22} />} title="Set a new password">Choose a new password for <strong>{email}</strong>. You&apos;ll stay signed in on this device.</Head>
      <Alert>{err}</Alert>
      <form className="auth-form" onSubmit={save}>
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <PasswordField id="reset-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField id="reset-again" label="Type it again" value={again} onChange={setAgain} autoComplete="new-password" />
        <ul className="auth-rules" aria-label="Password rules">
          {rules.map((r) => (
            <li key={r.label} className={r.ok ? "is-ok" : ""}><Check size={14} aria-hidden="true" /> {r.label}<span className="sr-only">{r.ok ? " (done)" : " (not yet)"}</span></li>
          ))}
        </ul>
        <Submit busy={busy} label="Save new password" busyLabel="Saving…" disabled={!ready} />
      </form>
    </div>
  );
}
