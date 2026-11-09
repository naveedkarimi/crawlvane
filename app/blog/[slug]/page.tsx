import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { CTAS, getPost, posts, readMinutes, relatedPosts, type Post } from "@/lib/blog";
import { renderMarkdown } from "@/lib/blog/markdown";
import { postImage } from "@/lib/blog/images";
import PostCard from "@/components/PostCard";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    authors: [{ name: BRAND.name, url: BRAND.url }],
    openGraph: { type: "article", title: p.title, description: p.description, url: `${BRAND.url}/blog/${p.slug}`, publishedTime: p.date, modifiedTime: p.updated ?? p.date, authors: [BRAND.name] },
  };
}

const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

function Cta({ post, variant }: { post: Post; variant: "inline" | "end" }) {
  const c = CTAS[post.cta];
  return (
    <aside className={`post-cta post-cta-${variant}`}>
      <div>
        <strong>{c.title}</strong>
        <p>{c.text}</p>
      </div>
      <a className="btn btn-primary" href={c.href}>{c.label} <ArrowRight size={16} /></a>
    </aside>
  );
}

export default async function PostPage({ params }: Params) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const parts = post.body.split(/^\[\[cta\]\]$/m);
  const rendered = parts.map((part) => renderMarkdown(part));
  const headings = rendered.flatMap((r) => r.headings);
  const related = relatedPosts(post);
  const url = `${BRAND.url}/blog/${post.slug}`;
  const cover = postImage(post.slug);

  return (
    <main>
      <article className="post">
        <header className="post-hero">
          <div className="container post-container">
            <nav className="crumbs" aria-label="Breadcrumb"><a href="/blog">Blog</a> <span aria-hidden="true">/</span> {post.tags[0]}</nav>
            <h1>{post.title}</h1>
            <p className="post-dek">{post.description}</p>
            <p className="post-meta">
              By {BRAND.name} · <time dateTime={post.date}>{fmt(post.date)}</time>
              {post.updated && <> · Updated <time dateTime={post.updated}>{fmt(post.updated)}</time></>} · {readMinutes(post)} min read
            </p>
          </div>
        </header>
        {cover && (
          <div className="container post-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="post-cover" src={cover.src} alt={cover.alt} width={1200} height={750} fetchPriority="high" />
          </div>
        )}

        <div className="container post-layout">
          <div className="post-body">
            {rendered.map((r, i) => (
              <div key={i}>
                <div dangerouslySetInnerHTML={{ __html: r.html }} />
                {i < rendered.length - 1 && <Cta post={post} variant="inline" />}
              </div>
            ))}
            <Cta post={post} variant="end" />
          </div>
          {headings.length > 2 && (
            <aside className="post-toc" aria-label="On this page">
              <strong>On this page</strong>
              <ol>{headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
              <a className="btn btn-primary btn-sm btn-block" href={CTAS[post.cta].href}>{CTAS[post.cta].label}</a>
            </aside>
          )}
        </div>
      </article>

      <section className="section section-muted">
        <div className="container">
          <div className="section-head left"><h2>Keep reading</h2></div>
          <div className="post-grid">
            {related.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BlogPosting",
                headline: post.title,
                description: post.description,
                url,
                mainEntityOfPage: url,
                datePublished: post.date,
                dateModified: post.updated ?? post.date,
                author: { "@id": `${BRAND.url}/#org` },
                publisher: { "@id": `${BRAND.url}/#org` },
                keywords: post.tags.join(", "),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Blog", item: `${BRAND.url}/blog` },
                  { "@type": "ListItem", position: 2, name: post.title, item: url },
                ],
              },
            ],
          }),
        }}
      />
    </main>
  );
}
