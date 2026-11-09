import { getStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { audits } = await getStats();
  return Response.json({ audits }, { headers: { "cache-control": "public, max-age=600, s-maxage=600" } });
}
