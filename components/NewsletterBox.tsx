import { Mail } from "lucide-react";
import LeadForm from "@/components/LeadForm";

/** Newsletter signup for the blog: the one place readers come for tips. */
export default function NewsletterBox() {
  return (
    <aside className="newsletter-box" aria-labelledby="newsletter-title">
      <span className="newsletter-icon" aria-hidden="true"><Mail size={20} /></span>
      <div className="newsletter-copy">
        <h2 id="newsletter-title">Get new guides by email</h2>
        <p>Practical SEO and AI search tips, when we publish something worth reading.</p>
      </div>
      <div className="newsletter-form">
        <LeadForm kind="newsletter" compact />
      </div>
    </aside>
  );
}
