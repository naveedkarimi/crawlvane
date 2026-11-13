import { ArrowRight, Mail, Rss } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { TOOLS, toolUrl } from "@/lib/tools";
import Logo from "./Logo";
import { ALL_FEATURES, PRODUCT, RESOURCES, SOLUTIONS } from "./navLinks";

// Octicons "mark-github" (MIT) and a simple LinkedIn "in": lucide no longer ships brand icons.
const year = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <>
      {/* Call to action, as a full-width band just above the footer. */}
      <section className="pre-footer no-print" aria-label="Get started">
        <div className="container pre-footer-inner">
          <div>
            <div className="footer-kicker">Free, about 20 seconds, no sign-up</div>
            <h2>See what search engines and AI see on your site.</h2>
            <p className="pre-footer-sub">Paste a link and get scores for SEO, answers and AI search, with the fixes to paste.</p>
          </div>
          <div className="footer-cta-actions">
            <a className="btn btn-light plan-cta" href="/#audit">Run a free audit <span className="cta-circle" aria-hidden="true"><ArrowRight size={14} /></span></a>
            <a className="btn btn-outline-light" href="/tools">Try the free tools</a>
          </div>
        </div>
      </section>
      <footer className="site-footer no-print">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Logo />
              <p>{BRAND.tagline}</p>
              <div className="footer-social">
                <a href={BRAND.contactUrl} aria-label="Contact"><Mail size={16} /></a>
                <a href="/blog" aria-label="Blog"><Rss size={16} /></a>
              </div>
            </div>
            <nav aria-label="Product">
              <h2>Product</h2>
              {PRODUCT.flatMap((g) => g.links).map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
              <a href={ALL_FEATURES.href}>All features</a>
            </nav>
            <nav aria-label="Solutions">
              <h2>Solutions</h2>
              {SOLUTIONS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
              <a href="/pricing">Pricing</a>
            </nav>
            <nav aria-label="Free tools">
              <h2>Free tools</h2>
              {TOOLS.filter((t) => t.group !== "apps").slice(0, 6).map((t) => <a key={t.slug} href={toolUrl(t.slug)}>{t.short}</a>)}
              <a href="/tools" className="footer-more">All free tools <ArrowRight size={14} /></a>
            </nav>
            <nav aria-label="Resources">
              <h2>Resources</h2>
              {RESOURCES.flatMap((g) => g.links).map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
              <a href="/llms.txt">llms.txt</a>
            </nav>
          </div>

          <div className="footer-legal">
            <div className="footer-legal-row">
              <span>© {year} {BRAND.name}</span>
              <nav aria-label="Legal" className="footer-legal-links">
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                <a href="/accessibility">Accessibility</a>
                <a href="/credits">Credits</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
