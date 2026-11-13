import type { Metadata } from "next";
import { ldJson } from "@/lib/jsonLd";
import { ArrowRight } from "lucide-react";
import { ToolGrid } from "@/components/ToolPage";
import HeroDecor from "@/components/HeroDecor";
import { BRAND } from "@/lib/brand";
import { TOOL_GROUPS, TOOLS, toolUrl } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free SEO and AI search tools",
  description:
    "Free tools to check whether ChatGPT, Claude and Perplexity can read and cite your site: AI visibility, AI bots, robots.txt, llms.txt and schema.",
  alternates: { canonical: "/tools" },
};

export default function Page() {
  return (
    <main>
      <section className="hero hero-tool" aria-labelledby="tools-title">
        <HeroDecor />
        <div className="container hero-inner">
          <div className="kicker kicker-center">Free tools</div>
          <h1 id="tools-title" className="tool-title">Free tools for SEO and AI search</h1>
          <p className="hero-sub">
            Quick, single-purpose checks and generators. No sign-up. Each one fixes a common reason search engines and AI assistants skip a site.
          </p>
        </div>
      </section>
      <section className="section section-tight">
        <div className="container">
          {TOOL_GROUPS.map((g) => (
            <div key={g.key} className="tool-group">
              <div className="tool-group-head">
                <h2>{g.title}</h2>
                <p>{g.intro}</p>
              </div>
              <ToolGrid tools={TOOLS.filter((t) => t.group === g.key)} />
            </div>
          ))}
          <div className="center-actions">
            <a className="btn btn-primary" href="/#audit">Run the full audit <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Free SEO and AI search tools",
            url: `${BRAND.url}/tools`,
            publisher: { "@id": `${BRAND.url}/#org` },
            mainEntity: {
              "@type": "ItemList",
              itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: `${BRAND.url}${toolUrl(t.slug)}` })),
            },
          }),
        }}
      />
    </main>
  );
}
