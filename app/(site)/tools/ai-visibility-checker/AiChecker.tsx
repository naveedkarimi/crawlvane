"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import AiView from "@/components/AiView";
import UrlForm from "@/components/UrlForm";
import { Pill } from "@/components/ui";
import { api } from "@/lib/client";
import type { AuditResult } from "@/lib/types";

export default function AiChecker() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (url: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await api<AuditResult>("/api/audit", { method: "POST", body: JSON.stringify({ url }) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setLoading(false);
    }
  };

  const geo = result?.checks.filter((c) => c.category === "geo" && (c.status === "fail" || c.status === "warn")).slice(0, 6) ?? [];

  return (
    <div className="tool">
      <UrlForm id="ai-url" button="Check page" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {result && (
        <div className="tool-result">
          <AiView facts={result.facts} canScreenshot />
          <div className="card tool-next">
            <div className="tool-next-head">
              <div>
                <h3>AI search readiness: {result.scores.geo}/100</h3>
                <p className="muted small">
                  {geo.length ? "The AI search checks this page doesn't pass yet:" : "This page passes the main AI search checks."}
                </p>
              </div>
              <a className="btn btn-primary btn-sm" href={`/check?url=${encodeURIComponent(result.facts.finalUrl)}`}>
                See all checks and fixes <ArrowRight size={15} />
              </a>
            </div>
            {geo.length > 0 && (
              <ul className="plain">
                {geo.map((c) => (
                  <li key={c.id} className={`check ${c.status}`}>
                    <Pill status={c.status} />
                    <div>
                      <div className="check-title">{c.title}</div>
                      <div className="check-detail">{c.detail}</div>
                      {c.fix && <div className="check-fix">→ {c.fix}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
