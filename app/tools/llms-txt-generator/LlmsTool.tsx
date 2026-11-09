"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import UrlForm from "@/components/UrlForm";
import Checks from "@/components/CheckList";
import { api, download } from "@/lib/client";
import { validateLlmsTxt } from "@/lib/gen/llms";
import type { LlmsToolResult } from "@/lib/gen/llmsSite";

export default function LlmsTool() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<LlmsToolResult | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");

  const run = async (url: string) => {
    setLoading(true);
    setError("");
    setRes(null);
    try {
      const r = await api<LlmsToolResult>(`/api/llms-txt?url=${encodeURIComponent(url)}`);
      setRes(r);
      setText(r.generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the site.");
    } finally {
      setLoading(false);
    }
  };

  const draftChecks = useMemo(() => (text ? validateLlmsTxt(text, res?.origin) : []), [text, res?.origin]);
  const pastedChecks = useMemo(() => (pasted.trim() ? validateLlmsTxt(pasted) : []), [pasted]);

  return (
    <div className="tool">
      <UrlForm id="llms-url" button="Generate llms.txt" loading={loading} onSubmit={run} />
      {loading && (
        <p className="tool-loading"><Loader2 size={16} className="spin" /> Reading your homepage and up to 24 key pages. This takes 10 to 30 seconds.</p>
      )}
      {error && <p className="tool-error" role="alert">{error}</p>}

      {res && (
        <>
          <div className="tool-result card">
            <h3>Your current llms.txt</h3>
            {res.existing.found ? (
              <>
                <p className="muted small">Found at <a href={res.existing.url} target="_blank" rel="noopener noreferrer nofollow">{res.existing.url}</a>.</p>
                <Checks checks={res.existing.checks} />
                <details className="tool-raw"><summary>Show the current file</summary><pre>{res.existing.body}</pre></details>
              </>
            ) : (
              <div className="aiview-verdict info">No llms.txt at {res.existing.url}. Use the draft below if you want one. It&apos;s optional: no search engine has confirmed using it.</div>
            )}
          </div>

          <div className="tool-result card">
            <div className="tool-next-head">
              <div>
                <h3>Your draft llms.txt</h3>
                <p className="muted small">Built from {res.pages.length} page{res.pages.length === 1 ? "" : "s"} on {new URL(res.origin).hostname}. Edit it here: fix the summary line and remove pages you don&apos;t want to feature.</p>
              </div>
              <div className="row">
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? "Copied ✓" : "Copy"}
                </button>
                <button type="button" onClick={() => download("llms.txt", text, "text/markdown")}>Download</button>
              </div>
            </div>
            <label htmlFor="llms-draft" className="sr-only">Draft llms.txt</label>
            <textarea id="llms-draft" className="field mono tool-editor" rows={18} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
            <Checks checks={draftChecks} />
            <p className="muted tiny">Upload it to the root of your site so it opens at {res.origin}/llms.txt, and update it when your main pages change.</p>
          </div>
        </>
      )}

      <details className="tool-result card tool-paste">
        <summary><strong>Check an llms.txt you paste</strong></summary>
        <label htmlFor="llms-paste" className="sr-only">Paste llms.txt</label>
        <textarea id="llms-paste" className="field mono tool-editor" rows={8} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"# Your Business\n\n> What you do, for whom, and where.\n\n## Key pages\n- [Services](https://yoursite.com/services): What we offer"} spellCheck={false} />
        {pastedChecks.length > 0 && <Checks checks={pastedChecks} />}
      </details>
    </div>
  );
}
