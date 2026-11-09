"use client";

import { useEffect, useState } from "react";

/** "12,400 sites checked so far", shown only once the number is big enough to mean something. */
export default function AuditCount({ min = 1000 }: { min?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((d) => setN(d.audits ?? 0)).catch(() => {});
  }, []);
  if (n < min) return null;
  return <p className="audit-count">{(Math.floor(n / 100) * 100).toLocaleString()}+ pages checked so far</p>;
}
