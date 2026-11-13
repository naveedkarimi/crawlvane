/**
 * This site's own IndexNow key file. `npm run indexnow` sends every sitemap URL to IndexNow with this
 * file as the key location. Without INDEXNOW_KEY set, the file doesn't exist.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key)) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
