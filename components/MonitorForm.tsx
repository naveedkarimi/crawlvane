"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function MonitorForm({ url }: { url: string }) {
  const [email, setEmail] = useState("");
  const [every, setEvery] = useState(7);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="card">
      <h3>Weekly monitoring & email alerts</h3>
      <p className="muted small">We&apos;ll re-audit {url} on a schedule and email you when scores drop or new issues appear.</p>
      {msg ? (
        <p className="c-pass">{msg}</p>
      ) : (
        <form
          className="row wrap"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr("");
            try {
              const r = await api<{ message: string }>("/api/monitors", { method: "POST", body: JSON.stringify({ url, email, everyDays: every }) });
              setMsg(r.message);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input className="field" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="field" value={every} onChange={(e) => setEvery(Number(e.target.value))}>
            <option value={1}>Daily</option>
            <option value={7}>Weekly</option>
            <option value={30}>Monthly</option>
          </select>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Start monitoring"}
          </button>
        </form>
      )}
      {err && <p className="c-fail small">{err}</p>}
    </div>
  );
}
