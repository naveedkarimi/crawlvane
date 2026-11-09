"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { track } from "@/lib/track";

type PageTool = "preview" | "answers" | "markdown" | "agent" | "a11y";
type SiteTool = "redirects" | "sitemap" | "headers";

/** Run one of the /api/page-tools or /api/site-tools checks and keep its result. */
export function usePageTool<T>(tool: PageTool | SiteTool) {
  const endpoint = ["redirects", "sitemap", "headers"].includes(tool) ? "/api/site-tools" : "/api/page-tools";
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const run = async (url: string) => {
    setLoading(true);
    setError("");
    setData(null);
    track("Tool used", { tool });
    try {
      setData(await api<T>(`${endpoint}?tool=${tool}&url=${encodeURIComponent(url)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setLoading(false);
    }
  };
  return { data, loading, error, run };
}
