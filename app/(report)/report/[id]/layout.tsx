import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SiteChrome from "@/components/SiteChrome";
import { getReport } from "@/lib/report";
import { orgForDomain } from "@/lib/branding";
import { isCustomHost } from "@/lib/hosts";
import { db } from "@/lib/store";

/**
 * Reports normally show the site header and footer. A white-label report shows only the
 * agency's branding, and on an agency's own domain only that agency's reports are served.
 */
export default async function ReportLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const host = (await headers()).get("host") ?? "";
  const report = await getReport(id).catch(() => null);
  if (isCustomHost(host)) {
    const orgId = await orgForDomain(host).catch(() => null);
    if (!orgId || !report) notFound();
    const { data } = await db().from("org_reports").select("report_id").eq("report_id", id).eq("org_id", orgId).maybeSingle();
    if (!data) notFound();
  }
  if (report?.input.options.whiteLabel || isCustomHost(host)) {
    return <div id="main" className="wl-page">{children}</div>;
  }
  return <SiteChrome>{children}</SiteChrome>;
}
