import { requireAccount } from "@/lib/apiAuth";
import { db, readJson } from "@/lib/store";
import { compareReports } from "@/lib/reportCompare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?id=REPORT[&with=OTHER] → the difference from the team's previous report of the same site
 * (or from OTHER). Only for reports the team ran.
 */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const q = new URL(req.url).searchParams;
  const id = q.get("id") ?? "";
  const { data: me } = await db().from("org_reports").select("report_id, url, created_at").eq("org_id", a.org.id).eq("report_id", id).maybeSingle();
  if (!me) return Response.json({ error: "Report not found." }, { status: 404 });
  let otherId = q.get("with");
  if (otherId) {
    const { data: other } = await db().from("org_reports").select("report_id").eq("org_id", a.org.id).eq("report_id", otherId).maybeSingle();
    if (!other) return Response.json({ error: "Report not found." }, { status: 404 });
  } else {
    // The latest earlier report of the same site address.
    const host = (() => { try { return new URL(me.url as string).hostname.replace(/^www\./, ""); } catch { return ""; } })();
    const { data: earlier } = await db().from("org_reports").select("report_id, url, created_at").eq("org_id", a.org.id).lt("created_at", me.created_at as string).order("created_at", { ascending: false }).limit(50);
    otherId = (earlier ?? []).find((r) => { try { return new URL(r.url as string).hostname.replace(/^www\./, "") === host; } catch { return false; } })?.report_id ?? null;
  }
  if (!otherId) return Response.json({ previous: null });
  const [now, before] = await Promise.all([readJson<Parameters<typeof compareReports>[1] & { status?: string }>("reports", id), readJson<Parameters<typeof compareReports>[0] & { status?: string; id?: string }>("reports", otherId)]);
  if (!now || !before || before.status !== "done") return Response.json({ previous: null });
  const [older, newer] = Date.parse(before.createdAt) <= Date.parse(now.createdAt) ? [before, now] : [now, before];
  return Response.json({ previous: { id: otherId, createdAt: before.createdAt }, diff: compareReports(older, newer) });
}
