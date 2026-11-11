import { LogoMark } from "./Logo";
import { BRAND } from "@/lib/brand";

/**
 * Full-screen spinner shown from the moment someone opens the dashboard until the dashboard
 * paints. It's on screen only while the page is really loading, never for a set time.
 */
export default function OpeningSpinner({ label = "Opening your dashboard…" }: { label?: string }) {
  return (
    <div className="opening" role="status" aria-live="polite">
      <div className="opening-mark">
        <span className="opening-ring" aria-hidden="true" />
        <LogoMark size={34} />
      </div>
      <p className="opening-name">{BRAND.name}</p>
      <p className="opening-label">{label}</p>
    </div>
  );
}
