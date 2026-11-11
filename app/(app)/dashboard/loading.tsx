import OpeningSpinner from "@/components/OpeningSpinner";

/** Shown while Next.js loads the dashboard route. The dashboard then shows its skeleton while data loads. */
export default function Loading() {
  return <OpeningSpinner />;
}
