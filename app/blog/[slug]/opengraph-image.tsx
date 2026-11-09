import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { getPost, posts } from "@/lib/blog";

// Share image per post: brand, title and tags (1200x630).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Blog post";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  const title = post?.title ?? BRAND.name;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(180deg, #fbfefd 0%, #e3f5ef 100%)", color: "#0f2f31" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#156064" />
            <circle cx="14" cy="15" r="6.5" stroke="#00C49A" strokeWidth="2.6" />
            <path d="M19 20l5 5" stroke="#00C49A" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M24.5 4.5l1.05 2.45L28 8l-2.45 1.05L24.5 11.5l-1.05-2.45L21 8l2.45-1.05z" fill="#F8E16C" />
          </svg>
          <div style={{ fontSize: 38, fontWeight: 700 }}>{BRAND.name}</div>
          <div style={{ fontSize: 26, color: "#00765d", marginLeft: 12 }}>Blog</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 62 : 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08, maxWidth: 1050 }}>{title}</div>
        <div style={{ display: "flex", gap: 12 }}>
          {(post?.tags ?? []).slice(0, 3).map((t) => (
            <div key={t} style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: "#156064", color: "#e3f5ef", fontSize: 24 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
