import { recordSiteCheck } from "@/lib/siteChecks";
import { fetchPage } from "@/lib/audit";
import { agentReadiness, answerReadiness, linkPreview, pageToMarkdown } from "@/lib/gen/pageTools";
import { a11yReport } from "@/lib/gen/a11y";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { safeFetch, UnsafeUrlError } from "@/lib/safeFetch";
import type { FetchedResource } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TOOLS = ["preview", "answers", "markdown", "agent", "a11y"] as const;
type ToolName = (typeof TOOLS)[number];

// One fetched page serves every tool for 10 minutes.
const CACHE_MS = 10 * 60 * 1000;
const pages = new Map<string, { at: number; page: FetchedResource }>();

async function imageInfo(url: string) {
  if (!url) return null;
  const r = await safeFetch(url, { timeoutMs: 8000, accept: "image/*" });
  const type = r.headers["content-type"] ?? "";
  return { status: r.status, ok: r.ok && /^image\//i.test(type), type, bytes: r.bytes, error: r.error };
}

/** GET /api/page-tools?tool=preview|answers|markdown|agent&url=... */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tool = params.get("tool") as ToolName;
  const raw = params.get("url") ?? "";
  if (!TOOLS.includes(tool)) return Response.json({ error: "Unknown tool." }, { status: 400 });
  if (!raw || raw.length > 2048) return Response.json({ error: "Please enter a URL." }, { status: 400 });
  const target = raw.includes("://") ? raw : `https://${raw}`;

  let page = pages.get(target);
  if (!page || Date.now() - page.at > CACHE_MS) {
    if (!await rateLimit("pagetools:" + clientIp(req), Number(process.env.TOOL_PER_HOUR ?? 40)))
      return Response.json({ error: "Too many checks from your network. Try again in a bit." }, { status: 429 });
    try {
      page = { at: Date.now(), page: await fetchPage(target) };
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "Couldn't load the page." }, { status: e instanceof UnsafeUrlError ? 400 : 502 });
    }
    pages.set(target, page);
    recordSiteCheck({ url: target, tool });
    if (pages.size > 300) pages.delete(pages.keys().next().value as string);
  }
  const { body, url } = page.page;

  switch (tool) {
    case "preview": {
      const p = linkPreview(body, url);
      const image = await imageInfo(p.image);
      if (image && !image.ok)
        p.checks.push({ status: "fail", title: "Share image loads", detail: `The image didn't load (${image.error ?? `HTTP ${image.status}${image.type ? `, ${image.type}` : ""}`}). Platforms will show no picture.`, fix: "Check the og:image URL opens in a private browser window." });
      else if (image && image.bytes > 5 * 1024 * 1024)
        p.checks.push({ status: "warn", title: "Share image size", detail: `${(image.bytes / 1024 / 1024).toFixed(1)} MB. X rejects images over 5 MB, and large images load slowly in previews.`, fix: "Compress it to under 1 MB." });
      else if (image) p.checks.push({ status: "pass", title: "Share image loads", detail: `${image.type}, ${Math.round(image.bytes / 1024)} KB.` });
      return Response.json(p);
    }
    case "answers":
      return Response.json({ url, ...answerReadiness(body) });
    case "markdown":
      return Response.json({ url, ...pageToMarkdown(body, url) });
    case "agent":
      return Response.json({ url, ...agentReadiness(body) });
    case "a11y":
      return Response.json({ url, ...a11yReport(body) });
  }
}
