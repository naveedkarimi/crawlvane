"use client";

import type { AuditResult, Check } from "./types";

/**
 * Report history kept in the visitor's browser (no account needed):
 * the last few runs per page for before/after, and the issues they marked as fixed.
 */
export interface Run {
  at: string;
  scores: AuditResult["scores"];
  /** ids of failing or warning checks */
  issues: string[];
}

const KEY = "crawlvane:v1:";
const pageKey = (u: string) => {
  try {
    const x = new URL(u);
    return (x.host + x.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return u.toLowerCase();
  }
};
const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(KEY + k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(KEY + k, JSON.stringify(v));
  } catch {
    /* storage full or blocked */
  }
};

export const isIssue = (c: Check) => c.status === "fail" || c.status === "warn";

/** Save this run and return the previous one (if any) for comparison. */
export function recordRun(r: AuditResult): Run | null {
  const k = "runs:" + pageKey(r.facts.finalUrl);
  const runs = read<Run[]>(k, []);
  // The same run being shown again (reload) shouldn't count as a new one.
  const prev = runs.find((x) => x.at !== r.auditedAt) ?? null;
  if (!runs.some((x) => x.at === r.auditedAt))
    write(k, [{ at: r.auditedAt, scores: r.scores, issues: r.checks.filter(isIssue).map((c) => c.id) }, ...runs].slice(0, 10));
  return prev;
}

export function runsFor(url: string): Run[] {
  return read<Run[]>("runs:" + pageKey(url), []);
}

export function getFixed(url: string): string[] {
  return read<string[]>("fixed:" + pageKey(url), []);
}

export function setFixed(url: string, ids: string[]) {
  write("fixed:" + pageKey(url), ids);
}

export interface Diff {
  prev: Run;
  delta: number;
  fixed: string[];
  added: string[];
}

export function diffRuns(prev: Run, r: AuditResult): Diff {
  const now = new Set(r.checks.filter(isIssue).map((c) => c.id));
  const before = new Set(prev.issues);
  return {
    prev,
    delta: r.scores.overall - prev.scores.overall,
    fixed: [...before].filter((id) => !now.has(id) && r.checks.some((c) => c.id === id)),
    added: [...now].filter((id) => !before.has(id)),
  };
}

export function checksCsv(r: AuditResult, fixed: string[] = []): string {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = r.checks.map((c) =>
    [c.category.toUpperCase(), c.group, c.title, c.status, c.weight === 3 ? "high" : c.weight === 2 ? "medium" : "low", c.detail, c.fix ?? "", fixed.includes(c.id) ? "yes" : ""].map(cell).join(","),
  );
  return ["Category,Group,Check,Status,Impact,What we found,How to fix,Marked fixed", ...rows].join("\n");
}
