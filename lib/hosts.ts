/**
 * The landing site and the app can live on different addresses: crawlvane.com for the public
 * pages and app.crawlvane.com for the dashboard. Set NEXT_PUBLIC_APP_URL to split them; leave it
 * unset (as in local development) and everything runs on one address.
 */
const clean = (u: string | undefined) => (u ?? "").trim().replace(/\/+$/, "");
const siteUrl = clean(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL) || "https://crawlvane.com";

/**
 * `npm run dev` ignores the app address and the shared cookie domain, so links like Sign in stay
 * on localhost even when .env.local holds the live settings. A production build uses them.
 */
const isDev = process.env.NODE_ENV === "development";

export const APP_URL = isDev ? "" : clean(process.env.NEXT_PUBLIC_APP_URL);

/** A link into the app: absolute when the app has its own address, otherwise a plain path. */
export const appUrl = (path: string) => `${APP_URL}${path}`;

/** Paths that belong to the app. On the landing address they redirect to the app address. */
export const APP_PATHS = ["/dashboard", "/login", "/auth", "/invite"];
export const isAppPath = (path: string) => APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
};
export const mainHost = () => hostOf(siteUrl);
export const appHost = () => (APP_URL ? hostOf(APP_URL) : "");
const bare = (host: string) => host.toLowerCase().replace(/:\d+$/, "");

/** An agency's own report domain: anything that isn't ours, when custom report domains are on. */
export function isCustomHost(host: string): boolean {
  if (process.env.CUSTOM_REPORT_DOMAINS !== "1") return false;
  const h = bare(host);
  const ours = [mainHost(), `www.${mainHost()}`, appHost(), "localhost", "127.0.0.1"].filter(Boolean);
  return !!h && !ours.includes(h);
}

export const hostKind = (host: string): "app" | "main" | "custom" | "other" => {
  const h = bare(host);
  if (APP_URL && h === appHost()) return "app";
  if (h === mainHost() || h === `www.${mainHost()}`) return "main";
  return isCustomHost(h) ? "custom" : "other";
};

/** Cookie domain shared by both addresses (".crawlvane.com"), so the landing site knows you're signed in. */
export const authCookieOptions = () => {
  const domain = isDev ? "" : process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim();
  return domain ? { domain } : undefined;
};

/** A link to the landing site: absolute when the app has its own address, otherwise a plain path. */
export const siteLink = (path: string) => (APP_URL ? `${siteUrl}${path}` : path);
