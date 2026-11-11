"use client";

import { ArrowRight } from "lucide-react";
import UrlForm from "@/components/UrlForm";
import CheckList from "@/components/CheckList";
import { Ring } from "@/components/ui";
import { usePageTool } from "@/components/usePageTool";
import type { AgentReport } from "@/lib/gen/pageTools";

export default function AgentTool() {
  const { data: r, loading, error, run } = usePageTool<AgentReport & { url: string }>("agent");
  return (
    <div className="tool">
      <UrlForm id="agent-url" button="Check page" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {r && (
        <div className="tool-result">
          <div className="card tool-score">
            <Ring value={r.score} size={110} label="agents" />
            <div>
              <h3>AI agent readiness</h3>
              <p className="muted small">
                What an AI agent needs to understand and use this page, checked in the HTML your server sends. Most of it is the same as good accessibility.
              </p>
              <CheckList checks={r.checks} />
              <p className="muted tiny">
                New standards such as WebMCP (letting a site offer actions to agents) and NLWeb (answering agents&apos; questions from your schema) are still
                early. Most sites don&apos;t need them yet; the basics above come first.{" "}
                <a href="/blog/is-your-website-ready-for-ai-agents">Read the guide <ArrowRight size={12} /></a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
