import { BotHitsError, recordBotHit } from "@/lib/botHits";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { ua } with header x-bot-token: called by the snippet on a customer's site when an AI crawler
 * visits. Only a daily count per bot is kept (lib/botHits.ts).
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-bot-token") ?? "";
  // Generous for busy sites; a flood beyond this is dropped rather than stored.
  if (!await rateLimit("bothits:" + token.slice(0, 48), 6000, 3600_000, { local: true }) || !await rateLimit("bothits-ip:" + clientIp(req), 12000, 3600_000, { local: true }))
    return Response.json({ error: "Too many requests." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { ua?: unknown };
  try {
    const bot = await recordBotHit(token, b.ua);
    return Response.json({ counted: !!bot, bot });
  } catch (e) {
    if (e instanceof BotHitsError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
