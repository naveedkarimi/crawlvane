import { requireAccount } from "@/lib/apiAuth";
import { WebhookError, getWebhook, setWebhook } from "@/lib/webhooks";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → the team's webhook address (the secret is never sent back). */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ webhook: await getWebhook(a.org.id).catch(() => null) });
}

/** PUT { url } sets the webhook after a test request and returns a new signing secret once; an empty url removes it. Owners only. */
export async function PUT(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only the team owner can set the webhook." }, { status: 403 });
  if (!await rateLimit("webhook:" + a.org.id, 10)) return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { url?: unknown };
  try {
    return Response.json(await setWebhook(a.org.id, String(b.url ?? "")));
  } catch (e) {
    if (e instanceof WebhookError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
