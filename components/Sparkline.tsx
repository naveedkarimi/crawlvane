import { sparklinePath } from "@/lib/sparkline";

/** Small score trend line. */
export default function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return <span className="spark-empty muted small">Trend appears after 2 checks</span>;
  return (
    <svg className="spark" width={120} height={32} viewBox="0 0 120 32" role="img" aria-label={label}>
      <path d={sparklinePath(values)} />
    </svg>
  );
}
