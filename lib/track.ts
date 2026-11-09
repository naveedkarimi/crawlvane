/**
 * Product analytics. Uses Plausible when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set (the script
 * is added in app/layout.tsx); otherwise does nothing. Events:
 * Audit started, Report finished, Waitlist joined, Fix requested, Contact sent,
 * Report downloaded, Tool used.
 */
type Props = Record<string, string | number | boolean>;
declare global {
  interface Window {
    plausible?: ((event: string, opts?: { props?: Props }) => void) & { q?: unknown[] };
  }
}

export function track(event: string, props?: Props) {
  if (typeof window === "undefined" || !window.plausible) return;
  try {
    window.plausible(event, props ? { props } : undefined);
  } catch {
    /* analytics must never break the app */
  }
}
