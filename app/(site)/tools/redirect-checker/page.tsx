import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import RedirectTool from "./RedirectTool";

export const metadata: Metadata = {
  title: "Redirect checker: 301, 302 chains and canonicals",
  description: "Follow every redirect hop with its HTTP status, check http to https, www and non-www, and whether your canonical tag points to a working page. Free.",
  alternates: { canonical: "/tools/redirect-checker" },
};

const faqs = [
  { q: "What's the difference between a 301 and a 302 redirect?", a: "A 301 says the page moved for good, so search engines move rankings and links to the new URL. A 302 (or 307) says the move is temporary, so they may keep the old URL indexed. Use 301 or 308 for anything permanent." },
  { q: "How many redirects is too many?", a: "Aim for one at most. Google follows up to 10 hops, but each one adds delay for visitors and wastes crawl time. Point old URLs straight at the final page instead of chaining them." },
  { q: "Should my site use www or not?", a: "Either is fine. What matters is picking one and redirecting the other to it with a 301, so search engines see one site instead of two." },
  { q: "What does the canonical tag do?", a: "It tells search engines which URL is the main version of a page. If it points somewhere else, or at a page that redirects or doesn't load, the page you're looking at may not be indexed." },
];

export default function Page() {
  return (
    <ToolPage slug="redirect-checker" h1="Redirect and canonical checker" faqs={faqs} guide="seo-vs-aeo-vs-geo"
      sub="See every hop between the address someone types and the page that loads, with status codes, plus your http, www and canonical setup.">
      <RedirectTool />
    </ToolPage>
  );
}
