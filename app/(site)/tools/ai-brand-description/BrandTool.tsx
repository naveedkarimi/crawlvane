"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import type { BrandDescription } from "@/lib/ai/helpers";

const KNOWN = {
  well: { label: "Knows you well", cls: "ok" },
  some: { label: "Knows a little", cls: "different" },
  not: { label: "Doesn't know you yet", cls: "blocked" },
} as const;

export default function BrandTool() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState<{ url: string; brand: string; result: BrandDescription } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setR(null);
    try {
      const v = url.trim();
      setR(await api("/api/ai-tools", { method: "POST", body: JSON.stringify({ tool: "describe", url: v.includes("://") ? v : `https://${v}`, email, brand }) }));
    } catch (x) {
      setErr(x instanceof Error ? x.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const list = (title: string, items: string[]) => items.length > 0 && (
    <div><h4>{title}</h4><ul className="ai-list">{items.map((x) => <li key={x}>{x}</li>)}</ul></div>
  );
  return (
    <div className="tool">
      <form className="tool-form-grid" onSubmit={submit}>
        <label>
          <span>Website</span>
          <input className="field" inputMode="url" autoComplete="url" placeholder="yourbusiness.com" required value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <label>
          <span>Business name <span className="muted">(optional)</span></span>
          <input className="field" placeholder="Taken from your page title if empty" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </label>
        <label>
          <span>Your email</span>
          <input className="field" type="email" autoComplete="email" placeholder="you@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? <><Loader2 size={16} className="spin" /> Asking the AI…</> : "Ask the AI"}</button>
        <p className="muted tiny">Free, 3 times a day. We may email you about results like these; every email has an unsubscribe link. See the <a href="/privacy">privacy policy</a>.</p>
      </form>
      {err && <p className="tool-error" role="alert">{err}</p>}
      {r && (
        <div className="tool-result">
          <div className="card tool-next">
            <div className="qa-head"><h3>{r.brand}</h3><span className={`livestat livestat-${KNOWN[r.result.known].cls}`}>{KNOWN[r.result.known].label}</span></div>
            <div className="brand-compare">
              <div><h4>What the AI says</h4><p>{r.result.aiSays}</p></div>
              <div><h4>What your website says</h4><p>{r.result.siteSays}</p></div>
            </div>
            {list("Where they agree", r.result.matches)}
            {list("What the AI gets wrong", r.result.wrong)}
            {list("What the AI doesn't know", r.result.missing)}
            {list("What to change on your site", r.result.fixes)}
            <p className="muted tiny">This is Claude&apos;s answer from its own knowledge, without searching. Other assistants may say something different.</p>
          </div>
        </div>
      )}
    </div>
  );
}
