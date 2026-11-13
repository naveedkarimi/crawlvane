import { randomBytes } from "node:crypto";
import { requireAccount } from "@/lib/apiAuth";
import { authUrl, googleConfigured } from "@/lib/google";
import { STATE_COOKIE, googleRedirectUri } from "@/lib/googleRoutes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → redirects to Google's consent screen (owners only). */
export async function GET(req: Request) {
  const a = await requireAccount(req);
  if (a instanceof Response) return a;
  if (a.role !== "owner") return Response.json({ error: "Only the team owner can connect Google." }, { status: 403 });
  if (!googleConfigured()) return Response.json({ error: "Google connections aren't set up yet." }, { status: 503 });
  const state = randomBytes(24).toString("base64url");
  const headers = new Headers({ location: authUrl(googleRedirectUri(req), state) });
  headers.append("set-cookie", `${STATE_COOKIE}=${state}.${a.org.id}; Path=/api/me/google; Max-Age=600; HttpOnly; SameSite=Lax${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`);
  return new Response(null, { status: 302, headers });
}
