import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

// 1200x630 share image used for og:image and twitter:image on every page.
export const alt = `${BRAND.name}: ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "72px 80px", background: "linear-gradient(180deg, #fbfefd 0%, #e3f5ef 100%)", color: "#0f2f31",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#156064" />
            <circle cx="14" cy="15" r="6.5" stroke="#00C49A" strokeWidth="2.6" />
            <path d="M19 20l5 5" stroke="#00C49A" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M24.5 4.5l1.05 2.45L28 8l-2.45 1.05L24.5 11.5l-1.05-2.45L21 8l2.45-1.05z" fill="#F8E16C" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>Get found on Google.</div>
          <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, color: "#0e8f72" }}>Get cited by AI.</div>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 28, color: "#3f5b5c" }}>
          <span>Free SEO, AEO and AI search audit</span>
          <span style={{ color: "#00c49a" }}>•</span>
          <span>Fixes you can paste</span>
        </div>
      </div>
    ),
    size,
  );
}
