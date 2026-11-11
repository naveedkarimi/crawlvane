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
            <rect width="32" height="32" rx="7" fill="#0C3B3E" />
            <path fill="#F2FAF7" d="M26.29 15.82A10.29 10.29 0 1 1 16.18 5.71L16.09 10.58A5.42 5.42 0 1 0 21.42 15.91Z" />
            <path fill="#00C49A" d="M24.81 7.19L19.26 17.72L14.85 17.15L14.28 12.74Z" />
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
