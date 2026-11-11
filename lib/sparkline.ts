/** SVG path for a small score trend. Scores are 0 to 100; the newest is on the right. */
export function sparklinePath(values: number[], width = 120, height = 32, pad = 3): string {
  if (!values.length) return "";
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const step = (width - pad * 2) / (pts.length - 1);
  const y = (v: number) => pad + (height - pad * 2) * (1 - Math.min(100, Math.max(0, v)) / 100);
  return pts.map((v, i) => `${i ? "L" : "M"}${(pad + i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
}
