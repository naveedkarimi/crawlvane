import { recordSiteCheck } from "@/lib/siteChecks";
import { headersReport, redirectReport, sitemapReport } from "@/lib/gen/siteTools";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { UnsafeUrlError } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const RUN = { redirects: redirectReport, sitemap: sitemapReport, headers: headersReport } as const;
type ToolName = keyof typeof RUN;

// Same URL and tool within 10 minutes is served from memory.
const cache = new Map<string, { at: number; data: unknown }>();

/** GET /api/site-tools?tool=redirects|sitemap|headers&url=... */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tool = params.get("tool") as ToolName;
  const raw = (params.get("url") ?? "").trim();
  if (!(tool in RUN)) return Response.json({ error: "Unknown tool." }, { status: 400 });
  if (!raw || raw.length > 2048) return Response.json({ error: "Please enter a URL." }, { status: 400 });
  const key = `${tool}:${raw}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 600_000) return Response.json(hit.data);
  if (!await rateLimit("sitetools:" + clientIp(req), Number(process.env.TOOL_PER_HOUR ?? 40)))
    return Response.json({ error: "Too many checks from your network. Try again in a bit." }, { status: 429 });
  try {
    const data = await RUN[tool](raw);
    recordSiteCheck({ url: raw, tool });
    cache.set(key, { at: Date.now(), data });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Check failed." }, { status: e instanceof UnsafeUrlError ? 400 : 502 });
  }
}
