"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/client";
import { subscribeNewsletter } from "@/lib/newsletterClient";
import { track } from "@/lib/track";

type Kind = "waitlist" | "fix" | "contact" | "newsletter";

const DONE: Record<Kind, string> = {
  waitlist: "You're on the list. We'll email you once when Pro opens, and that's it.",
  fix: "Thanks. We'll look at the report and reply within two working days with what we'd fix and a price.",
  contact: "Thanks, your message is in. We reply within two working days.",
  newsletter: "You're subscribed. Every email has an unsubscribe link.",
};

/**
 * One form for the ways we collect an email: the Pro waitlist and newsletter (email only),
 * "fix it for me" requests from a report, and the contact page.
 */
export default function LeadForm({ kind, url, compact = false, cta }: { kind: Kind; url?: string; compact?: boolean; cta?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [site, setSite] = useState(url ?? "");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  // /contact?topic=… (from "Ask about a pilot" and similar links) starts the message for you.
  useEffect(() => {
    if (kind !== "contact") return;
    const topic = new URLSearchParams(window.location.search).get("topic");
    if (topic) setMessage((m) => m || `${topic.slice(0, 200)}\n\n`);
  }, [kind]);

  if (done)
    return (
      <p className="lead-done" role="status">
        <CheckCircle2 size={18} aria-hidden="true" /> {DONE[kind]}
      </p>
    );

  const id = (f: string) => `lead-${kind}-${f}`;
  const emailOnly = kind === "waitlist" || kind === "newsletter";
  return (
    <form
      className={`lead-form lead-${kind} ${compact ? "compact" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
          if (kind === "newsletter") {
            if (!hp) await subscribeNewsletter(email, window.location.pathname);
          } else {
            await api("/api/leads", {
              method: "POST",
              body: JSON.stringify({ kind, email, name, message, url: site || url, website: hp, source: window.location.pathname }),
            });
          }
          track(kind === "newsletter" ? "Newsletter joined" : kind === "waitlist" ? "Waitlist joined" : kind === "fix" ? "Fix requested" : "Contact sent");
          setDone(true);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={hp} onChange={(e) => setHp(e.target.value)} />
      {!emailOnly && (
        <div className="lead-row">
          <label htmlFor={id("name")}>
            <span>Name <span className="muted">(optional)</span></span>
            <input id={id("name")} className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label htmlFor={id("email")}>
            <span>Email</span>
            <input id={id("email")} className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
      )}
      {kind === "contact" && (
        <label htmlFor={id("site")}>
          <span>Website <span className="muted">(optional)</span></span>
          <input id={id("site")} className="field" inputMode="url" placeholder="example.com" value={site} onChange={(e) => setSite(e.target.value)} />
        </label>
      )}
      {!emailOnly && (
        <label htmlFor={id("msg")}>
          <span>{kind === "fix" ? "Anything we should know?" : "Message"} {kind === "fix" && <span className="muted">(optional)</span>}</span>
          <textarea id={id("msg")} className="field" rows={kind === "fix" ? 3 : 5} required={kind === "contact"} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder={kind === "fix" ? "Your CMS (WordPress, Shopify, Webflow…), deadlines, budget" : ""} />
        </label>
      )}
      <div className="lead-submit">
        {emailOnly && (
          <>
            <label htmlFor={id("email")} className="sr-only">Email</label>
            <input id={id("email")} className="field" type="email" required autoComplete="email" data-lpignore="true" data-1p-ignore placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Sending…" : cta ?? (kind === "newsletter" ? "Subscribe" : kind === "waitlist" ? "Join the waitlist" : kind === "fix" ? "Ask for a quote" : "Send message")} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      {err && <p className="c-fail small" role="alert">{err}</p>}
      <p className="lead-note tiny muted">
        {kind === "newsletter" ? "SEO and AI search tips by email. Unsubscribe any time." : `We only use your email to reply${kind === "waitlist" ? " and tell you when Pro opens" : ""}.`} See the <a href="/privacy">privacy policy</a>.
      </p>
    </form>
  );
}
