"use client";

import { useState } from "react";
import UrlForm from "@/components/UrlForm";
import { api } from "@/lib/client";
import { CopyBlock } from "@/components/ui";
import type { MetaIdeas } from "@/lib/ai/helpers";

interface MetaResult { url: string; current: { title: string; description: string }; ideas: MetaIdeas }

export default function MetaTool() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState<MetaResult | null>(null);
  const run = async (url: string) => {
    setBusy(true);
    setErr("");
    setR(null);
    try {
      setR(await api<MetaResult>("/api/ai-tools", { method: "POST", body: JSON.stringify({ tool: "meta", url }) }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="tool">
      <UrlForm id="meta-url" button="Write titles" loading={busy} onSubmit={run} />
      {err && <p className="tool-error" role="alert">{err}</p>}
      {r && (
        <div className="tool-result">
          <div className="card tool-next">
            <h3>Now</h3>
            <ul className="ai-meta">
              <li><span>{r.current.title || "No title tag"}</span><small className="muted">{r.current.title.length}/60</small></li>
              <li><span>{r.current.description || "No meta description"}</span><small className="muted">{r.current.description.length}/160</small></li>
            </ul>
            <h3>Title ideas</h3>
            <ul className="ai-meta">{r.ideas.titles.map((t) => <li key={t}><span>{t}</span><small className="muted">{t.length}/60</small></li>)}</ul>
            <h3>Description ideas</h3>
            <ul className="ai-meta">{r.ideas.descriptions.map((t) => <li key={t}><span>{t}</span><small className="muted">{t.length}/160</small></li>)}</ul>
            {r.ideas.titles[0] && r.ideas.descriptions[0] && (
              <CopyBlock filename="meta-tags.html" content={`<title>${r.ideas.titles[0].replace(/</g, "&lt;")}</title>\n<meta name="description" content="${r.ideas.descriptions[0].replace(/"/g, "&quot;")}">`} />
            )}
            <p className="muted tiny">Written by AI from your page. Check each one is accurate before you use it.</p>
          </div>
        </div>
      )}
    </div>
  );
}
