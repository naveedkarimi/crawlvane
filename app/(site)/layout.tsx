import SiteChrome from "@/components/SiteChrome";

/** Public pages: home, tools, blog, reports and legal pages, with the site header and footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
