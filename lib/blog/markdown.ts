/**
 * Tiny Markdown renderer for our own blog posts (trusted content written in this repo).
 * Supports: ## / ### headings (with anchor ids), paragraphs, - and 1. lists, > callouts,
 * | tables |, ``` code blocks ```, **bold**, *italic*, `code` and [links](url).
 * A line containing only [[cta]] splits the post so the page can insert a call to action.
 */

export const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text: string, href: string) => {
    // Only web, mailto, relative and in-page links: no javascript: or data: URLs (AI writer drafts render with this too).
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^(https?|mailto):/i.test(href)) return text;
    const safe = href.replace(/"/g, "%22");
    const external = /^https?:\/\//.test(safe);
    return `<a href="${safe}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
  });
  return out;
}

export interface Heading { id: string; text: string }

export function renderMarkdown(md: string): { html: string; headings: Heading[] } {
  const lines = md.replace(/\r/g, "").split("\n");
  const html: string[] = [];
  const headings: Heading[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      html.push(`<pre class="post-code" tabindex="0"><code>${esc(code.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      const text = h[2].trim();
      const id = slugify(text);
      if (h[1] === "##") headings.push({ id, text: text.replace(/\*\*/g, "") });
      html.push(`<h${h[1].length} id="${id}">${inline(text)}</h${h[1].length}>`);
      i++;
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      html.push(`<aside class="post-callout">${quote.map((q) => `<p>${inline(q)}</p>`).join("")}</aside>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      html.push(
        `<div class="table-wrap" tabindex="0"><table class="post-table"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }
    if (/^- /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : /^- /.test(lines[i]))) {
        items.push(lines[i].replace(ordered ? /^\d+\.\s+/ : /^-\s+/, ""));
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>|\||- |\d+\. |```)/.test(lines[i])) para.push(lines[i++]);
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return { html: html.join("\n"), headings };
}
