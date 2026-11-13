import { requireAccount } from "@/lib/apiAuth";
import { finishConnect, GoogleError } from "@/lib/google";
import { STATE_COOKIE, googleRedirectUri } from "@/lib/googleRoutes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (req: Request, result: string) => {
  const headers = new Headers({ location: new URL(`/dashboard?tab=websites&google=${result}`, req.url).toString() });
  headers.append("set-cookie", `${STATE_COOKIE}=; Path=/api/me/google; Max-Age=0; HttpOnly; SameSite=Lax`);
  return new Response(null, { status: 302, headers });
};

/** Google sends the user back here with ?code and ?state. */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  const u = new URL(req.url);
  const cookie = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1) ?? "";
  const [state, orgId] = cookie.split(".");
  // The state must match the one we set, for the same team, or the callback isn't ours.
  if (!state || state !== u.searchParams.get("state") || orgId !== a.org.id || a.role !== "owner") return back(req, "error");
  if (u.searchParams.get("error")) return back(req, "cancelled");
  const code = u.searchParams.get("code");
  if (!code) return back(req, "error");
  try {
    await finishConnect(a.org.id, code, googleRedirectUri(req));
    return back(req, "connected");
  } catch (e) {
    console.error("Google connect failed:", e instanceof GoogleError ? e.message : e);
    return back(req, "error");
  }
}
