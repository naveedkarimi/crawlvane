/** Inside the dashboard, "run a full report" stays in the app. On the public site it uses the home page form. */
export function fullReportHref(pathname: string | null, url: string): string {
  const u = encodeURIComponent(url);
  return pathname?.startsWith("/dashboard") ? `/dashboard?tab=check&mode=full&url=${u}` : `/?mode=full&url=${u}`;
}
