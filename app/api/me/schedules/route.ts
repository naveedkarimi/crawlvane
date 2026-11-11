import { requireAccount } from "@/lib/apiAuth";
import { ScheduleError, listSchedules, removeSchedule, setSchedule } from "@/lib/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ schedules: await listSchedules(a.org.id) });
}

/** POST { siteId, email, everyDays? } emails a full report on the site every month. */
export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const b = (await req.json().catch(() => ({}))) as { siteId?: string; email?: string; everyDays?: number };
  try {
    await setSchedule(a, String(b.siteId ?? ""), String(b.email ?? ""), Number(b.everyDays ?? 30));
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof ScheduleError) return Response.json({ error: e.message, upgrade: e.status === 402 }, { status: e.status });
    throw e;
  }
}

export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change schedules." }, { status: 403 });
  await removeSchedule(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
  return Response.json({ ok: true });
}
