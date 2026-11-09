/** llms.txt: build one from a list of pages, and check an existing file against the llmstxt.org format. */

export interface LlmsPage {
  url: string;
  title: string;
  description?: string;
}

export const UTILITY_PATH = /\/(login|log-in|signin|sign-in|signup|sign-up|register|account|cart|checkout|my-account|wp-admin|wp-login\.php|search|logout|password|reset|feed|tag|author|page)(\/|$|\?)/i;

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim();

export function buildLlmsTxt({ name, summary, homeUrl, pages }: { name: string; summary: string; homeUrl: string; pages: LlmsPage[] }): string {
  const homeDesc = (pages.find((p) => p.url === homeUrl)?.description ?? summary).trim().toLowerCase();
  const groups = new Map<string, LlmsPage[]>();
  for (const p of pages) {
    const seg = new URL(p.url).pathname.split("/").filter(Boolean)[0] ?? "";
    const key = seg ? seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Main pages";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  // Single-page sections clutter the file: fold them into "Main pages".
  const main = groups.get("Main pages") ?? [];
  for (const [k, v] of [...groups]) if (k !== "Main pages" && v.length === 1 && groups.size > 4) { main.push(...v); groups.delete(k); }
  if (main.length) groups.set("Main pages", main);

  const out = [`# ${clean(name)}`, "", `> ${clean(summary) || `Official website of ${clean(name)}.`}`, ""];
  const sorted = [...groups.entries()].sort((a, b) => (a[0] === "Main pages" ? -1 : b[0] === "Main pages" ? 1 : b[1].length - a[1].length));
  for (const [g, ps] of sorted.slice(0, 10)) {
    out.push(`## ${g}`, "");
    for (const p of ps.slice(0, 15)) {
      const d = p.description && (p.url === homeUrl || p.description.trim().toLowerCase() !== homeDesc) ? `: ${clean(p.description).slice(0, 160)}` : "";
      out.push(`- [${clean(p.title).slice(0, 90)}](${p.url})${d}`);
    }
    out.push("");
  }
  return out.join("\n").trim() + "\n";
}

export interface LlmsCheck {
  status: "pass" | "warn" | "fail";
  title: string;
  detail: string;
}

/** Check a file against the llmstxt.org proposal: H1 name, > summary, ## sections of [name](url) links. */
export function validateLlmsTxt(body: string, origin?: string): LlmsCheck[] {
  const checks: LlmsCheck[] = [];
  const text = body.replace(/\r/g, "").trim();
  if (/^<(!doctype|html)/i.test(text)) {
    return [{ status: "fail", title: "Not a text file", detail: "The URL returns a web page, not Markdown. Many sites send their 404 page with a 200 status here." }];
  }
  const lines = text.split("\n");
  const first = lines.find((l) => l.trim()) ?? "";
  checks.push(
    /^# \S/.test(first)
      ? { status: "pass", title: "Starts with the site name", detail: `"${first.slice(2, 80)}"` }
      : { status: "fail", title: "Missing the H1 name", detail: "The file should start with one line like \"# Your Business\"." },
  );
  const h1s = lines.filter((l) => /^# \S/.test(l)).length;
  if (h1s > 1) checks.push({ status: "warn", title: "More than one H1", detail: `Found ${h1s} lines starting with "# ". Use one, then "##" for sections.` });

  const summary = lines.find((l) => l.startsWith(">"));
  checks.push(
    summary
      ? { status: "pass", title: "Has a summary line", detail: summary.replace(/^>\s?/, "").slice(0, 160) }
      : { status: "warn", title: "No summary line", detail: "Add a line starting with \"> \" under the name: one sentence on what you do and for whom." },
  );

  const sections = lines.filter((l) => /^## \S/.test(l));
  checks.push(
    sections.length
      ? { status: "pass", title: `${sections.length} section${sections.length === 1 ? "" : "s"}`, detail: sections.map((s) => s.slice(3)).slice(0, 6).join(", ") }
      : { status: "warn", title: "No sections", detail: "Group links under \"## \" headings such as ## Services or ## Docs." },
  );

  const links = [...text.matchAll(/^\s*-\s*\[([^\]]+)\]\(([^)\s]+)\)/gm)].map((m) => m[2]);
  if (!links.length) {
    checks.push({ status: "fail", title: "No links", detail: "List key pages as \"- [Page name](https://...): short note\"." });
  } else {
    const relative = links.filter((u) => !/^https?:\/\//i.test(u));
    const offsite = origin ? links.filter((u) => /^https?:\/\//i.test(u) && !sameSite(u, origin)) : [];
    checks.push({ status: "pass", title: `${links.length} link${links.length === 1 ? "" : "s"}`, detail: links.length > 200 ? "Very long. Keep llms.txt to your key pages; put the rest in llms-full.txt or your sitemap." : "Links in the expected Markdown format." });
    if (relative.length) checks.push({ status: "warn", title: "Relative links", detail: `${relative.length} link${relative.length === 1 ? " doesn't" : "s don't"} start with https://. Use full URLs so tools outside your site can follow them.` });
    if (offsite.length > links.length / 2) checks.push({ status: "warn", title: "Mostly links to other sites", detail: "Most links point away from your domain. List your own key pages first." });
  }
  const kb = new Blob([text]).size / 1024;
  if (kb > 100) checks.push({ status: "warn", title: "Large file", detail: `${Math.round(kb)} KB. llms.txt is meant to be a short map; move full content to llms-full.txt.` });
  return checks;
}

function sameSite(a: string, origin: string) {
  try {
    return new URL(a).hostname.replace(/^www\./, "") === new URL(origin).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
}
