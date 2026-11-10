import { renderMarkdown } from "@/lib/blog/markdown";
import PageHero from "./PageHero";

/** Plain document page (privacy, terms, credits) using the blog's Markdown renderer and article styles. */
export default function DocPage({ title, dek, updated, body, kicker }: { title: string; dek: string; updated: string; body: string; kicker?: string }) {
  const { html } = renderMarkdown(body);
  const date = new Date(updated + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <main>
      <PageHero kicker={kicker} title={title}>
        <p className="hero-sub">{dek}</p>
        <p className="post-meta">Last updated <time dateTime={updated}>{date}</time></p>
      </PageHero>
      <article className="post">
        <div className="container post-container">
          <div className="post-body doc-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </article>
    </main>
  );
}
