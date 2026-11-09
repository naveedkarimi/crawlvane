"use client";

import { useState } from "react";
import type { Status } from "@/lib/types";

export function grade(n: number) {
  return n >= 85 ? "good" : n >= 60 ? "ok" : "bad";
}

export function Ring({ value, size = 120, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring ${grade(value)} ${size >= 130 ? "ring-lg" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="bar"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-text">
        <strong>{value}</strong>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}

export const STATUS_ICON: Record<Status, string> = { pass: "✓", warn: "!", fail: "✕", info: "i" };

export function Pill({ status }: { status: Status }) {
  return (
    <span className={`pill ${status}`} aria-label={status}>
      {STATUS_ICON[status]}
    </span>
  );
}

export function SoonBadge({ plan }: { plan?: string }) {
  return (
    <span className="soon">
      Coming soon{plan && plan !== "free" ? ` · ${plan === "agency" ? "Agency" : "Pro"}` : ""}
    </span>
  );
}

export function CopyBlock({ content, filename }: { content: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copyblock">
      <div className="copybar">
        <span className="muted small">{filename ?? "snippet"}</span>
        <div className="row">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(content).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {filename && (
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
                a.download = filename;
                a.click();
              }}
            >
              Download
            </button>
          )}
        </div>
      </div>
      <pre>{content}</pre>
    </div>
  );
}
