import { requireAccount } from "@/lib/apiAuth";
import { SlackError, getSlackWebhook, setSlackWebhook } from "@/lib/slack";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → whether alerts go to Slack (the webhook itself isn't sent back: it works like a password). */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ connected: !!(await getSlackWebhook(a.org.id).catch(() => null)) });
}

/** PUT { url } connects Slack after a test message; an empty url disconnects. Owners only. */
export async function PUT(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only the team owner can connect Slack." }, { status: 403 });
  if (!rateLimit("slack:" + a.org.id, 10)) return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { url?: unknown };
  try {
    await setSlackWebhook(a.org.id, String(b.url ?? ""));
    return Response.json({ connected: !!String(b.url ?? "").trim() });
  } catch (e) {
    if (e instanceof SlackError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
