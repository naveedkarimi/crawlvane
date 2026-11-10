import { BRAND } from "@/lib/brand";

/**
 * The C-Vane: an open ring that forms the C and echoes the score ring, with a needle
 * pointing up and to the right. Drawn from design/Design system planning/logo/crawlvane-mark.svg.
 * The ring is Stormy Teal on light backgrounds; set --logo-ring for dark ones.
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-mark">
      <path className="logo-ring" d="M42.93 22.34A19 19 0 1 1 25.66 5.07L25.05 12.05A12 12 0 1 0 35.95 22.95Z" />
      <path className="logo-needle" d="M39.91 8.09L28.95 26.83L21.17 26.83L21.17 19.05Z" />
    </svg>
  );
}

export default function Logo({ badge = false }: { badge?: boolean }) {
  return (
    <a href="/" className="logo">
      <LogoMark />
      <span className="logo-word">{BRAND.name}</span>
      {badge && <span className="logo-badge">AI-powered</span>}
    </a>
  );
}
