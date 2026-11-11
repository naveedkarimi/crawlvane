import { NextResponse, type NextRequest } from "next/server";
import { APP_URL, hostKind, isAppPath } from "./lib/hosts";

/**
 * Routes each address to its pages:
 * - crawlvane.com is the landing site. App pages (/dashboard, /login…) move to the app address.
 * - app.crawlvane.com is the app. "/" opens the dashboard; landing pages move back to the main site.
 * - An agency's own report domain serves only its reports.
 * It also finishes a sign-in that Supabase sent to the home page with ?code=.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://crawlvane.com").replace(/\/+$/, "");
const isAsset = (p: string) => p.startsWith("/_next/") || /\.[a-z0-9]{2,5}$/i.test(p);

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const kind = hostKind(req.headers.get("host") ?? "");

  const code = pathname === "/" ? req.nextUrl.searchParams.get("code") : null;
  if (code) {
    const to = new URL("/auth/callback", APP_URL || req.url);
    to.searchParams.set("code", code);
    to.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(to);
  }

  if (kind === "custom") {
    if (pathname.startsWith("/report/") || pathname.startsWith("/api/reports/") || isAsset(pathname)) return NextResponse.next();
    return new NextResponse("Not found", { status: 404 });
  }
  if (!APP_URL || isAsset(pathname) || pathname.startsWith("/api/")) return NextResponse.next();

  if (kind === "app") {
    if (pathname === "/") return NextResponse.redirect(new URL(`/dashboard${search}`, req.url));
    if (isAppPath(pathname) || pathname.startsWith("/report/")) return NextResponse.next();
    return NextResponse.redirect(`${SITE}${pathname}${search}`);
  }
  if (kind === "main" && isAppPath(pathname)) return NextResponse.redirect(`${APP_URL}${pathname}${search}`);
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
