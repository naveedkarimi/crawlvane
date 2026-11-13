import { getReport } from "@/lib/report";
import { aiShareImage } from "@/lib/aiShareImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A 1200×630 share image of "What AI sees" for one report. Same access as the report itself
 * (anyone with its unguessable link). Only that site's own audit data is shown.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const report = await getReport(id).catch(() => null);
  const facts = report?.home?.facts;
  if (!facts) return Response.json({ error: "Report not found (reports are kept for 30 days)." }, { status: 404 });
  const { image, host } = aiShareImage(facts);
  if (new URL(req.url).searchParams.has("download")) image.headers.set("content-disposition", `attachment; filename="what-ai-sees-${host.replace(/[^a-z0-9.-]/gi, "")}.png"`);
  image.headers.set("cache-control", "private, max-age=600");
  return image;
}
