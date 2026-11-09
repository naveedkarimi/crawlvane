"use client";

import UrlForm from "@/components/UrlForm";
import CheckList from "@/components/CheckList";
import { Ring } from "@/components/ui";
import { usePageTool } from "@/components/usePageTool";
import type { AnswerReport } from "@/lib/gen/pageTools";

const VERDICT = {
  good: { label: "Good length", cls: "ok" },
  long: { label: "Too long to quote", cls: "different" },
  short: { label: "Too short", cls: "different" },
  missing: { label: "No answer found", cls: "blocked" },
} as const;

export default function AnswersTool() {
  const { data: r, loading, error, run } = usePageTool<AnswerReport & { url: string }>("answers");
  return (
    <div className="tool">
      <UrlForm id="answers-url" button="Check answers" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {r && (
        <div className="tool-result">
          <div className="card tool-score">
            <Ring value={r.score} size={110} label="answers" />
            <div>
              <h3>Answer readiness</h3>
              <CheckList checks={r.checks} />
            </div>
          </div>

          <div className="card tool-next">
            <h3>Questions on this page ({r.questions.length})</h3>
            {r.questions.length ? (
              <ol className="qa-list">
                {r.questions.map((q, i) => (
                  <li key={i}>
                    <div className="qa-head">
                      <strong>{q.heading}</strong>
                      <span className={`livestat livestat-${VERDICT[q.verdict].cls}`}>{VERDICT[q.verdict].label}{q.words ? ` · ${q.words} words` : ""}</span>
                    </div>
                    {q.answer && <p className="qa-answer">{q.answer}{q.answer.length >= 400 ? "…" : ""}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted small">No headings on this page are phrased as questions.</p>
            )}
            {r.otherHeadings.length > 0 && (
              <>
                <h4 className="qa-sub">Headings you could turn into questions</h4>
                <ul className="qa-other">{r.otherHeadings.map((h) => <li key={h}>{h}</li>)}</ul>
                <p className="muted tiny">For example, &ldquo;Pricing&rdquo; becomes &ldquo;How much does it cost?&rdquo;. Then answer it in 40 to 60 words right under the heading.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
