import type { Metadata } from "next";
import { Clock, FileSearch, Wrench } from "lucide-react";
import LeadForm from "@/components/LeadForm";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Contact ${BRAND.name}`,
  description: `Questions about a report, fixes, an agency pilot or your data? Send ${BRAND.name} a message and get a reply within two working days.`,
  alternates: { canonical: "/contact" },
};

const reasons = [
  { icon: FileSearch, title: "A question about a report", text: "Paste the page you checked and the issue you're unsure about." },
  { icon: Wrench, title: "Fixes done for you", text: "Tell us your CMS and we'll send a fixed price for the work." },
  { icon: Clock, title: "Your data", text: "Ask what we hold about you, or ask us to delete it." },
];

export default function ContactPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="kicker">Contact</div>
          <h1>Talk to a person.</h1>
          <p className="lead">Messages go straight to the team behind {BRAND.name}, and you&apos;ll get a reply within two working days.</p>
        </div>
      </section>
      <section className="section section-tight">
        <div className="container contact-grid">
          <div className="card contact-card">
            <h2>Send a message</h2>
            <LeadForm kind="contact" />
          </div>
          <aside className="contact-aside">
            <h2>People usually write about</h2>
            <ul>
              {reasons.map((r) => (
                <li key={r.title}>
                  <span className="feature-list-icon" aria-hidden="true"><r.icon size={20} strokeWidth={1.6} /></span>
                  <div>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
