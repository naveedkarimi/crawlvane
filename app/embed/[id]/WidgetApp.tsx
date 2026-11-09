"use client";

import { useEffect, useRef, useState } from "react";

interface Summary {
  url: string;
  title: string;
  scores: { overall: number; seo: number; aeo: number; geo: number };
  issues: number;
  top: { title: string; status: "fail" | "warn"; detail: string; category: string }[];
}

const LABEL: Record<string, string> = { seo: "SEO", aeo: "Answer engines", geo: "AI search" };

/** The audit widget agencies embed (inside an iframe from /widget.js). Branded with their colour and logo. */
export default function WidgetApp(props: {
  id: string;
  agency: string;
  color: string;
  logoUrl?: string;
  ctaText: string;
  ctaUrl?: string;
  poweredBy: { name: string; url: string } | null;
}) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState<Summary | null>(null);
  const root = useRef<HTMLElement>(null);

  // Tell the parent page how tall we are, so the iframe never scrolls.
  useEffect(() => {
    const el = root.current;
    if (!el || window.parent === window) return;
    const post = () => window.parent.postMessage({ type: "crawlvane:height", height: Math.ceil(el.getBoundingClientRect().height) + 4 }, "*");
    const ro = new ResizeObserver(post);
    ro.observe(el);
    post();
    return () => ro.disconnect();
  }, []);

  const tone = (n: number) => (n >= 85 ? "good" : n >= 60 ? "ok" : "bad");

  return (
    <main ref={root} className="embed-root" style={{ ["--w" as string]: props.color }}>
      <header className="embed-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {props.logoUrl ? <img src={props.logoUrl} alt={props.agency} height={32} /> : <strong>{props.agency}</strong>}
        <span>Free website check</span>
      </header>

      {!r ? (
        <form
          className="embed-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr("");
            try {
              const res = await fetch(`/api/widgets/${props.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, email, name, website: hp }) });
              const d = await res.json();
              if (!res.ok) throw new Error(d.error || "The check failed.");
              setR(d);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "The check failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h1>How does your website do on Google and in AI answers?</h1>
          <p>Get your score for search engines, answer engines and AI assistants in about 20 seconds.</p>
          <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} />
          <label>
            <span>Website</span>
            <input required inputMode="url" placeholder="example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <div className="embed-row">
            <label>
              <span>Name <em>(optional)</em></span>
              <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <button disabled={busy}>{busy ? "Checking your site…" : "Check my website"}</button>
          {err && <p className="embed-err" role="alert">{err}</p>}
          <p className="embed-note">{props.agency} will receive your email and results so they can follow up.</p>
        </form>
      ) : (
        <div className="embed-result" aria-live="polite">
          <div className="embed-score">
            <div className={`embed-ring ${tone(r.scores.overall)}`}><strong>{r.scores.overall}</strong><span>/100</span></div>
            <div>
              <h1>{r.title || r.url}</h1>
              <p>{r.issues} things to improve on {r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
            </div>
          </div>
          <dl className="embed-cats">
            {(["seo", "aeo", "geo"] as const).map((k) => (
              <div key={k} className={tone(r.scores[k])}><dt>{LABEL[k]}</dt><dd>{r.scores[k]}</dd></div>
            ))}
          </dl>
          <h2>Top issues</h2>
          <ul className="embed-issues">
            {r.top.map((t) => (
              <li key={t.title} className={t.status}><strong>{t.title}</strong><span>{t.detail}</span></li>
            ))}
          </ul>
          {props.ctaUrl ? (
            <a className="embed-cta" href={props.ctaUrl} target="_top" rel="noopener">{props.ctaText}</a>
          ) : (
            <p className="embed-cta-note">{props.agency} will be in touch about your results.</p>
          )}
          <button type="button" className="embed-again" onClick={() => { setR(null); setUrl(""); }}>Check another site</button>
        </div>
      )}
      {props.poweredBy && (
        <p className="embed-powered">Powered by <a href={props.poweredBy.url} target="_blank" rel="noopener">{props.poweredBy.name}</a></p>
      )}
    </main>
  );
}
