"use client";

import { useCallback, useEffect, useState } from "react";
import { adminKey, api, download } from "@/lib/client";

interface Lead { id: string; email: string; name?: string; url: string; score: number; createdAt: string }
interface Widget { id: string; agency: string; color: string; logoUrl?: string; notifyEmail?: string; webhookUrl?: string; ctaText: string; ctaUrl?: string; whiteLabel: boolean; createdAt: string; leads: Lead[] }

const EMPTY = { agency: "", color: "#156064", logoUrl: "", notifyEmail: "", webhookUrl: "", ctaText: "Book a free call", ctaUrl: "", whiteLabel: false };

/**
 * Admin page for agency widgets: create one, copy its embed code, see its leads.
 * Open /admin/widgets?admin=YOUR_ADMIN_KEY once; the key is kept in this browser.
 */
export default function WidgetAdmin() {
  const [key, setKey] = useState("");
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    try {
      setWidgets((await api<{ widgets: Widget[] }>("/api/widgets")).widgets);
      setErr("");
    } catch {
      setErr("Not authorised. Open this page once with ?admin=YOUR_ADMIN_KEY.");
    }
  }, []);

  useEffect(() => {
    setKey(adminKey());
    setOrigin(window.location.origin);
    load();
  }, [load]);

  if (!key) return <p className="muted">Open this page with <code>?admin=YOUR_ADMIN_KEY</code> to manage widgets.</p>;

  const field = (k: keyof typeof EMPTY, label: string, props: Record<string, unknown> = {}) => (
    <label className="admin-field">
      <span>{label}</span>
      <input className="field" value={String(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className="admin-widgets">
      <h1>Agency widgets</h1>
      <p className="muted">Each agency pastes one script tag. Visitors get a short branded report; the agency gets the lead by email and webhook.</p>

      <form
        className="card admin-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            await api("/api/widgets", { method: "POST", body: JSON.stringify(form) });
            setForm(EMPTY);
            await load();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>New widget</h2>
        <div className="admin-grid">
          {field("agency", "Agency name", { required: true })}
          <label className="admin-field">
            <span>Brand colour</span>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </label>
          {field("logoUrl", "Logo URL (https, optional)")}
          {field("notifyEmail", "Send leads to email", { type: "email" })}
          {field("webhookUrl", "Webhook URL (Zapier, Make…)")}
          {field("ctaText", "Button text after results")}
          {field("ctaUrl", "Button link (https, optional)")}
          <label className="check-mark">
            <input type="checkbox" checked={form.whiteLabel} onChange={(e) => setForm({ ...form, whiteLabel: e.target.checked })} /> White label (hide &quot;Powered by&quot;)
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create widget"}</button>
        {err && <p className="c-fail small">{err}</p>}
      </form>

      {widgets?.map((w) => {
        const code = `<script src="${origin}/widget.js" data-widget="${w.id}" async></script>`;
        return (
          <section key={w.id} className="card admin-widget">
            <div className="admin-widget-head">
              <span className="admin-swatch" style={{ background: w.color }} />
              <h2>{w.agency}</h2>
              <a href={`/embed/${w.id}`} target="_blank" rel="noopener">Preview</a>
            </div>
            <p className="small muted">Leads to {w.notifyEmail || "no email"}{w.webhookUrl ? " and a webhook" : ""}. Created {new Date(w.createdAt).toLocaleDateString()}.</p>
            <div className="badge-code">
              <code>{code}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(code)}>Copy embed code</button>
            </div>
            <h3>{w.leads.length} lead{w.leads.length === 1 ? "" : "s"}</h3>
            {w.leads.length > 0 && (
              <>
                <div className="table-wrap">
                  <table className="bots">
                    <thead><tr><th>Date</th><th>Email</th><th>Website</th><th>Score</th></tr></thead>
                    <tbody>
                      {w.leads.slice(0, 50).map((l) => (
                        <tr key={l.id}><td className="small">{new Date(l.createdAt).toLocaleString()}</td><td>{l.name ? `${l.name} · ` : ""}{l.email}</td><td className="small">{l.url}</td><td>{l.score}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="link-btn" onClick={() => {
                  const cell = (v: string | number = "") => `"${String(v).replace(/"/g, '""')}"`;
                  download(`${w.agency}-leads.csv`, ["date,name,email,website,score", ...w.leads.map((l) => [l.createdAt, l.name, l.email, l.url, l.score].map(cell).join(","))].join("\n"), "text/csv");
                }}>Download CSV</button>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
