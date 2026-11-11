"use client";

import { useMemo, useState } from "react";
import UrlForm from "@/components/UrlForm";
import { CopyBlock } from "@/components/ui";
import { api } from "@/lib/client";
import { botAccess, parseRobots } from "@/lib/robots";
import { BOT_GROUPS, buildRobotsTxt, DEFAULT_ROBOTS, type Choice, type RobotsOptions } from "@/lib/gen/robots";
import type { RobotsFetch } from "@/app/api/robots-txt/route";

const PURPOSE: Record<string, string> = {
  "classic-search": "Search engine",
  search: "AI search",
  "user-fetch": "AI assistant (on request)",
  training: "AI training",
};

const GROUPS: { key: "aiSearch" | "fetchers" | "training"; title: string; help: string }[] = [
  { key: "aiSearch", title: "AI search bots", help: "Build the indexes ChatGPT, Claude and Perplexity search. Block them and you can't be cited there." },
  { key: "fetchers", title: "AI assistants opening a page", help: "Visit a page when a user asks about it, e.g. pastes your link into ChatGPT." },
  { key: "training", title: "AI training crawlers", help: "Collect content to train future models. Blocking them is a business choice and doesn't stop citations." },
];

export default function RobotsTool() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState<RobotsFetch | null>(null);
  const [path, setPath] = useState("/");
  const [opts, setOpts] = useState<RobotsOptions>(DEFAULT_ROBOTS);
  const [paths, setPaths] = useState("");

  const run = async (url: string) => {
    setLoading(true);
    setError("");
    setFetched(null);
    try {
      const r = await api<RobotsFetch>(`/api/robots-txt?url=${encodeURIComponent(url)}`);
      setFetched(r);
      // Start the generator from what the site does today.
      const parsed = r.found ? parseRobots(r.body) : null;
      const access = botAccess(parsed, "/");
      const choice = (bots: string[]): Choice =>
        access.filter((a) => bots.includes(a.bot)).every((a) => a.allowed) ? "allow" : "block";
      setOpts({
        aiSearch: choice(BOT_GROUPS.aiSearch),
        fetchers: choice(BOT_GROUPS.fetchers),
        training: choice(BOT_GROUPS.training),
        disallow: [],
        sitemap: parsed?.sitemaps[0] ?? `${r.origin}/sitemap.xml`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load robots.txt.");
    } finally {
      setLoading(false);
    }
  };

  const parsed = useMemo(() => (fetched?.found ? parseRobots(fetched.body) : null), [fetched]);
  const testPath = path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;
  const access = useMemo(() => (fetched ? botAccess(parsed, testPath) : []), [fetched, parsed, testPath]);
  const blockedAi = access.filter((a) => !a.allowed && (a.purpose === "search" || a.purpose === "user-fetch" || a.purpose === "classic-search"));
  const output = buildRobotsTxt({ ...opts, disallow: paths.split("\n") });

  return (
    <div className="tool">
      <UrlForm id="robots-url" button="Check robots.txt" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}

      {fetched && (
        <div className="tool-result card">
          <h3>What {new URL(fetched.origin).hostname}&apos;s robots.txt allows</h3>
          <div className={`aiview-verdict ${!fetched.found ? "info" : blockedAi.length ? "bad" : "good"}`}>
            {!fetched.found
              ? `No robots.txt found${fetched.error ? ` (${fetched.error})` : fetched.status ? ` (HTTP ${fetched.status})` : ""}. Every crawler is allowed by default.`
              : blockedAi.length
                ? `${blockedAi.length} search or AI assistant crawler${blockedAi.length === 1 ? " is" : "s are"} blocked from ${testPath}: ${blockedAi.map((b) => b.bot).join(", ")}.`
                : `Search engines and AI assistants are allowed to read ${testPath}.`}
          </div>
          <div className="row tool-path">
            <label htmlFor="robots-path" className="small">Test a path</label>
            <input id="robots-path" className="field" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/blog/" />
          </div>
          <div className="table-wrap">
            <table className="bottest-table">
              <thead><tr><th>Crawler</th><th>Type</th><th>Result</th><th>Matched rule group</th></tr></thead>
              <tbody>
                {access.map((a) => (
                  <tr key={a.bot}>
                    <td><code>{a.bot}</code></td>
                    <td className="small">{PURPOSE[a.purpose]}</td>
                    <td><span className={`livestat livestat-${a.allowed ? "ok" : "blocked"}`}>{a.allowed ? "Allowed" : "Blocked"}</span></td>
                    <td className="small muted mono">{a.matchedGroup === "*" ? "User-agent: *" : a.matchedGroup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted tiny">
            robots.txt is only half the story: a firewall or CDN can still block a crawler that robots.txt allows.{" "}
            <a href="/tools/ai-bot-checker">Test live access with the AI Bot Checker</a>.
          </p>
          {fetched.found && (
            <details className="tool-raw">
              <summary>Show the current file</summary>
              <pre>{fetched.body}</pre>
            </details>
          )}
        </div>
      )}

      <div className="tool-result card" id="generator">
        <h3>Build a robots.txt</h3>
        <p className="muted small">Search engines such as Googlebot and Bingbot are always allowed. Choose what AI crawlers may do.</p>
        <div className="gen-groups">
          {GROUPS.map((g) => (
            <div key={g.key} className="gen-group">
              <div>
                <strong>{g.title}</strong>
                <p className="muted small">{g.help}</p>
                <p className="tiny mono muted">{BOT_GROUPS[g.key].join(", ")}</p>
              </div>
              <div className="choice" role="radiogroup" aria-label={g.title}>
                {(["allow", "block"] as Choice[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={opts[g.key] === c}
                    className={opts[g.key] === c ? "on" : ""}
                    onClick={() => setOpts({ ...opts, [g.key]: c })}
                  >
                    {c === "allow" ? "Allow" : "Block"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="gen-fields">
          <label>
            <span className="small">Paths to keep out of search (one per line)</span>
            <textarea className="field" rows={3} value={paths} onChange={(e) => setPaths(e.target.value)} placeholder={"/admin/\n/cart/"} />
          </label>
          <label>
            <span className="small">Sitemap URL</span>
            <input className="field" value={opts.sitemap} onChange={(e) => setOpts({ ...opts, sitemap: e.target.value })} placeholder="https://yoursite.com/sitemap.xml" />
          </label>
        </div>
        <CopyBlock content={output} filename="robots.txt" />
        <p className="muted tiny">Upload it to the root of your site so it opens at yoursite.com/robots.txt. On WordPress, an SEO plugin can edit it for you.</p>
      </div>
    </div>
  );
}
