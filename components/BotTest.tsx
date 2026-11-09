"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import type { BotTestResult, LiveStatus } from "@/lib/botTest";
import { api } from "@/lib/client";

const LIVE_LABEL: Record<LiveStatus, string> = {
  ok: "Gets the page",
  blocked: "Blocked",
  challenge: "Bot challenge",
  different: "Different page",
  error: "No response",
};
const PURPOSE_LABEL: Record<string, string> = {
  "classic-search": "Search engine",
  search: "AI search",
  "user-fetch": "AI assistant (on request)",
  training: "AI training",
  browser: "Baseline",
};

/** "Can AI bots actually load your page?" Runs on click, or straight away with autoRun. */
export default function BotTest({ url, autoRun = false }: { url: string; autoRun?: boolean }) {
  const [res, setRes] = useState<BotTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      setRes(await api<BotTestResult>(`/api/bot-test?url=${encodeURIComponent(url)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bot test failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRes(null);
    setError("");
    if (autoRun && url) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, autoRun]);

  return (
    <div className="card bottest">
      <div className="bottest-head">
        <h3><ShieldCheck size={18} /> Can AI bots actually load your page?</h3>
        <p className="muted small">
          robots.txt is only half the story. Firewalls and CDNs (Cloudflare blocks AI crawlers by default on new sites) can turn bots away
          even when robots.txt allows them. We request the page as each crawler and compare it with a normal browser.
        </p>
      </div>

      {!res && !loading && !error && (
        <div className="speed-empty">
          <button type="button" className="primary" onClick={run}>Test AI bot access</button>
          <span className="muted small">14 requests, about 10 seconds.</span>
        </div>
      )}
      {loading && (
        <div className="speed-empty">
          <Loader2 size={22} className="spin" />
          <p>Requesting the page as Googlebot, GPTBot, ClaudeBot, PerplexityBot and others…</p>
        </div>
      )}
      {error && !loading && (
        <div className="error">{error} <button type="button" className="link" onClick={run}>Try again</button></div>
      )}

      {res && !loading && (
        <>
          <div className={`aiview-verdict ${res.summary.verdict}`}>{res.summary.text}</div>
          {res.summary.conflicts > 0 && (
            <p className="bottest-conflict">
              {res.summary.conflicts} crawler{res.summary.conflicts === 1 ? " is" : "s are"} allowed in robots.txt but blocked when they visit.
              That usually means a firewall or CDN rule. In Cloudflare, check Security → Bots → &ldquo;AI Scrapers and Crawlers&rdquo;.
            </p>
          )}
          <div className="table-wrap">
            <table className="bottest-table">
              <thead>
                <tr><th>Crawler</th><th>Type</th><th>robots.txt</th><th>Live visit</th><th>Details</th></tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.bot} className={r.purpose === "browser" ? "baseline" : ""}>
                    <td><code>{r.bot}</code></td>
                    <td className="small">{PURPOSE_LABEL[r.purpose] ?? r.purpose}</td>
                    <td className={r.robotsAllowed === false ? "c-fail" : r.robotsAllowed ? "c-pass" : "muted"}>
                      {r.robotsAllowed === null ? "n/a" : r.robotsAllowed ? "Allowed" : "Disallowed"}
                    </td>
                    <td><span className={`livestat livestat-${r.live}`}>{LIVE_LABEL[r.live]}</span></td>
                    <td className="small muted">{r.status ? `HTTP ${r.status} · ` : ""}{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted tiny">
            We send each crawler&apos;s user-agent from our server. Some firewalls also verify that a request really comes from the AI company&apos;s IP
            addresses, so a block here can mean &ldquo;blocks bots pretending to be GPTBot&rdquo;. Confirm in your CDN&apos;s bot settings.
            {!res.robotsTxtFound && " No robots.txt was found, so robots rules allow everything."}
          </p>
        </>
      )}
    </div>
  );
}
