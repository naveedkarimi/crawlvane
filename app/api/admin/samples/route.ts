import { isAdmin } from "@/lib/config";
import { addSample, listSamples, removeSample } from "@/lib/samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deny = () => Response.json({ error: "Forbidden" }, { status: 403 });

/** Admin only (x-admin-key). GET lists samples; POST adds one; DELETE ?id= removes one. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return deny();
  return Response.json({ samples: await listSamples() });
}

/** POST { reportId, site, title, summary?, permission }: permission says who agreed to publish it, and when. */
export async function POST(req: Request) {
  if (!isAdmin(req)) return deny();
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const s = { reportId: String(b.reportId ?? "").trim(), site: String(b.site ?? "").trim().slice(0, 120), title: String(b.title ?? "").trim().slice(0, 160), summary: String(b.summary ?? "").trim().slice(0, 400) || undefined, permission: String(b.permission ?? "").trim().slice(0, 300) };
  if (!s.reportId || !s.site || !s.title || !s.permission) return Response.json({ error: "reportId, site, title and permission are required." }, { status: 400 });
  try {
    await addSample(s);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return deny();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required." }, { status: 400 });
  await removeSample(id);
  return Response.json({ ok: true });
}
