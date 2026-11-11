import { featureEnabled, isPublic } from "@/lib/config";
import { mailConfigured } from "@/lib/mail";
import { createMonitor, deleteMonitor } from "@/lib/monitor";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!featureEnabled("monitoring", req)) return Response.json({ error: "Monitoring is coming soon." }, { status: 404 });
  // With accounts on, weekly checks belong to an account (one site free). Existing email-only monitors keep running.
  if (isPublic("accounts")) return Response.json({ error: "Create a free account to get a weekly check and email alerts.", signup: true }, { status: 401 });
  if (!mailConfigured()) return Response.json({ error: "Email alerts aren't configured yet (SMTP settings missing)." }, { status: 503 });
  if (!rateLimit("monitor:" + clientIp(req), 5)) return Response.json({ error: "Too many requests." }, { status: 429 });
  let body: { url?: string; email?: string; everyDays?: number; maxPages?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  try {
    await assertPublicUrl(String(body.url ?? ""));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid URL" }, { status: 400 });
  }
  const m = await createMonitor(String(body.url), email, Number(body.everyDays) || 7, Number(body.maxPages) || 25);
  return Response.json({ ok: true, id: m.id, message: "Monitoring is on. The first check runs within the hour and you'll get an email." });
}

/** Unsubscribe link from alert emails: /api/monitors?id=..&token=..&action=delete */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("action") !== "delete") return new Response("Not found", { status: 404 });
  const ok = await deleteMonitor(p.get("id") ?? "", p.get("token") ?? "").catch(() => false);
  return new Response(
    `<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:40px;text-align:center">${
      ok ? "<h2>Monitoring stopped</h2><p>You won't get any more emails for this site.</p>" : "<h2>Link expired</h2><p>This monitor was already removed.</p>"
    }</body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
