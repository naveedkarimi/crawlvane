import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ToolGrid } from "@/components/ToolPage";
import { posts } from "@/lib/blog";
import { BRAND } from "@/lib/brand";
import { TOOLS } from "@/lib/tools";
import PageHero from "@/components/PageHero";
import SiteChrome from "@/components/SiteChrome";

/**
 * Served with a real 404 status, so search engines drop the address instead of treating
 * it as a thin page. No canonical or schema: this page isn't something to index or cite.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: `This page doesn't exist on ${BRAND.name}. Run a free SEO and AI search audit, try a free tool, or read a guide instead.`,
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

const explore = [
  { href: "/", label: "Home" },
  { href: "/?mode=full#audit", label: "Full site report" },
  { href: "/tools", label: "All free tools" },
  { href: "/blog", label: "Blog and guides" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export default function NotFound() {
  // Unknown addresses are shown from the root layout, so this page adds the site header itself.
  return (
    <SiteChrome>
    <main>
      <PageHero kicker="404 error" title={<>We can&apos;t find that page</>}>
        <p className="hero-sub">The link may be out of date, or the address may have a typo. {BRAND.name} checks whether search engines and AI assistants can read your site, and these are the best places to start.</p>
        <div className="center-actions">
          <a className="btn btn-primary" href="/#audit">Audit your site for free <ArrowRight size={16} /></a>
        </div>
      </PageHero>
      <section className="section section-tight">
        <div className="container">
          <div className="tool-group">
            <div className="tool-group-head">
              <h2>Popular free tools</h2>
              <p>Quick checks with no sign-up.</p>
            </div>
            <ToolGrid tools={TOOLS.slice(0, 6)} />
          </div>
          <div className="not-found-columns">
            <nav aria-labelledby="nf-guides">
              <h2 id="nf-guides">Latest guides</h2>
              <ul>
                {posts.slice(0, 4).map((p) => <li key={p.slug}><a href={`/blog/${p.slug}`}>{p.title}</a></li>)}
              </ul>
            </nav>
            <nav aria-labelledby="nf-explore">
              <h2 id="nf-explore">Explore {BRAND.name}</h2>
              <ul>
                {explore.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
              </ul>
            </nav>
          </div>
          <p className="muted small not-found-note">AI assistant or crawler? <a href="/llms.txt">llms.txt</a> lists the main pages on this site.</p>
        </div>
      </section>
    </main>
    </SiteChrome>
  );
}
