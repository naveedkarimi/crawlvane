import { isAdmin } from "@/lib/config";
import { createWidget, listWidgetLeads, listWidgets, validateWidget } from "@/lib/widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: list widgets with their lead counts. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return new Response("Forbidden", { status: 403 });
  const [widgets, leads] = await Promise.all([listWidgets(), listWidgetLeads()]);
  return Response.json({ widgets: widgets.map((w) => ({ ...w, leads: leads.filter((l) => l.widgetId === w.id) })) });
}

/** Admin: create a widget for an agency. */
export async function POST(req: Request) {
  if (!isAdmin(req)) return new Response("Forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const w = await validateWidget(body);
  if (typeof w === "string") return Response.json({ error: w }, { status: 400 });
  return Response.json(await createWidget(w));
}
