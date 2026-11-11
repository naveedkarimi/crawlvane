/** Small multi-line chart for scores from 0 to 100. No chart library needed. */
export interface Series { key: string; label: string; values: (number | null)[]; className: string }

export default function LineChart({ series, labels, height = 220, title }: { series: Series[]; labels: string[]; height?: number; title: string }) {
  const W = 640;
  const H = height;
  const pad = { l: 34, r: 12, t: 10, b: 26 };
  const n = Math.max(2, labels.length);
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (n - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / 100);
  const path = (vals: (number | null)[]) =>
    vals.map((v, i) => (v === null ? null : `${x(i).toFixed(1)} ${y(v).toFixed(1)}`)).reduce<string>((d, p, i, arr) => (p === null ? d : d + (d && arr[i - 1] !== null ? ` L${p}` : `${d ? " " : ""}M${p}`)), "");
  const every = Math.ceil(labels.length / 8);
  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} preserveAspectRatio="none">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="lc-grid" />
          <text x={pad.l - 8} y={y(g) + 4} className="lc-axis" textAnchor="end">{g}</text>
        </g>
      ))}
      {labels.map((l, i) => (i % every === 0 || i === labels.length - 1 ? <text key={i} x={x(i)} y={H - 6} className="lc-axis" textAnchor="middle">{l}</text> : null))}
      {series[0] && series[0].values.every((v) => v !== null) && (
        <path d={`${path(series[0].values)} L${x(series[0].values.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`} className="lc-area" />
      )}
      {series.map((s) => <path key={s.key} d={path(s.values)} className={`lc-line ${s.className}`} />)}
      {series[0] && (() => {
        const i = series[0].values.length - 1;
        const v = series[0].values[i];
        return v === null || v === undefined ? null : <circle cx={x(i)} cy={y(v)} r={4} className="lc-dot" />;
      })()}
    </svg>
  );
}
