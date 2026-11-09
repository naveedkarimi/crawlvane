import { assertPublicUrl } from "./safeFetch";
import { db, insertRow, listIds, listRowsNewestFirst, newId, readJson, writeJson } from "./store";
import { mailConfigured, sendMail } from "./mail";
import type { AuditResult } from "./types";

/**
 * Embeddable audit widgets for agencies (Phase 3). An agency pastes one script tag on its
 * site; visitors enter their URL and email, get a short report in the agency's colours,
 * and the agency gets the lead by email and/or webhook. Widgets are created by the admin
 * until accounts exist.
 */
export interface Widget {
  id: string;
  agency: string;
  /** Hex colour for buttons and the score ring. */
  color: string;
  logoUrl?: string;
  /** Where leads go. */
  notifyEmail?: string;
  webhookUrl?: string;
  /** Call to action under the results, e.g. "Book a free call". */
  ctaText: string;
  ctaUrl?: string;
  /** Hide "Powered by" (agency plan). */
  whiteLabel: boolean;
  createdAt: string;
}

export interface WidgetLead {
  id: string;
  widgetId: string;
  email: string;
  name?: string;
  url: string;
  score: number;
  createdAt: string;
}

const HEX = /^#[0-9a-f]{6}$/i;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "") || undefined;

export async function validateWidget(body: Record<string, unknown>): Promise<Omit<Widget, "id" | "createdAt"> | string> {
  const agency = clip(body.agency, 80);
  if (!agency) return "Agency name is required.";
  const color = clip(body.color, 7) ?? "#156064";
  if (!HEX.test(color)) return "Colour must be a hex value like #156064.";
  const urls: Record<string, string | undefined> = { logoUrl: clip(body.logoUrl, 500), webhookUrl: clip(body.webhookUrl, 500), ctaUrl: clip(body.ctaUrl, 500) };
  for (const [k, v] of Object.entries(urls)) {
    if (!v) continue;
    try {
      const u = new URL(v);
      if (u.protocol !== "https:") return `${k} must start with https://`;
    } catch {
      return `${k} isn't a valid URL.`;
    }
  }
  if (urls.webhookUrl) {
    try {
      await assertPublicUrl(urls.webhookUrl);
    } catch {
      return "The webhook must be a public https URL.";
    }
  }
  const notifyEmail = clip(body.notifyEmail, 254);
  if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(notifyEmail)) return "Notification email isn't valid.";
  return { agency, color, notifyEmail, ...urls, ctaText: clip(body.ctaText, 60) ?? "Get help fixing this", whiteLabel: body.whiteLabel === true };
}

export async function createWidget(w: Omit<Widget, "id" | "createdAt">): Promise<Widget> {
  const widget: Widget = { ...w, id: newId(10), createdAt: new Date().toISOString() };
  await writeJson("widgets", widget.id, widget);
  return widget;
}

export const getWidget = (id: string) => readJson<Widget>("widgets", id).catch(() => null);

export async function listWidgets(): Promise<Widget[]> {
  const all = await Promise.all((await listIds("widgets")).map((id) => getWidget(id)));
  return all.filter((w): w is Widget => !!w).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

type WidgetLeadRow = { id: string; widget_id: string; email: string; name: string | null; url: string; score: number; created_at: string };

export async function listWidgetLeads(widgetId?: string): Promise<WidgetLead[]> {
  if (db()) {
    const rows = await listRowsNewestFirst<WidgetLeadRow>("widget_leads");
    return rows
      .filter((r) => !widgetId || r.widget_id === widgetId)
      .map((r) => ({ id: r.id, widgetId: r.widget_id, email: r.email, name: r.name ?? undefined, url: r.url, score: r.score, createdAt: r.created_at }));
  }
  const all = await Promise.all((await listIds("widget-leads")).map((id) => readJson<WidgetLead>("widget-leads", id)));
  return all.filter((l): l is WidgetLead => !!l && (!widgetId || l.widgetId === widgetId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The short report the widget shows: scores and the top issues. */
export function widgetSummary(r: AuditResult) {
  const top = r.checks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1))
    .slice(0, 6)
    .map((c) => ({ title: c.title, status: c.status, detail: c.detail, category: c.category }));
  return { url: r.facts.finalUrl, title: r.facts.title, scores: r.scores, issues: r.checks.filter((c) => c.status === "fail" || c.status === "warn").length, top };
}

export async function saveWidgetLead(w: Widget, lead: Omit<WidgetLead, "id" | "createdAt" | "widgetId">, summary: ReturnType<typeof widgetSummary>): Promise<void> {
  const l: WidgetLead = { ...lead, id: newId(14), widgetId: w.id, createdAt: new Date().toISOString() };
  if (db()) {
    await insertRow("widget_leads", { id: l.id, widget_id: l.widgetId, email: l.email, name: l.name, url: l.url, score: Math.round(l.score), created_at: l.createdAt });
  } else {
    await writeJson("widget-leads", l.id, l);
  }
  const payload = { event: "lead.created", widget: { id: w.id, agency: w.agency }, lead: l, report: summary };
  if (w.webhookUrl) {
    // Re-check at send time: DNS could have changed since the widget was saved.
    assertPublicUrl(w.webhookUrl)
      .then(() => fetch(w.webhookUrl!, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000), redirect: "manual" }))
      .catch(() => {});
  }
  if (w.notifyEmail && mailConfigured()) {
    const lines = [
      `New lead from your ${w.agency} audit widget`,
      ``,
      `Email: ${l.email}`,
      l.name ? `Name: ${l.name}` : "",
      `Website: ${summary.url}`,
      `Score: ${summary.scores.overall}/100 (SEO ${summary.scores.seo}, AEO ${summary.scores.aeo}, GEO ${summary.scores.geo})`,
      `${summary.issues} issues. Top ones:`,
      ...summary.top.map((t) => `- [${t.status}] ${t.title}: ${t.detail}`),
    ].filter((x) => x !== "");
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    sendMail(w.notifyEmail, `New audit lead: ${summary.url}`, `<pre style="font:14px/1.5 system-ui">${esc(lines.join("\n"))}</pre>`, lines.join("\n")).catch(() => {});
  }
}
