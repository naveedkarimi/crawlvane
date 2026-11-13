import { APP_URL } from "./hosts";
import { SITE_URL } from "./config";

/** Google sends people back here after they allow access. Add it in Google Cloud as an authorised redirect URI. */
export function googleRedirectUri(req: Request): string {
  const origin = process.env.NODE_ENV === "development" ? new URL(req.url).origin : APP_URL || SITE_URL;
  return `${origin}/api/me/google/callback`;
}
export const STATE_COOKIE = "cv_gstate";
