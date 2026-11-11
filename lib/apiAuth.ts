import { ensureAccount, type Account } from "./accounts";
import { authConfigured, currentUser } from "./auth";
import { featureEnabled } from "./config";
import { cookies } from "next/headers";

/** Cookie holding the team the user chose in the dashboard. */
export const ORG_COOKIE = "cv_org";
const chosenOrg = async () => (await cookies()).get(ORG_COOKIE)?.value ?? null;

/** For /api/me routes: the signed-in account, or the response to send instead. */
export async function requireAccount(req: Request): Promise<Account | Response> {
  if (!featureEnabled("accounts", req)) return Response.json({ error: "Accounts aren't available yet." }, { status: 404 });
  if (!authConfigured()) return Response.json({ error: "Sign-in isn't set up yet." }, { status: 503 });
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  try {
    return await ensureAccount(user, await chosenOrg());
  } catch (e) {
    console.error("Loading the account failed:", e);
    return Response.json({ error: "We couldn't load your account. Try again in a minute." }, { status: 503 });
  }
}

/** The signed-in account when accounts are on, otherwise null. Never throws: used to add extras to public routes. */
export async function optionalAccount(req: Request): Promise<Account | null> {
  if (!featureEnabled("accounts", req) || !authConfigured()) return null;
  try {
    const user = await currentUser();
    return user ? await ensureAccount(user, await chosenOrg()) : null;
  } catch {
    return null;
  }
}
