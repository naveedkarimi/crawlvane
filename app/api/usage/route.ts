import { isAdmin } from "@/lib/config";
import { usageReport } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin only: AI API usage for the last N days (default 30). GET /api/usage?days=7 with x-admin-key. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return new Response("Forbidden", { status: 403 });
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 30) || 30));
  return Response.json(await usageReport(days));
}
