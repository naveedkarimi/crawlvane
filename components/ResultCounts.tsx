import { ChevronRight } from "lucide-react";

export type CountKey = "fail" | "warn" | "pass";

const ITEMS: Record<CountKey, { label: (n: number) => string; noun: (n: number) => string }> = {
  fail: { label: () => "Failed", noun: (n) => (n === 1 ? "failed check" : "failed checks") },
  warn: { label: (n) => (n === 1 ? "Warning" : "Warnings"), noun: (n) => (n === 1 ? "warning" : "warnings") },
  pass: { label: () => "Passed", noun: (n) => (n === 1 ? "passed check" : "passed checks") },
};

/** The results at a glance. Each number opens the matching list. Only the counts passed in are shown. */
export default function ResultCounts({
  counts,
  active,
  onPick,
}: {
  counts: Partial<Record<CountKey, number>>;
  active?: CountKey | null;
  onPick: (key: CountKey) => void;
}) {
  const keys = (Object.keys(ITEMS) as CountKey[]).filter((k) => counts[k] !== undefined);
  return (
    <div className="result-strip">
      <div className="result-bar" aria-hidden="true">
        {keys.map((k) => (counts[k] ? <i key={k} className={k} style={{ flexGrow: counts[k] }} /> : null))}
      </div>
      <div className="result-items">
        {keys.map((k) => {
          const n = counts[k] ?? 0;
          return (
            <button
              key={k}
              type="button"
              className={`result-item ${k}`}
              aria-pressed={active === k}
              aria-label={`Show ${n} ${ITEMS[k].noun(n)}`}
              disabled={n === 0}
              onClick={() => onPick(k)}
            >
              <strong>{n}</strong>
              <span>
                {ITEMS[k].label(n)}
                {n > 0 && <ChevronRight size={14} aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
