import type { Metadata } from "next";
import { ArrowRight, BookOpen, Home, Mail, ScanSearch, Wrench } from "lucide-react";
import { posts } from "@/lib/blog";
import { BRAND } from "@/lib/brand";
import SiteChrome from "@/components/SiteChrome";
import NotFoundPath from "@/components/NotFoundPath";

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

const NEXT = [
  { href: "/#audit", icon: ScanSearch, title: "Audit your site", text: "Free check for search engines and AI assistants." },
  { href: "/tools", icon: Wrench, title: "Free tools", text: "Quick checks for SEO and AI, no sign-up." },
  { href: "/blog", icon: BookOpen, title: "Guides", text: "Plain-English SEO, AEO and GEO guides." },
  { href: "/contact", icon: Mail, title: "Contact us", text: "Tell us about a broken link." },
];

/** The 0 in 404: the logo's ring as a score gauge, its needle resting at zero. */
function ZeroGauge() {
  return (
    <svg className="nf-zero" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="46" className="nf-zero-track" />
      <circle cx="60" cy="60" r="46" className="nf-zero-tick" pathLength={100} strokeDasharray="1.2 7.13" />
      <g className="nf-needle">
        <path d="M60 60 L32 88" />
        <circle cx="60" cy="60" r="7" />
      </g>
    </svg>
  );
}

export default function NotFound() {
  // Unknown addresses are shown from the root layout, so this page adds the site header itself.
  return (
    <SiteChrome>
      <main>
        <section className="hero hero-dark nf-hero" aria-labelledby="nf-title">
          <div className="container nf-inner">
            <p className="nf-code" aria-hidden="true"><span>4</span><ZeroGauge /><span>4</span></p>
            <h1 id="nf-title">Nothing here to crawl</h1>
            <p className="hero-sub">The link may be out of date, or the address may have a typo. Our crawler couldn&apos;t find it, and neither will search engines.</p>
            <NotFoundPath />
            <div className="nf-actions">
              <a className="btn btn-light" href="/"><Home size={16} aria-hidden="true" /> Back to home</a>
              <a className="btn btn-outline-light" href="/#audit">Audit your site free <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
        <section className="section section-tight">
          <div className="container">
            <h2 className="nf-h">Where to next</h2>
            <div className="nf-grid">
              {NEXT.map(({ href, icon: Icon, title, text }) => (
                <a key={href} className="nf-card" href={href}>
                  <span className="nf-card-icon" aria-hidden="true"><Icon size={18} /></span>
                  <strong>{title}</strong>
                  <span>{text}</span>
                  <ArrowRight className="nf-card-arrow" size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
            <div className="nf-bottom">
              <nav aria-labelledby="nf-guides">
                <h2 id="nf-guides" className="nf-h">Latest guides</h2>
                <ul>{posts.slice(0, 4).map((p) => <li key={p.slug}><a href={`/blog/${p.slug}`}>{p.title}</a></li>)}</ul>
              </nav>
              <aside className="nf-tip" aria-labelledby="nf-tip">
                <h2 id="nf-tip" className="nf-h">A good 404, for what it&apos;s worth</h2>
                <p>This page returns a real 404 status, so search engines drop the address. A &ldquo;soft 404&rdquo;, an error page that answers 200 OK, wastes crawl budget and can get indexed.</p>
                <a href="/tools/redirect-checker">Check your own error pages <ArrowRight size={14} aria-hidden="true" /></a>
              </aside>
            </div>
            <p className="muted small nf-note">AI assistant or crawler? <a href="/llms.txt">llms.txt</a> lists the main pages on this site.</p>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
