"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Gauge, Loader2, Monitor, Smartphone } from "lucide-react";
import type { PsiResult, Strategy } from "@/lib/pagespeed";
import { api } from "@/lib/client";
import { Ring } from "./ui";

/** Runs the speed test and keeps one result per device, shared by the speed card and "What AI sees". */
export function useSpeedTest(url: string | null | undefined) {
  const [results, setResults] = useState<Partial<Record<Strategy, PsiResult>>>({});
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New URL: forget old results
  useEffect(() => {
    setResults({});
    setError("");
    setStrategy("mobile");
  }, [url]);

  const run = useCallback(
    async (s: Strategy = "mobile") => {
      if (!url) return;
      setStrategy(s);
      setError("");
      if (results[s]) return;
      setLoading(true);
      try {
        const r = await api<PsiResult>(`/api/pagespeed?url=${encodeURIComponent(url)}&strategy=${s}`);
        setResults((prev) => ({ ...prev, [s]: r }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speed test failed");
      } finally {
        setLoading(false);
      }
    },
    [url, results],
  );

  const psi = results[strategy] ?? null;
  const screenshot = results.mobile?.screenshot ?? results.desktop?.screenshot ?? null;
  return { psi, results, strategy, loading, error, run, screenshot };
}

type Speed = ReturnType<typeof useSpeedTest>;

const RATING_LABEL = { good: "Good", ok: "Needs work", bad: "Poor", none: "" } as const;

export default function SpeedTest({ url, speed }: { url: string; speed: Speed }) {
  const { psi, strategy, loading, error, run } = speed;
  const google = `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}&form_factor=${strategy}`;

  return (
    <div className="card speed">
      <div className="speed-head">
        <div>
          <h3><Gauge size={18} /> Speed test</h3>
          <p className="muted small">Google PageSpeed (Lighthouse) and real-user Core Web Vitals, with the fixes that matter most.</p>
        </div>
        <div className="segmented speed-toggle" role="tablist" aria-label="Device">
          {(["mobile", "desktop"] as const).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={strategy === s} className={strategy === s ? "on" : ""} onClick={() => run(s)} disabled={loading}>
              {s === "mobile" ? <Smartphone size={15} /> : <Monitor size={15} />} {s === "mobile" ? "Mobile" : "Desktop"}
            </button>
          ))}
        </div>
      </div>

      {!psi && !loading && !error && (
        <div className="speed-empty">
          <p>Test how fast this page loads for real visitors on {strategy}.</p>
          <button type="button" className="primary" onClick={() => run(strategy)}>Run speed test</button>
          <span className="muted small">Takes about 30 seconds.</span>
        </div>
      )}
      {loading && (
        <div className="speed-empty">
          <Loader2 size={22} className="spin" />
          <p>Testing on {strategy} with Google PageSpeed. This takes about 30 seconds.</p>
        </div>
      )}
      {error && !loading && (
        <div className="error">
          {error} <button type="button" className="link" onClick={() => run(strategy)}>Try again</button>
        </div>
      )}

      {psi && !loading && (
        <>
          <div className="speed-scores">
            {([
              ["performance", "Performance"],
              ["accessibility", "Accessibility"],
              ["bestPractices", "Best practices"],
              ["seo", "SEO"],
            ] as const).map(([k, label]) => (
              <div key={k} className="speed-score">
                <Ring value={psi.scores[k]} size={72} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="speed-metrics">
            <section>
              <h4>Real visitors <span className="muted small">(Chrome users, last 28 days)</span></h4>
              {psi.field.source ? (
                <>
                  <ul className="metric-list">
                    {psi.field.metrics.map((m) => (
                      <li key={m.key} className={`rate-${m.rating}`}>
                        <span className="metric-name" title={m.label}>{m.key}</span>
                        <span className="metric-label">{m.label}</span>
                        <strong>{m.value}</strong>
                        <span className="metric-rating">{RATING_LABEL[m.rating]}</span>
                      </li>
                    ))}
                  </ul>
                  {psi.field.source === "origin" && <p className="muted tiny">Not enough visits to this page alone, so this is data for the whole site.</p>}
                </>
              ) : (
                <p className="muted small">Not enough Chrome visitors yet for real-user data. The lab test on the right still applies.</p>
              )}
            </section>
            <section>
              <h4>Lab test <span className="muted small">({strategy === "mobile" ? "slow 4G phone" : "desktop"})</span></h4>
              <ul className="metric-list">
                {psi.lab.map((m) => (
                  <li key={m.key} className={`rate-${m.rating}`}>
                    <span className="metric-name" title={m.label}>{m.key}</span>
                    <span className="metric-label">{m.label}</span>
                    <strong>{m.value}</strong>
                    <span className="metric-rating">{RATING_LABEL[m.rating]}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="speed-fixes">
            <h4>Top fixes</h4>
            {psi.opportunities.length ? (
              <ol>
                {psi.opportunities.map((o) => (
                  <li key={o.id}>
                    <div className="fix-head">
                      <strong>{o.title}</strong>
                      {o.savings && <span className="tag savings">Saves {o.savings}</span>}
                      <span className="tag">{o.who}</span>
                    </div>
                    <p>{o.what}</p>
                    <p className="fix-how">→ {o.fix}</p>
                    {o.googleTitle !== o.title && <p className="muted tiny">In Google&apos;s report: &ldquo;{o.googleTitle}&rdquo;</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="c-pass small">No major speed fixes found. Nice work.</p>
            )}
          </section>

          <div className="speed-foot">
            <span className="muted tiny">
              Tested {new Date(psi.testedAt).toLocaleString()} {psi.lighthouseVersion && `· Lighthouse ${psi.lighthouseVersion}`}
            </span>
            <a href={google} target="_blank" rel="noopener noreferrer" className="small">
              Full report on PageSpeed Insights <ExternalLink size={13} />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
