/**
 * Issue lists as CSV for other tools. Runs in the browser and on the server (no imports).
 * - Jira: Issues → Import issues from CSV; map Summary, Description, Priority, Labels and Assignee.
 * - Linear: Settings → Import → CSV; it reads Title, Description, Priority, Status, Labels and Assignee.
 * - CSV: one row per issue, for Trello (CSV import power-ups), sheets or anything else.
 */
export type ExportFormat = "jira" | "linear" | "csv";
export interface ExportIssue {
  site: string;
  url: string;
  title: string;
  status: "fail" | "warn";
  category: string;
  weight: number;
  detail: string;
  assignee?: string;
}

/** High for failed checks that matter most, Medium for other failures, Low for warnings. */
export const priorityOf = (i: Pick<ExportIssue, "status" | "weight">): "High" | "Medium" | "Low" => (i.status === "fail" ? (i.weight >= 3 ? "High" : "Medium") : "Low");

/** One CSV cell: quoted when needed, and never starting with a formula character (CSV injection). */
export function cell(v: unknown): string {
  let s = String(v ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

const label = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function issuesCsv(issues: ExportIssue[], format: ExportFormat): string {
  const description = (i: ExportIssue) => `${i.detail} (${i.url})`;
  const table: unknown[][] =
    format === "jira"
      ? [["Summary", "Description", "Priority", "Labels", "Assignee"], ...issues.map((i) => [`${i.site}: ${i.title}`, description(i), priorityOf(i), `seo-audit ${label(i.category)}`, i.assignee ?? ""])]
      : format === "linear"
        ? [["Title", "Description", "Priority", "Status", "Labels", "Assignee"], ...issues.map((i) => [`${i.site}: ${i.title}`, description(i), priorityOf(i), "Todo", label(i.category), i.assignee ?? ""])]
        : [["Site", "Issue", "Result", "Priority", "Category", "Detail", "URL", "Assignee"], ...issues.map((i) => [i.site, i.title, i.status === "fail" ? "Failed" : "Warning", priorityOf(i), i.category, i.detail, i.url, i.assignee ?? ""])];
  return table.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
