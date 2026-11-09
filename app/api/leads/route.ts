import { isAdmin } from "@/lib/config";
import { listLeads, parseLead, saveLead } from "@/lib/leads";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  // Honeypot: real people never see or fill the "website" field.
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });
  if (!rateLimit("leads:" + clientIp(req), 6)) return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });
  const parsed = parseLead(body);
  if (typeof parsed === "string") return Response.json({ error: parsed }, { status: 400 });
  try {
    await saveLead(parsed);
  } catch (e) {
    console.error("Saving a lead failed:", e);
    return Response.json({ error: "We couldn't save that just now. Please try again." }, { status: 503 });
  }
  return Response.json({ ok: true });
}

/** Admin only: GET /api/leads with the x-admin-key header (or ?format=csv). */
export async function GET(req: Request) {
  if (!isAdmin(req)) return new Response("Forbidden", { status: 403 });
  const leads = await listLeads();
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const cell = (v?: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["createdAt,kind,email,name,url,source,message", ...leads.map((l) => [l.createdAt, l.kind, l.email, l.name, l.url, l.source, l.message].map(cell).join(","))].join("\n");
    return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="leads.csv"' } });
  }
  return Response.json({ leads });
}
