"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { analyzeLogs, type LogReport } from "@/lib/gen/logs";
import { track } from "@/lib/track";

const SAMPLE = `66.249.66.1 - - [06/Nov/2026:10:01:02 +0000] "GET /pricing HTTP/1.1" 200 5120 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
20.171.207.2 - - [06/Nov/2026:10:02:10 +0000] "GET /blog/what-is-geo HTTP/1.1" 200 9120 "-" "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot"
20.171.207.9 - - [06/Nov/2026:10:02:44 +0000] "GET /blog/what-is-geo HTTP/1.1" 200 9120 "-" "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot"
34.162.0.1 - - [06/Nov/2026:10:05:00 +0000] "GET / HTTP/1.1" 403 512 "-" "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"
3.7.1.1 - - [06/Nov/2026:10:06:00 +0000] "GET /docs/setup HTTP/1.1" 200 7001 "-" "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"
81.2.69.1 - - [06/Nov/2026:10:07:30 +0000] "GET /pricing HTTP/2" 200 5120 "https://chatgpt.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15"
81.2.69.7 - - [06/Nov/2026:10:09:12 +0000] "GET /blog/what-is-geo HTTP/2" 200 9120 "https://www.perplexity.ai/" "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari/604.1"`;

const PURPOSE: Record<string, string> = { search: "AI search", "user-fetch": "User asked", training: "Training", "classic-search": "Search engine" };

export default function LogTool() {
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  const [r, setR] = useState<LogReport | null>(null);

  const run = (t: string) => {
    setR(analyzeLogs(t));
    track("Tool used", { tool: "log-analyzer" });
  };

  return (
    <div className="tool regex-tool">
      <div className="card">
        <h3>Your access log</h3>
        <p className="muted small">Download it from your host (cPanel: Metrics → Raw Access; nginx: /var/log/nginx/access.log), then drop it here or paste lines. It&apos;s read in your browser and never uploaded.</p>
        <label className="log-drop">
          <Upload size={20} aria-hidden="true" />
          <span>{file || "Choose a .log or .txt file (up to about 200 MB)"}</span>
          <input type="file" accept=".log,.txt,.json,.jsonl,text/plain" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFile(f.name);
            const t = await f.text();
            setText("");
            run(t);
          }} />
        </label>
        <label className="regex-extra" htmlFor="log-text">
          <span>Or paste log lines</span>
          <textarea id="log-text" className="field" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder='66.249.66.1 - - [06/Nov/2026:10:01:02 +0000] "GET / HTTP/1.1" 200 5120 "-" "Mozilla/5.0 (compatible; Googlebot/2.1)"' />
        </label>
        <div className="row wrap">
          <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => run(text)}>Analyse</button>
          <button type="button" className="link-btn" onClick={() => { setText(SAMPLE); setFile(""); run(SAMPLE); }}>Try a sample</button>
        </div>
      </div>

      {r && (
        <>
          <div className="card">
            <h3>{r.bots.length ? `${r.bots.length} crawlers found` : "No known crawlers found"}</h3>
            <p className="muted small">Read {r.parsed.toLocaleString()} of {r.lines.toLocaleString()} lines.{r.parsed < r.lines * 0.5 ? " Many lines didn't match a known log format; make sure the user agent is included." : ""}</p>
            {r.bots.length > 0 && (
              <div className="table-wrap">
                <table className="bots">
                  <thead><tr><th>Crawler</th><th>Type</th><th>Requests</th><th>Pages</th><th>Blocked</th><th>Most read</th></tr></thead>
                  <tbody>
                    {r.bots.map((b) => (
                      <tr key={b.bot}>
                        <td><code>{b.bot}</code><div className="tiny muted">{b.owner}</div></td>
                        <td><span className={`tag p-${b.purpose}`}>{PURPOSE[b.purpose] ?? b.purpose}</span></td>
                        <td>{b.hits.toLocaleString()}</td>
                        <td>{b.pages.toLocaleString()}</td>
                        <td className={b.blocked ? "c-fail" : "muted"}>{b.blocked ? `${b.blocked} (403/429)` : "0"}</td>
                        <td className="small">{b.topPaths.slice(0, 3).map(([p, n]) => <div key={p}><code>{p}</code> ×{n}</div>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {r.bots.some((b) => b.blocked && b.purpose !== "training") && (
              <p className="c-fail small">Some AI search or user-triggered crawlers got 403 or 429 errors. That usually means a firewall or CDN rule is blocking them; check with the <a href="/tools/ai-bot-checker">AI bot checker</a>.</p>
            )}
          </div>
          <div className="card">
            <h3>Visits sent by AI assistants</h3>
            {r.referrals.length ? (
              <ul className="plain">
                {r.referrals.map((x) => (
                  <li key={x.source} className="log-ref"><strong>{x.source}</strong> {x.visits.toLocaleString()} visit{x.visits === 1 ? "" : "s"} <span className="muted small">to {x.topPaths.map(([p]) => p).slice(0, 3).join(", ")}</span></li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No visits with an AI assistant as the referrer. Many AI apps don&apos;t send one, so this is a minimum.</p>
            )}
          </div>
        </>
      )}
      <p className="muted tiny">Anyone can fake a user agent. To be sure a visit came from the real crawler, check its IP against the ranges each company publishes (OpenAI, Anthropic, Perplexity, Google and Microsoft all do).</p>
    </div>
  );
}
