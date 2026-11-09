"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Auditor from "@/app/Auditor";
import ReportForm from "./ReportForm";
import { useConfig } from "@/lib/client";

/** The audit tool: page check or full site report. Lives in the hero. */
export default function Home() {
  const params = useSearchParams();
  const { cfg, on } = useConfig();
  const [mode, setMode] = useState<"quick" | "full">(params.get("mode") === "full" ? "full" : "quick");

  return (
    <div className="tool" id="audit">
      {cfg?.admin && (
        <div className="admin-bar">
          Admin preview: hidden features are on for you. <a href="/?admin=off">Exit</a>
        </div>
      )}
      <div className="segmented" role="tablist" aria-label="Audit type">
        <button role="tab" type="button" aria-selected={mode === "quick"} className={mode === "quick" ? "on" : ""} onClick={() => setMode("quick")}>
          Page check
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === "full"}
          className={mode === "full" ? "on" : ""}
          onClick={() => setMode("full")}
          disabled={!!cfg && !on("siteCrawl")}
        >
          Full site report
        </button>
      </div>
      {mode === "quick" ? <Auditor redirect /> : <ReportForm initialUrl={params.get("url") ?? ""} cfg={cfg} on={on} />}
    </div>
  );
}
