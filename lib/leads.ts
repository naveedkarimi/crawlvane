import { db, insertRow, listIds, listRowsNewestFirst, newId, readJson, writeJson } from "./store";
import { mailConfigured, sendMail } from "./mail";

/**
 * Email capture: Pro waitlist, "fix it for me" requests and the contact form.
 * Saved in the Supabase `leads` table, or as JSON files in data/leads/ without Supabase.
 * Set LEADS_NOTIFY_EMAIL (and SMTP_*) to get an email for each new lead.
 */
export type LeadKind = "waitlist" | "fix" | "contact";
export const LEAD_KINDS: LeadKind[] = ["waitlist", "fix", "contact"];

export interface Lead {
  id: string;
  kind: LeadKind;
  email: string;
  name?: string;
  url?: string;
  message?: string;
  /** Page the form was sent from. */
  source?: string;
  createdAt: string;
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
export const validEmail = (e: string) => e.length <= 254 && EMAIL.test(e);

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : undefined) || undefined;

export function parseLead(body: Record<string, unknown>): Omit<Lead, "id" | "createdAt"> | string {
  const kind = body.kind as LeadKind;
  if (!LEAD_KINDS.includes(kind)) return "Unknown form.";
  const email = clip(body.email, 254)?.toLowerCase() ?? "";
  if (!validEmail(email)) return "Please enter a valid email address.";
  const message = clip(body.message, 4000);
  if (kind === "contact" && !message) return "Please write a message.";
  return { kind, email, name: clip(body.name, 120), url: clip(body.url, 2048), message, source: clip(body.source, 300) };
}

export async function saveLead(input: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
  const lead: Lead = { ...input, id: newId(14), createdAt: new Date().toISOString() };
  if (db()) {
    await insertRow("leads", {
      id: lead.id, kind: lead.kind, email: lead.email, name: lead.name, url: lead.url,
      message: lead.message, source: lead.source, created_at: lead.createdAt,
    });
  } else {
    await writeJson("leads", lead.id, lead);
  }
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (to && mailConfigured()) {
    const lines = [`Kind: ${lead.kind}`, `Email: ${lead.email}`, lead.name && `Name: ${lead.name}`, lead.url && `Site: ${lead.url}`, lead.source && `From: ${lead.source}`, lead.message && `\n${lead.message}`].filter(Boolean) as string[];
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    sendMail(to, `New ${lead.kind} lead: ${lead.email}`, `<pre>${esc(lines.join("\n"))}</pre>`, lines.join("\n")).catch(() => {});
  }
  return lead;
}

type LeadRow = Omit<Lead, "createdAt" | "name" | "url" | "message" | "source"> & { name: string | null; url: string | null; message: string | null; source: string | null; created_at: string };

export async function listLeads(): Promise<Lead[]> {
  if (db()) {
    const rows = await listRowsNewestFirst<LeadRow>("leads");
    return rows.map((r) => ({
      id: r.id, kind: r.kind, email: r.email, name: r.name ?? undefined, url: r.url ?? undefined,
      message: r.message ?? undefined, source: r.source ?? undefined, createdAt: r.created_at,
    }));
  }
  const ids = await listIds("leads");
  const all = await Promise.all(ids.map((id) => readJson<Lead>("leads", id)));
  return all.filter((l): l is Lead => !!l).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
