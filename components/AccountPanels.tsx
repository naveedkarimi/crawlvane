"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Copy, Download, KeyRound, Plus, Trash2, X } from "lucide-react";
import { api, download } from "@/lib/client";
import { browserAuth } from "@/lib/supabaseBrowser";
import type { ApiKey } from "@/lib/apiKeys";
import type { Widget, WidgetLead } from "@/lib/widgets";
import type { Branding } from "@/lib/branding";

const errText = (e: unknown, fallback = "That didn't work.") => (e instanceof Error ? e.message : fallback);
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Keys for the public API. The full key is shown once, right after it's made. */
export function ApiKeysCard() {
  const [data, setData] = useState<{ keys: ApiKey[]; limit: number; canManage: boolean } | null>(null);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(() => api<{ keys: ApiKey[]; limit: number; canManage: boolean }>("/api/me/api-keys").then(setData).catch((e) => setErr(errText(e))), []);
  useEffect(() => { void load(); }, [load]);
  if (!data) return null;
  const create = async () => {
    setErr("");
    try {
      const r = await api<{ key: string }>("/api/me/api-keys", { method: "POST", body: JSON.stringify({ name }) });
      setFresh(r.key);
      setName("");
      await load();
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <section className="card dash-card settings-block" aria-label="API keys">
      <h2><KeyRound size={18} aria-hidden="true" /> API keys</h2>
      <p className="muted small">Run audits from your own tools with <code>GET /api/v1/audit?url=…</code> and the header <code>Authorization: Bearer KEY</code>. Checks of your saved sites are added to their history. See <a href="/developers">the API guide</a>.</p>
      {data.limit < 1 ? (
        <p className="small">The API is part of the Pro and Agency plans.</p>
      ) : (
        <>
          {fresh && (
            <div className="key-fresh" role="status">
              <p className="small"><strong>Copy this key now.</strong> It won&apos;t be shown again.</p>
              <div className="team-invite-row"><code className="invite-link">{fresh}</code><button type="button" className="btn btn-sm" onClick={() => navigator.clipboard.writeText(fresh)}><Copy size={14} aria-hidden="true" /> Copy</button></div>
            </div>
          )}
          {data.keys.length > 0 && (
            <ul className="member-list">
              {data.keys.map((k) => (
                <li key={k.id}>
                  <span><strong>{k.name}</strong> <code className="muted">{k.prefix}…</code></span>
                  <span className="muted small">{k.uses} uses{k.lastUsed ? `, last ${fmt(k.lastUsed)}` : ""}</span>
                  {data.canManage && <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.confirm(`Revoke "${k.name}"? Anything using it stops working.`) && api(`/api/me/api-keys?id=${k.id}`, { method: "DELETE" }).then(load).catch((e) => setErr(errText(e)))}>Revoke</button>}
                </li>
              ))}
            </ul>
          )}
          {data.canManage && data.keys.length < data.limit && (
            <form className="team-invite-row" onSubmit={(e) => { e.preventDefault(); void create(); }}>
              <label className="sr-only" htmlFor="key-name">Key name</label>
              <input id="key-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="What it's for, like Zapier" />
              <button className="btn"><Plus size={15} aria-hidden="true" /> Create key</button>
            </form>
          )}
          <p className="muted small">{data.keys.length} of {data.limit} keys used. Each key can run 100 audits an hour.</p>
        </>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </section>
  );
}

/** Change the sign-in email. Supabase emails a confirmation link before it changes. */
export function ChangeEmailCard({ email }: { email: string }) {
  const [next, setNext] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState("");
  const submit = async () => {
    const auth = browserAuth();
    if (!auth) return setErr("Sign-in isn't set up.");
    setState("busy");
    setErr("");
    const { error } = await auth.auth.updateUser({ email: next.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard?tab=settings")}` });
    if (error) {
      setState("idle");
      setErr(/rate|seconds/i.test(error.message) ? "Too many emails. Wait a minute and try again." : "We couldn't change it. Check the address and try again.");
    } else setState("sent");
  };
  return (
    <section className="card dash-card settings-block" aria-label="Email address">
      <h2>Email address</h2>
      {state === "sent" ? (
        <p className="lead-done" role="status"><CheckCircle2 size={18} aria-hidden="true" /> Check both inboxes. Your email changes to {next} once you confirm the link we sent.</p>
      ) : (
        <form className="team-invite-row" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label className="sr-only" htmlFor="new-email">New email</label>
          <input id="new-email" className="field" type="email" required value={next} onChange={(e) => setNext(e.target.value)} placeholder={email} autoComplete="email" />
          <button className="btn" disabled={state === "busy" || !next.trim() || next.trim() === email}>{state === "busy" ? "Sending…" : "Change email"}</button>
        </form>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </section>
  );
}

/** Download everything held about you and your team. */
export function ExportCard() {
  return (
    <section className="card dash-card settings-block" aria-label="Your data">
      <h2>Your data</h2>
      <p className="muted small">Download your account, your team&apos;s sites, score history, tracking results, alerts and settings as one JSON file.</p>
      <a className="btn" href="/api/me/export" download><Download size={15} aria-hidden="true" /> Download my data</a>
    </section>
  );
}

/** Report branding and the team's own report domain (Agency). */
export function BrandingCard() {
  const [data, setData] = useState<{ branding: Branding; allowed: boolean; customDomains: boolean; canEdit: boolean } | null>(null);
  const [form, setForm] = useState({ name: "", logoUrl: "", color: "#156064", domain: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    const d = await api<{ branding: Branding; allowed: boolean; customDomains: boolean; canEdit: boolean }>("/api/me/branding");
    setData(d);
    setForm({ name: d.branding.name ?? "", logoUrl: d.branding.logoUrl ?? "", color: d.branding.color ?? "#156064", domain: d.branding.domain ?? "" });
  }, []);
  useEffect(() => { load().catch((e) => setErr(errText(e))); }, [load]);
  if (!data) return err ? <p className="c-fail small">{err}</p> : null;
  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    setErr("");
    setMsg("");
    try {
      await fn();
      await load();
      setMsg(done);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };
  const b = data.branding;
  if (!data.allowed)
    return <section className="card dash-card settings-block"><h2>Report branding</h2><p className="small">Your logo, colour and name on client reports, without our branding, is part of the Agency plan.</p></section>;
  const ro = !data.canEdit;
  return (
    <section className="card dash-card settings-block" aria-label="Report branding">
      <h2>Report branding</h2>
      <p className="muted small">New full reports and monthly client reports show this instead of our name, header and footer.</p>
      <form className="brand-form" onSubmit={(e) => { e.preventDefault(); void run("save", () => api("/api/me/branding", { method: "PATCH", body: JSON.stringify(form) }), "Saved."); }}>
        <label className="lbl" htmlFor="br-name">Name on reports</label>
        <input id="br-name" className="field" value={form.name} disabled={ro} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your agency" />
        <label className="lbl" htmlFor="br-logo">Logo address (https)</label>
        <input id="br-logo" className="field" value={form.logoUrl} disabled={ro} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://youragency.com/logo.png" />
        <label className="lbl" htmlFor="br-color">Colour</label>
        <div className="team-invite-row"><input id="br-color" type="color" value={form.color} disabled={ro} onChange={(e) => setForm({ ...form, color: e.target.value })} /><code>{form.color}</code></div>
        {data.customDomains && (
          <>
            <label className="lbl" htmlFor="br-domain">Your report domain <span className="muted">(optional)</span></label>
            <input id="br-domain" className="field" value={form.domain} disabled={ro} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="reports.youragency.com" />
          </>
        )}
        {!ro && <button className="btn btn-primary" disabled={busy === "save"}>{busy === "save" ? "Saving…" : "Save branding"}</button>}
      </form>
      {data.customDomains && b.domain && (
        <div className="domain-status">
          {b.domainVerified ? (
            <p className="small"><CheckCircle2 size={15} className="cr-ok" aria-hidden="true" /> <strong>{b.domain}</strong> is connected. Report links in emails use it.</p>
          ) : (
            <>
              <p className="small"><Circle size={15} className="cr-none" aria-hidden="true" /> <strong>{b.domain}</strong> isn&apos;t connected yet. Add a <strong>CNAME</strong> record for it pointing to <code>{new URL(window.location.origin).hostname}</code>, then check.</p>
              {!ro && <button type="button" className="btn btn-sm" disabled={busy === "verify"} onClick={() => run("verify", () => api("/api/me/branding/verify", { method: "POST" }), "Connected.")}>{busy === "verify" ? "Checking…" : "Check connection"}</button>}
            </>
          )}
        </div>
      )}
      {msg && <p className="small c-pass" role="status">{msg}</p>}
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </section>
  );
}

interface WidgetsData { widgets: Widget[]; limit: number; canEdit: boolean; whiteLabel: boolean; siteUrl: string }
const EMPTY = { agency: "", color: "#156064", logoUrl: "", notifyEmail: "", webhookUrl: "", ctaText: "Book a free call", ctaUrl: "", whiteLabel: false };

/** Embeddable audit widgets: create, edit, copy the embed code, see and download leads. */
export function WidgetsCard() {
  const [data, setData] = useState<WidgetsData | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [leads, setLeads] = useState<{ id: string; rows: WidgetLead[] } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<WidgetsData>("/api/me/widgets").then(setData).catch((e) => setErr(errText(e))), []);
  useEffect(() => { void load(); }, [load]);
  if (!data) return err ? <p className="c-fail small">{err}</p> : <div className="loading"><div className="spinner" /> Loading widgets…</div>;
  if (data.limit < 1)
    return <section className="card dash-card settings-block"><h2>Audit widget</h2><p className="small">Put a free audit on your own website that collects leads for you. Widgets are part of the Agency plan.</p></section>;
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await api("/api/me/widgets", { method: editing ? "PATCH" : "POST", body: JSON.stringify(editing ? { ...form, id: editing } : form) });
      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const showLeads = async (id: string) => {
    if (leads?.id === id) return setLeads(null);
    try {
      setLeads({ id, rows: (await api<{ leads: WidgetLead[] }>(`/api/me/widgets/${id}/leads`)).leads });
    } catch (e) {
      setErr(errText(e));
    }
  };
  const csv = (rows: WidgetLead[]) => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    download("widget-leads.csv", ["Date,Email,Name,Website,Score", ...rows.map((l) => [l.createdAt, l.email, l.name, l.url, l.score].map(q).join(","))].join("\n"), "text/csv");
  };
  const f = (k: keyof typeof EMPTY, label: string, type = "text") => (
    <label className="admin-field"><span>{label}</span><input className="field" type={type} value={String(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
  );
  return (
    <section className="dash-section" aria-label="Audit widgets">
      {data.canEdit && (data.widgets.length < data.limit || editing) && (
        <form className="card dash-card settings-block" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <h2>{editing ? "Edit widget" : "New audit widget"}</h2>
          <p className="muted small">Paste one line on your website. Visitors enter their site and email, get a short branded audit, and you get the lead by email or webhook.</p>
          <div className="admin-grid">
            {f("agency", "Your agency name")}
            <label className="admin-field"><span>Colour</span><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
            {f("logoUrl", "Logo address (https, optional)")}
            {f("notifyEmail", "Email leads to", "email")}
            {f("webhookUrl", "Webhook (Zapier, Make…, optional)")}
            {f("ctaText", "Button text after results")}
            {f("ctaUrl", "Button link (https, optional)")}
            {data.whiteLabel && <label className="check-mark"><input type="checkbox" checked={form.whiteLabel} onChange={(e) => setForm({ ...form, whiteLabel: e.target.checked })} /> Hide &quot;Powered by&quot;</label>}
          </div>
          <div className="site-actions">
            <button className="btn btn-primary" disabled={busy || !form.agency.trim()}>{busy ? "Saving…" : editing ? "Save changes" : "Create widget"}</button>
            {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}><X size={15} aria-hidden="true" /> Cancel</button>}
          </div>
        </form>
      )}
      {err && <p className="c-fail small" role="alert">{err}</p>}
      {data.widgets.map((w) => {
        const code = `<script src="${data.siteUrl}/widget.js" data-widget="${w.id}" async></script>`;
        return (
          <article key={w.id} className="card dash-card settings-block">
            <div className="card-head">
              <div><h2><span className="widget-dot" style={{ background: w.color }} aria-hidden="true" /> {w.agency}</h2><p className="muted small">Made {fmt(w.createdAt)}{w.notifyEmail ? ` · leads to ${w.notifyEmail}` : ""}{w.webhookUrl ? " · webhook on" : ""}</p></div>
              <div className="site-actions">
                <a className="btn btn-sm" href={`${data.siteUrl}/embed/${w.id}`} target="_blank" rel="noopener">Preview</a>
                {data.canEdit && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(w.id); setForm({ agency: w.agency, color: w.color, logoUrl: w.logoUrl ?? "", notifyEmail: w.notifyEmail ?? "", webhookUrl: w.webhookUrl ?? "", ctaText: w.ctaText, ctaUrl: w.ctaUrl ?? "", whiteLabel: w.whiteLabel }); window.scrollTo(0, 0); }}>Edit</button>}
                {data.canEdit && <button type="button" className="btn btn-sm btn-ghost icon-btn" aria-label={`Delete the ${w.agency} widget`} onClick={() => window.confirm("Delete this widget and the leads it collected? The embed code stops working.") && api(`/api/me/widgets?id=${w.id}`, { method: "DELETE" }).then(load).catch((e) => setErr(errText(e)))}><Trash2 size={15} aria-hidden="true" /></button>}
              </div>
            </div>
            <div className="team-invite-row"><code className="invite-link">{code}</code><button type="button" className="btn btn-sm" onClick={() => navigator.clipboard.writeText(code)}><Copy size={14} aria-hidden="true" /> Copy embed code</button></div>
            <button type="button" className="link-btn" onClick={() => showLeads(w.id)}>{leads?.id === w.id ? "Hide leads" : "Show leads"}</button>
            {leads?.id === w.id && (
              leads.rows.length ? (
                <>
                  <div className="table-wrap"><table><thead><tr><th>Date</th><th>Email</th><th>Website</th><th>Score</th></tr></thead><tbody>{leads.rows.map((l) => <tr key={l.id}><td>{fmt(l.createdAt)}</td><td>{l.email}</td><td className="mono">{l.url.replace(/^https?:\/\//, "")}</td><td>{l.score}</td></tr>)}</tbody></table></div>
                  <button type="button" className="btn btn-sm" onClick={() => csv(leads.rows)}><Download size={14} aria-hidden="true" /> Download CSV</button>
                </>
              ) : <p className="muted small">No leads yet.</p>
            )}
          </article>
        );
      })}
      <p className="muted small">{data.widgets.length} of {data.limit} widgets used. Leads are kept for 12 months.</p>
    </section>
  );
}

/** First-run checklist on the Overview. It hides once everything is done or someone dismisses it. */
export function Onboarding({ steps, onGo }: { steps: { key: string; label: string; done: boolean; action: string; go: () => void }[]; onGo?: () => void }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem("cv-onboarding-hidden") === "1";
    } catch {
      return false;
    }
  });
  const left = steps.filter((s) => !s.done).length;
  if (hidden || !left) return null;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem("cv-onboarding-hidden", "1");
    } catch {
      /* private window */
    }
  };
  return (
    <section className="card dash-card onboarding" aria-label="Getting started">
      <div className="card-head">
        <div><h2>Get set up</h2><p className="muted small">{steps.length - left} of {steps.length} done</p></div>
        <button type="button" className="link-btn" onClick={hide}>Hide</button>
      </div>
      <div className="side-bar onboarding-bar"><i style={{ width: `${((steps.length - left) / steps.length) * 100}%` }} /></div>
      <ol className="onboarding-steps">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? "done" : ""}>
            {s.done ? <CheckCircle2 size={20} className="cr-ok" aria-hidden="true" /> : <Circle size={20} className="cr-none" aria-hidden="true" />}
            <span>{s.label}</span>
            {!s.done && <button type="button" className="btn btn-sm" onClick={() => { s.go(); onGo?.(); }}>{s.action}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}
