import { badgeHost, badgeSvg, cachedBadge, freshBadge } from "@/lib/badge";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const svg = (body: string, maxAge: number) =>
  new Response(body, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": `public, max-age=${maxAge}, s-maxage=${maxAge}` } });

/** GET /api/badge?url=example.com → SVG badge with the site's overall score (refreshed daily). */
export async function GET(req: Request) {
  let host = "";
  try {
    host = badgeHost(new URL(req.url).searchParams.get("url") ?? "");
  } catch {
    return svg(badgeSvg(null), 300);
  }
  const cached = await cachedBadge(host);
  if (cached) return svg(badgeSvg(cached.score), 3600);
  // A cache miss runs a real audit, so limit how often one network can cause that.
  if (!rateLimit("badge:" + clientIp(req), 20)) return svg(badgeSvg(null), 60);
  try {
    return svg(badgeSvg((await freshBadge(host)).score), 3600);
  } catch {
    return svg(badgeSvg(null), 300);
  }
}
