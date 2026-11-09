import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/blog/types";
import { readMinutes } from "@/lib/blog";
import { postImage } from "@/lib/blog/images";

export const shortDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** Blog card: cover photo with a date badge, tags, title, summary and reading time. */
export default function PostCard({ post, heading = "h3", lead = false }: { post: Post; heading?: "h2" | "h3"; lead?: boolean }) {
  const img = postImage(post.slug);
  const H = heading;
  return (
    <a className={`post-card ${lead ? "post-card-lead" : ""}`} href={`/blog/${post.slug}`}>
      <div className="post-card-media">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.src} alt={img.alt} width={1200} height={750} loading={lead ? "eager" : "lazy"} decoding="async" />
        )}
        <time className="post-date" dateTime={post.date}>{shortDate(post.date)}</time>
      </div>
      <div className="post-card-body">
        <div className="post-tags">{post.tags.slice(0, lead ? 3 : 2).map((t) => <span key={t} className="tag">{t}</span>)}</div>
        <H>{post.title}</H>
        <p>{post.description}</p>
        <span className="post-card-foot">
          <span className="post-meta">{readMinutes(post)} min read</span>
          <span className="post-more">Read more <ArrowUpRight size={15} /></span>
        </span>
      </div>
    </a>
  );
}
