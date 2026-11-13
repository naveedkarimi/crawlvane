import { ArrowRight, Link2, ListChecks, Share2, Wrench } from "lucide-react";

const steps = [
  { icon: Link2, title: "Enter your URL", text: "Check one page in about 20 seconds, or crawl up to 300 pages to find problems that repeat across the site." },
  { icon: ListChecks, title: "See what matters", text: "Scores for SEO, answers and AI search, with the biggest issues first and the AI crawlers that can or can't read you." },
  { icon: Wrench, title: "Apply the fixes", text: "Copy the generated robots.txt, llms.txt and schema, follow the fix plan, then re-run the check to see the score move." },
  { icon: Share2, title: "Compare and share", text: "Line up to 3 competitors side by side, then share the report link or download it as a PDF." },
];

/** The four-step "How it works" section, on the home page and the Features page. */
export default function HowItWorks({ ctaHref = "#audit" }: { ctaHref?: string }) {
  return (
    <section className="section section-dark how-section" id="how" aria-labelledby="how-title">
      <div className="container">
        <div className="section-head">
          <div className="kicker kicker-center">How it works</div>
          <h2 id="how-title">From URL to a clear plan in minutes.</h2>
          <p className="lead">No setup and no account. Paste a link and get a report you can act on the same day.</p>
        </div>
        <ol className="timeline">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <li key={st.title}>
                <span className="timeline-icon" aria-hidden="true"><Icon size={24} strokeWidth={2} /></span>
                <span className="timeline-step">Step {String(i + 1).padStart(2, "0")}</span>
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </li>
            );
          })}
        </ol>
        <div className="center-actions"><a className="btn btn-light" href={ctaHref}>Try it on your site <ArrowRight size={16} /></a></div>
      </div>
    </section>
  );
}
