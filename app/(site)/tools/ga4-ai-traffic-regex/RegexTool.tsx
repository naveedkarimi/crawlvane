"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { AI_SOURCES, buildAiRegex, matchesAi } from "@/lib/gen/aiReferrers";
import { track } from "@/lib/track";

export default function RegexTool() {
  const [picked, setPicked] = useState<string[]>(AI_SOURCES.filter((s) => s.default).map((s) => s.name));
  const [extra, setExtra] = useState("");
  const [test, setTest] = useState("https://chatgpt.com/");
  const [copied, setCopied] = useState(false);

  const hosts = useMemo(
    () => [...AI_SOURCES.filter((s) => picked.includes(s.name)).flatMap((s) => s.hosts), ...extra.split(/[\s,]+/).map((h) => h.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))],
    [picked, extra],
  );
  const regex = buildAiRegex(hosts);
  const hit = test.trim() ? matchesAi(regex, test) : null;

  return (
    <div className="tool regex-tool">
      <div className="card">
        <h3>1. Pick the AI assistants</h3>
        <div className="regex-sources">
          {AI_SOURCES.map((s) => (
            <label key={s.name} className="check-mark" title={s.note}>
              <input type="checkbox" checked={picked.includes(s.name)} onChange={() => setPicked((p) => (p.includes(s.name) ? p.filter((x) => x !== s.name) : [...p, s.name]))} />
              <span>{s.name} <span className="muted tiny">{s.hosts.join(", ")}</span></span>
            </label>
          ))}
        </div>
        <label className="regex-extra" htmlFor="regex-extra">
          <span>Other hosts <span className="muted">(optional, comma separated)</span></span>
          <input id="regex-extra" className="field" placeholder="assistant.example.com" value={extra} onChange={(e) => setExtra(e.target.value)} />
        </label>
      </div>

      <div className="card">
        <h3>2. Copy the regex</h3>
        <div className="regex-out">
          <code>{regex || "Pick at least one assistant"}</code>
          <button type="button" className="btn btn-primary" disabled={!regex} onClick={async () => {
            await navigator.clipboard.writeText(regex);
            setCopied(true);
            track("Tool used", { tool: "ga4-regex" });
            setTimeout(() => setCopied(false), 1800);
          }}>
            {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
          </button>
        </div>
        <p className="muted tiny">{regex.length} characters. It matches each host and its subdomains, such as www.</p>
        <label className="regex-extra" htmlFor="regex-test">
          <span>Test a referrer or session source</span>
          <input id="regex-test" className="field" value={test} onChange={(e) => setTest(e.target.value)} />
        </label>
        {hit !== null && <p className={hit ? "c-pass small" : "c-fail small"} role="status">{hit ? "Matches: this visit would count as AI traffic." : "No match."}</p>}
      </div>

      <div className="card">
        <h3>3. Add it to GA4</h3>
        <ol className="regex-steps">
          <li>In GA4, open <strong>Admin</strong>, then <strong>Data display</strong>, then <strong>Channel groups</strong>.</li>
          <li>Copy the default channel group so nothing else changes, and open the copy.</li>
          <li>Add a channel called <strong>AI assistants</strong> with the condition <em>Session source</em> <strong>matches regex</strong>, and paste the regex.</li>
          <li>Drag it <strong>above Referral</strong> so it&apos;s matched first, then save.</li>
          <li>Open <strong>Reports</strong>, <strong>Acquisition</strong>, <strong>Traffic acquisition</strong> and switch to your new channel group.</li>
        </ol>
        <p className="muted tiny">Channel groups apply to new data from the day you save them. For past data, use the same regex as a filter in an Exploration.</p>
      </div>
    </div>
  );
}
