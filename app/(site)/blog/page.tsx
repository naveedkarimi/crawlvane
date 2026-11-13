import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { posts } from "@/lib/blog";
import PostCard from "@/components/PostCard";
import PageHero from "@/components/PageHero";
import NewsletterBox from "@/components/NewsletterBox";

export const metadata: Metadata = {
  title: "Blog: SEO, answer engines and AI search, explained",
  description: `Practical guides on SEO, AEO and GEO: how ChatGPT, Claude and Perplexity read websites, which AI crawlers to allow, Core Web Vitals and more. From the ${BRAND.name} team.`,
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const [lead, ...rest] = posts;
  return (
    <main>
      <PageHero kicker="Blog" title={<>Get found by search and AI.</>}>
        <p className="hero-sub">Plain-English guides to SEO, answer engines and AI search, with checks you can run on your own site.</p>
      </PageHero>

      <section className="section section-tight">
        <div className="container">
          <PostCard post={lead} heading="h2" lead />

          <div className="post-grid">
            {rest.map((p) => <PostCard key={p.slug} post={p} heading="h2" />)}
          </div>

          <NewsletterBox />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: `${BRAND.name} blog`,
            url: `${BRAND.url}/blog`,
            publisher: { "@id": `${BRAND.url}/#org` },
            blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${BRAND.url}/blog/${p.slug}`, datePublished: p.date })),
          }),
        }}
      />
    </main>
  );
}
