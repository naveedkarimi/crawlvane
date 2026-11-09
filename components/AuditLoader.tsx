"use client";

import { useEffect, useState } from "react";
import { Bot, Check, FileSearch, FileText, Globe, ListChecks, Loader2, MessageCircleQuestion, Wrench } from "lucide-react";

/** What the audit does, in the order it happens. Shown while /api/audit runs. */
export const AUDIT_STEPS = [
  { icon: Globe, text: "Opening the page the way search engines and AI crawlers do" },
  { icon: FileText, text: "Reading robots.txt, the sitemap and llms.txt" },
  { icon: Bot, text: "Checking access for 19 search and AI crawlers" },
  { icon: FileSearch, text: "Reading the title, headings, text and structured data" },
  { icon: MessageCircleQuestion, text: "Looking for questions and short, quotable answers" },
  { icon: ListChecks, text: "Scoring about 50 SEO, answer and AI search checks" },
  { icon: Wrench, text: "Writing your fixes, most important first" },
];

export const STEP_MS = 850;
/** Minimum time on screen, so every step can be read. */
export const MIN_LOADER_MS = AUDIT_STEPS.length * STEP_MS;

/**
 * Steps tick off one by one. If the audit is slower than the steps, the last step
 * keeps spinning until the result arrives. Announced politely to screen readers.
 */
export default function AuditLoader({ url }: { url: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, AUDIT_STEPS.length - 1)), STEP_MS);
    return () => clearInterval(t);
  }, []);
  let host = url;
  try {
    host = new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  const pct = Math.round(((step + 0.6) / AUDIT_STEPS.length) * 100);

  return (
    <div className="audit-loader" role="status" aria-live="polite">
      <div className="audit-loader-head">
        <span className="audit-loader-orb" aria-hidden="true"><Loader2 size={22} className="spin" /></span>
        <div>
          <strong>Checking {host}</strong>
          <span>{AUDIT_STEPS[step].text}…</span>
        </div>
        <b className="audit-loader-pct">{pct}%</b>
      </div>
      <div className="audit-loader-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <ol className="audit-loader-steps">
        {AUDIT_STEPS.map((s, i) => {
          const Icon = s.icon;
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li key={s.text} className={state}>
              <span className="step-icon" aria-hidden="true">
                {state === "done" ? <Check size={14} strokeWidth={3} /> : state === "active" ? <Loader2 size={14} className="spin" /> : <Icon size={14} />}
              </span>
              {s.text}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
