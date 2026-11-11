import { requireAccount } from "@/lib/apiAuth";
import { exportAccount } from "@/lib/exportData";
import { rateLimit } from "@/lib/rateLimit";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Downloads everything held about you and your current team, as JSON. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (!rateLimit("export:" + a.user.id, 10)) return Response.json({ error: "Too many downloads. Try again in an hour." }, { status: 429 });
  const data = await exportAccount(a);
  const name = `${BRAND.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-data-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
}
