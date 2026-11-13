"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "@/lib/client";

/**
 * "Email me this result" under every free tool. Appears once the tool shows a result (.tool-result),
 * and sends that result's text to the address given. Hidden when email sending isn't set up.
 */
export default function EmailResult({ tool }: { tool: string }) {
  const [shown, setShown] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<{ enabled: boolean }>("/api/email-result").then((r) => setEnabled(r.enabled)).catch(() => {});
    const root = document.getElementById("tool-root");
    if (!root) return;
    const check = () => setShown(!!root.querySelector(".tool-result"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  if (!enabled || !shown) return null;
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = document.querySelector("#tool-root .tool-result") as HTMLElement | null;
    if (!result) return;
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/email-result", { method: "POST", body: JSON.stringify({ email, tool, page: window.location.pathname, text: result.innerText.slice(0, 20000) }) });
      setMsg({ ok: true, text: "Sent. Check your inbox in a minute." });
    } catch (x) {
      setMsg({ ok: false, text: x instanceof Error ? x.message : "We couldn't send it." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="email-result no-print" onSubmit={send}>
      <Mail size={18} aria-hidden="true" />
      <label htmlFor="email-result" className="email-result-label">Email me this result</label>
      <input id="email-result" className="field" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={(x) => setEmail(x.target.value)} />
      <button className="btn btn-sm" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
      <p className="muted tiny">We send this result once and keep your email, so we can send related tips with an unsubscribe link. <a href="/privacy">Privacy policy</a></p>
      {msg && <p className={`small ${msg.ok ? "c-pass" : "c-fail"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
    </form>
  );
}
