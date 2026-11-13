import { recordSiteCheck } from "@/lib/siteChecks";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl, safeFetch } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: RobotsFetch }>();

export interface RobotsFetch {
  origin: string;
  url: string;
  status: number;
  found: boolean;
  body: string;
  error?: string;
}

/** Fetch a site's robots.txt so the browser can parse and test it. */
export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("url") ?? "";
  let origin: string;
  try {
    origin = (await assertPublicUrl(target.includes("://") ? target : `https://${target}`)).origin;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad URL" }, { status: 400 });
  }
  const hit = cache.get(origin);
  if (hit && Date.now() - hit.at < CACHE_MS) return Response.json(hit.data);
  if (!await rateLimit("robots:" + clientIp(req), Number(process.env.TOOL_PER_HOUR ?? 40)))
    return Response.json({ error: "Too many checks from your network. Try again in a bit." }, { status: 429 });

  const r = await safeFetch(`${origin}/robots.txt`, { timeoutMs: 8000, accept: "text/plain,*/*" });
  const isHtml = /<html|<!doctype/i.test(r.body.slice(0, 500));
  const data: RobotsFetch = {
    origin,
    url: r.url,
    status: r.status,
    found: r.ok && !isHtml,
    body: r.ok && !isHtml ? r.body.slice(0, 100_000) : "",
    error: r.status === 0 ? r.error : r.ok && isHtml ? "The site returned a web page instead of a robots.txt file." : undefined,
  };
  recordSiteCheck({ url: origin, tool: "robots-txt" });
  cache.set(origin, { at: Date.now(), data });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return Response.json(data);
}
