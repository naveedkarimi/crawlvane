import { recordSiteCheck } from "@/lib/siteChecks";
import { buildLlmsForSite, type LlmsToolResult } from "@/lib/gen/llmsSite";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl, UnsafeUrlError } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One run reads up to 25 pages of the target site, so results are cached and rate limited.
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; result: LlmsToolResult }>();

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("url") ?? "";
  let url: URL;
  try {
    url = await assertPublicUrl(target.includes("://") ? target : `https://${target}`);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad URL" }, { status: 400 });
  }
  const key = url.origin;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return Response.json(hit.result);
  if (!await rateLimit("llms:" + clientIp(req), Number(process.env.LLMS_TOOL_PER_HOUR ?? 10)))
    return Response.json({ error: "Too many requests from your network. Try again in a bit." }, { status: 429 });

  try {
    const result = await buildLlmsForSite(url.origin + "/");
    recordSiteCheck({ url: url.origin, tool: "llms-txt" });
    cache.set(key, { at: Date.now(), result });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Couldn't read the site." }, { status: e instanceof UnsafeUrlError ? 400 : 502 });
  }
}
