"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Report } from "@/lib/reportTypes";

const PACE_MS = 450;
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/**
 * Live view of a running report. Every line is a real event from the server. Lines appear
 * one at a time so they can be read, and bigger backlogs move faster to catch up.
 */
export default function ReportProgress({ report, onDone }: { report: Report; onDone: () => void }) {
  const { log, stages = [] } = report.progress;
  const finished = report.status === "done";
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown < log.length) {
      const step = Math.ceil((log.length - shown) / 15);
      const t = setTimeout(() => setShown((s) => Math.min(log.length, s + step)), PACE_MS);
      return () => clearTimeout(t);
    }
    if (finished) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
  }, [shown, log.length, finished, onDone]);

  const allDone = finished && shown >= log.length;
  let active = 0;
  stages.forEach((s, i) => {
    if (s.at !== undefined && s.at < Math.max(shown, 1)) active = i;
  });
  const stage = stages[active];
  const within = stage?.total && stage.at !== undefined ? Math.min(1, Math.max(0, shown - stage.at) / stage.total) : 0.5;
  const pct = allDone ? 100 : stages.length ? Math.round(((active + within) / stages.length) * 100) : 4;
  const latest = shown > 0 ? log[shown - 1].slice(9) : report.progress.step;

  return (
    <div className="card progress-card">
      <h2>Building your report for {host(report.input.url)}</h2>
      <p className="muted" aria-live="polite">{latest}</p>
      <div className="bar-outer" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Report progress">
        <div className="bar-inner" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
      {stages.length > 0 && (
        <ol className="progress-stages">
          {stages.map((s, i) => {
            const state = allDone || i < active ? "done" : i === active ? "now" : "next";
            return (
              <li key={s.id} className={state}>
                <span className="progress-icon" aria-hidden="true">
                  {state === "done" ? <Check size={15} /> : state === "now" ? <span className="spinner" /> : null}
                </span>
                {s.label}
              </li>
            );
          })}
        </ol>
      )}
      <p className="muted small">You can leave this page open. It updates automatically, and you can bookmark it to come back later.</p>
      <pre className="log">{log.slice(0, shown).slice(-10).join("\n")}</pre>
    </div>
  );
}
