import { recordSiteCheck } from "@/lib/siteChecks";
import { runBotTest, type BotTestResult } from "@/lib/botTest";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl, UnsafeUrlError } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One test makes 15 requests to the target site, so results are cached and rate limited.
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; result: BotTestResult }>();

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("url") ?? "";
  let url: URL;
  try {
    url = await assertPublicUrl(target.includes("://") ? target : `https://${target}`);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad URL" }, { status: 400 });
  }
  const key = url.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return Response.json({ ...hit.result, cached: true });

  if (!await rateLimit("bottest:" + clientIp(req), Number(process.env.BOT_TEST_PER_HOUR ?? 10)))
    return Response.json({ error: "Too many bot tests from your network. Try again in a bit." }, { status: 429 });

  try {
    const result = await runBotTest(key);
    recordSiteCheck({ url: url.toString(), tool: "bot-test" });
    cache.set(key, { at: Date.now(), result });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bot test failed." }, { status: e instanceof UnsafeUrlError ? 400 : 502 });
  }
}
