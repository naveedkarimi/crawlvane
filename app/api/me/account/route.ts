import { deleteAccount } from "@/lib/accounts";
import { requireAccount } from "@/lib/apiAuth";
import { authClient } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Deletes the signed-in user's account and signs them out. */
export async function DELETE(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  try {
    await deleteAccount(a.user);
  } catch (e) {
    console.error("Deleting an account failed:", e);
    return Response.json({ error: "We couldn't delete the account. Contact us and we'll do it." }, { status: 503 });
  }
  await (await authClient()).auth.signOut().catch(() => {});
  return Response.json({ ok: true });
}
