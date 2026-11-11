import LeadForm from "@/components/LeadForm";
import { ArrowRight, Mail, Rss } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { TOOLS, toolUrl } from "@/lib/tools";
import Logo from "./Logo";

// Octicons "mark-github" (MIT) and a simple LinkedIn "in": lucide no longer ships brand icons.
const year = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <footer className="site-footer no-print">
      <div className="container">
        <div className="footer-cta-card">
          <div>
            <div className="footer-kicker">Free, about 20 seconds, no sign-up</div>
            <h2>See what Google and AI see on your site.</h2>
          </div>
          <div className="footer-cta-actions">
            <a className="btn btn-light" href="/#audit">Run a free audit <ArrowRight size={16} /></a>
            <a className="btn btn-outline-light" href="/tools">Try the free tools</a>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>{BRAND.tagline}</p>
            <div className="footer-social">
              <a href={BRAND.contactUrl} aria-label="Contact"><Mail size={17} /></a>
              <a href="/blog" aria-label="Blog"><Rss size={17} /></a>
            </div>
            <div className="footer-newsletter">
              <LeadForm kind="newsletter" compact />
            </div>
          </div>
          <nav aria-label="Product">
            <h2>Product</h2>
            <a href="/#audit">Page check</a>
            <a href="/?mode=full#audit">Full site report</a>
            <a href="/tools/app-store-checker">App Check</a>
            <a href="/bulk">Bulk audit</a>
            <a href="/developers">API</a>
            <a href="/#features">Features</a>
            <a href="/pricing">Pricing</a>
          </nav>
          <nav aria-label="Free tools">
            <h2>Free tools</h2>
            {TOOLS.slice(0, 6).map((t) => <a key={t.slug} href={toolUrl(t.slug)}>{t.short}</a>)}
            <a href="/tools" className="footer-more">All {TOOLS.length} tools <ArrowRight size={14} /></a>
          </nav>
          <nav aria-label="Resources">
            <h2>Resources</h2>
            <a href="/blog">Blog and guides</a>
            <a href="/#faq">FAQ</a>
            <a href="/llms.txt">llms.txt</a>
            <a href={BRAND.contactUrl}>Contact</a>
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
          <p className="footer-note">
            Scores are readiness signals, not ranking or citation guarantees. Product names belong to their owners; {BRAND.name} isn&apos;t affiliated with them.
          </p>
        </div>
      </div>
    </footer>
  );
}
