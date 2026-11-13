"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Bot, Check, ChevronLeft, ChevronRight, ClipboardCheck, Headset, X } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

/*
 * The navy panel beside every sign-in page: a white example card with a small card floating over
 * its corner, then a heading and a line of text, with dots to move between three slides.
 * Every number here is an illustration, labelled "Example". None of it is anyone's real data.
 */

function ScoreCard() {
  const r = 26, c = 2 * Math.PI * r;
  const rows = [["SEO", 91, "good"], ["AEO", 74, "warn"], ["GEO", 48, "bad"]] as const;
  return (
    <div className="show-score">
      <svg className="show-ring" viewBox="0 0 64 64" width="84" height="84" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="show-ring-track" />
        <circle cx="32" cy="32" r={r} className="show-ring-fill" strokeDasharray={`${0.72 * c} ${c}`} transform="rotate(-90 32 32)" />
        <text x="32" y="33" textAnchor="middle" dominantBaseline="middle">72</text>
      </svg>
      <ul className="show-bars">
        {rows.map(([label, score, tone]) => (
          <li key={label}>
            <span>{label}</span>
            <span className="show-bar"><span className={`is-${tone}`} style={{ width: `${score}%` }} /></span>
            <strong>{score}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FixCard() {
  return (
    <div className="show-fix">
      <p className="show-issue"><X size={14} aria-hidden="true" /> GPTBot is blocked in robots.txt</p>
      <pre><span># Paste into robots.txt</span>{"\n"}User-agent: GPTBot{"\n"}Allow: /</pre>
    </div>
  );
}

function BotsCard() {
  const bots = [["GPTBot", false], ["ClaudeBot", true], ["PerplexityBot", true], ["Google-Extended", true]] as const;
  return (
    <ul className="show-bots">
      {bots.map(([name, ok]) => (
        <li key={name}>
          <span className="show-bot-name"><Bot size={15} aria-hidden="true" /> {name}</span>
          <span className={ok ? "is-ok" : "is-no"}>{ok ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />} {ok ? "Allowed" : "Blocked"}</span>
        </li>
      ))}
    </ul>
  );
}

const SLIDES: { card: string; visual: ReactNode; chipIcon: ReactNode; chipLabel: string; chipValue: string; title: ReactNode; text: string }[] = [
  {
    card: "Your site, scored three ways", visual: <ScoreCard />, chipIcon: <BarChart3 size={18} />, chipLabel: "Overall score", chipValue: "72 / 100",
    title: <>Get found on search engines<br />and in AI.</>,
    text: "One check covers search engines, answer engines and AI assistants like ChatGPT, Perplexity and Gemini.",
  },
  {
    card: "A fix for every issue", visual: <FixCard />, chipIcon: <ClipboardCheck size={18} />, chipLabel: "Fix", chipValue: "Ready to paste",
    title: "Ready-to-paste fixes, not just numbers",
    text: "Each issue comes with the exact code or text to change. Paste it in, then re-check to see the score move.",
  },
  {
    card: "Which AI bots can read you", visual: <BotsCard />, chipIcon: <Bot size={18} />, chipLabel: "AI crawlers allowed", chipValue: "3 of 4",
    title: "Know which AI assistants can read your site",
    text: "See which AI crawlers your robots.txt lets in, and what to change so assistants can quote you.",
  },
];
const EVERY_MS = 7000;

export function AuthBrand() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), EVERY_MS);
    return () => clearTimeout(t);
  }, [i, paused]);
  const move = (d: number) => setI((n) => (n + d + SLIDES.length) % SLIDES.length);
  const s = SLIDES[i];

  return (
    <aside className="auth-brand" aria-label={`What ${BRAND.name} does`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="auth-brand-top">
        <a href={BRAND.contactUrl} className="auth-support"><Headset size={18} aria-hidden="true" /> Support</a>
      </div>
      <div className="auth-show" key={i}>
        <div className="show-stage">
          <figure className="show-card">
            <div className="show-card-head">
              <h2>{s.card}</h2>
              <span className="show-tag">Example</span>
            </div>
            {s.visual}
          </figure>
          <div className="show-chip" aria-hidden="true">
            <span className="show-chip-icon">{s.chipIcon}</span>
            <span><small>{s.chipLabel}</small><strong>{s.chipValue}</strong></span>
          </div>
        </div>
        <div className="show-copy" aria-live="polite">
          <p className="show-title">{s.title}</p>
          <p className="show-text">{s.text}</p>
        </div>
      </div>
      <div className="show-nav">
        <button type="button" onClick={() => move(-1)} aria-label="Previous slide"><ChevronLeft size={16} aria-hidden="true" /></button>
        {SLIDES.map((_, n) => (
          <button key={n} type="button" className={`show-dot${n === i ? " is-on" : ""}`} onClick={() => setI(n)} aria-label={`Show slide ${n + 1} of ${SLIDES.length}`} aria-current={n === i} />
        ))}
        <button type="button" onClick={() => move(1)} aria-label="Next slide"><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </aside>
  );
}

/** The logo at the top of the form column. */
export function AuthLogo() {
  return (
    <div className="auth-top">
      <a href="/" className="logo auth-logo"><LogoMark size={34} /><span className="logo-word">{BRAND.name}</span></a>
    </div>
  );
}
