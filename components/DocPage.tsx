import { renderMarkdown } from "@/lib/blog/markdown";

/** Plain document page (privacy, terms, credits) using the blog's Markdown renderer and article styles. */
export default function DocPage({ title, dek, updated, body }: { title: string; dek: string; updated: string; body: string }) {
  const { html } = renderMarkdown(body);
  const date = new Date(updated + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <main>
      <article className="post">
        <header className="post-hero">
          <div className="container post-container">
            <h1>{title}</h1>
            <p className="post-dek">{dek}</p>
            <p className="post-meta">Last updated <time dateTime={updated}>{date}</time></p>
          </div>
        </header>
        <div className="container post-container">
          <div className="post-body doc-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </article>
    </main>
  );
}
