import { mailConfigured, sendMail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { insertRow, newId } from "@/lib/store";
import { TOOLS } from "@/lib/tools";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

/** GET → whether "Email me this result" can work (needs SMTP). */
export async function GET() {
  return Response.json({ enabled: mailConfigured() });
}

/** POST { email, tool, page, text } emails a free tool's result once, and saves the email as a tool lead. */
export async function POST(req: Request) {
  if (!mailConfigured()) return Response.json({ error: "Email isn't set up yet." }, { status: 503 });
  if (!await rateLimit("emailresult:" + clientIp(req), 5)) return Response.json({ error: "Too many emails. Try again later." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { email?: string; tool?: string; page?: string; text?: string };
  const email = String(b.email ?? "").trim().slice(0, 254);
  if (!EMAIL.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  const tool = TOOLS.find((t) => t.slug === b.tool);
  if (!tool) return Response.json({ error: "Unknown tool." }, { status: 400 });
  const text = String(b.text ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 20000);
  if (!text) return Response.json({ error: "There's no result to send yet." }, { status: 400 });
  const link = `${SITE_URL}/tools/${tool.slug}`;
  const subject = `Your ${tool.name} result`;
  const html = `<h2>${esc(subject)}</h2><pre style="white-space:pre-wrap;font:14px/1.5 system-ui">${esc(text)}</pre><p><a href="${esc(link)}">Run it again</a> · <a href="${esc(SITE_URL)}/#audit">Run a full free audit</a></p><p style="color:#56677a;font-size:13px">You asked for this from ${esc(BRAND.name)}.</p>`;
  try {
    await sendMail(email, subject, html, `${subject}\n\n${text}\n\nRun it again: ${link}`);
  } catch (e) {
    console.error("email-result", e);
    return Response.json({ error: "We couldn't send the email. Try again." }, { status: 502 });
  }
  await insertRow("leads", { id: newId(14), kind: "tool", email, source: `tool:${tool.slug}` }).catch(() => {});
  return Response.json({ ok: true });
}
