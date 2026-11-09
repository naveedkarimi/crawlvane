import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { TOOLS, toolUrl } from "@/lib/tools";
import { TOOL_ICONS } from "./toolIcons";
import HeroDecor from "./HeroDecor";
import { getPost } from "@/lib/blog";


export interface Faq { q: string; a: string }

/** Shared layout for every free tool page: hero with the tool, FAQ, related guide, other tools and schema. */
export default function ToolPage({
  slug,
  h1,
  sub,
  faqs,
  guide,
  children,
}: {
  slug: string;
  h1: string;
  sub: React.ReactNode;
  faqs: Faq[];
  /** Blog post slug that explains the topic in depth. */
  guide?: string;
  children: React.ReactNode;
}) {
  const tool = TOOLS.find((t) => t.slug === slug)!;
  const post = guide ? getPost(guide) : undefined;
  const others = TOOLS.filter((t) => t.slug !== slug);
  const url = `${BRAND.url}${toolUrl(slug)}`;
  return (
    <main>
      <section className="hero hero-tool" aria-labelledby="tool-title">
        <HeroDecor />
        <div className="container hero-inner">
          <div className="kicker kicker-center">Free tool</div>
          <h1 id="tool-title" className="tool-title">{h1}</h1>
          <p className="hero-sub">{sub}</p>
          <h2 className="sr-only">{h1}: try it</h2>
          {children}
        </div>
      </section>

      <section className="section">
        <div className="container faq-layout">
          <div className="section-head left">
            <div className="kicker">Questions</div>
            <h2>About this tool</h2>
            <p className="lead">Want the full picture? The free {BRAND.name} audit runs about 50 SEO, answer and AI search checks and gives you the fixes.</p>
            <a className="btn btn-primary" href="/#audit" style={{ marginTop: 20 }}>Run a full audit <ArrowRight size={16} /></a>
            {post && (
              <p className="tool-guide">
                Read the guide: <a href={`/blog/${post.slug}`}>{post.title}</a>
              </p>
            )}
          </div>
          <div className="faq-list">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary><h3>{f.q}</h3><span className="faq-icon" aria-hidden="true" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="more-tools">
        <div className="container">
          <div className="section-head">
            <div className="kicker kicker-center">More free tools</div>
            <h2 id="more-tools">Check the rest of your site</h2>
          </div>
          <ToolGrid tools={others} />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                name: `${BRAND.name}: ${tool.name}`,
                description: tool.summary,
                url,
                applicationCategory: "BusinessApplication",
                operatingSystem: "Any",
                isAccessibleForFree: true,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                publisher: { "@id": `${BRAND.url}/#org` },
              },
              {
                "@type": "FAQPage",
                url,
                dateModified: BRAND.updated,
                mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${BRAND.url}/` },
                  { "@type": "ListItem", position: 2, name: "Free tools", item: `${BRAND.url}/tools` },
                  { "@type": "ListItem", position: 3, name: tool.name, item: url },
                ],
              },
            ],
          }),
        }}
      />
    </main>
  );
}

export function ToolGrid({ tools = TOOLS }: { tools?: typeof TOOLS }) {
  return (
    <div className="tool-grid">
      {tools.map((t) => {
        const Icon = TOOL_ICONS[t.icon];
        return (
          <a key={t.slug} className="tool-card" href={toolUrl(t.slug)}>
            <span className="feature-icon"><Icon size={22} /></span>
            <h3>{t.name}</h3>
            <p>{t.summary}</p>
            <span className="tool-card-go">Open tool <ArrowRight size={15} /></span>
          </a>
        );
      })}
    </div>
  );
}
