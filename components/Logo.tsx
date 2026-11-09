import { BRAND } from "@/lib/brand";

/** Lens + spark mark: "found by search, seen by AI". Same drawing as public/icon.svg. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="logo-mark">
      <rect width="32" height="32" rx="8" fill="#156064" />
      <circle cx="14" cy="15" r="6.5" stroke="#00C49A" strokeWidth="2.6" />
      <path d="M19 20l5 5" stroke="#00C49A" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24.5 4.5l1.05 2.45L28 8l-2.45 1.05L24.5 11.5l-1.05-2.45L21 8l2.45-1.05z" fill="#F8E16C" />
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
