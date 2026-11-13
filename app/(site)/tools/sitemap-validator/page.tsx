import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SitemapTool from "./SitemapTool";

export const metadata: Metadata = {
  title: "XML sitemap validator: URLs, lastmod, errors",
  description: "Find your XML sitemap, check it's listed in robots.txt, validate URLs and lastmod dates, and spot-check that listed pages load without redirects. Free.",
  alternates: { canonical: "/tools/sitemap-validator" },
};

const faqs = [
  { q: "Do I need an XML sitemap?", a: "Small, well-linked sites can be found without one, but a sitemap helps search engines find new and updated pages faster. Bing, whose index feeds Copilot and other AI tools, leans on sitemaps and lastmod dates more than Google does." },
  { q: "What should a sitemap include?", a: "Only the final URLs you want in search results: pages that return 200, aren't redirected, aren't set to noindex and have a canonical pointing to themselves. Leave out admin, cart, search and filter pages." },
  { q: "What are the size limits?", a: "50,000 URLs and 50 MB uncompressed per file. Bigger sites split their URLs into several sitemaps and list them in a sitemap index." },
  { q: "Does lastmod matter?", a: "Google and Bing use lastmod to decide what to recrawl, but only if the dates are accurate. If every URL shows the same build date, they learn to ignore it." },
];

export default function Page() {
  return (
    <ToolPage slug="sitemap-validator" h1="XML sitemap validator" faqs={faqs} guide="ai-crawlers-which-to-allow"
      sub="Enter your site or sitemap address. We find the sitemap, check it against the rules search engines use, and test a sample of the pages it lists.">
      <SitemapTool />
    </ToolPage>
  );
}
