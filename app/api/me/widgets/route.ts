import { requireAccount } from "@/lib/apiAuth";
import { limitsFor, planAllowsFor } from "@/lib/entitlements";
import { createWidget, deleteOrgWidget, listOrgWidgets, updateOrgWidget, validateWidget } from "@/lib/widgets";
import { SITE_URL } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The team's embeddable audit widgets. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  return Response.json({ widgets: await listOrgWidgets(a.org.id), limit: limitsFor(a.org).widgets, canEdit: a.role !== "viewer", whiteLabel: planAllowsFor(a.org, "whiteLabel"), siteUrl: SITE_URL });
}

async function read(req: Request, a: Exclude<Awaited<ReturnType<typeof requireAccount>>, Response>) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const v = await validateWidget(body);
  if (typeof v === "string") return { error: v };
  // Removing "Powered by" is part of white-label, so it follows the plan.
  return { widget: { ...v, whiteLabel: v.whiteLabel && planAllowsFor(a.org, "whiteLabel") }, id: String(body.id ?? "") };
}

export async function POST(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't create widgets." }, { status: 403 });
  const limit = limitsFor(a.org).widgets;
  if (limit < 1) return Response.json({ error: "Audit widgets are part of the Agency plan.", upgrade: true }, { status: 402 });
  if ((await listOrgWidgets(a.org.id)).length >= limit) return Response.json({ error: `Your plan includes ${limit} widgets. Delete one first.`, upgrade: true }, { status: 402 });
  const r = await read(req, a);
  if ("error" in r) return Response.json({ error: r.error }, { status: 400 });
  return Response.json({ widget: await createWidget({ ...r.widget, orgId: a.org.id }) });
}

export async function PATCH(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't change widgets." }, { status: 403 });
  const r = await read(req, a);
  if ("error" in r) return Response.json({ error: r.error }, { status: 400 });
  const w = await updateOrgWidget(a.org.id, r.id, r.widget);
  return w ? Response.json({ widget: w }) : Response.json({ error: "That widget wasn't found." }, { status: 404 });
}

export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role === "viewer") return Response.json({ error: "Viewers can't delete widgets." }, { status: 403 });
  const ok = await deleteOrgWidget(a.org.id, new URL(req.url).searchParams.get("id") ?? "");
  return ok ? Response.json({ ok: true }) : Response.json({ error: "That widget wasn't found." }, { status: 404 });
}
