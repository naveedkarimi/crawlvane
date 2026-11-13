import { BRAND } from "./brand";

/**
 * A Cloudflare Worker that serves a site's generated llms.txt and robots.txt and adds basic
 * security headers, for sites whose CMS can't add those files. Pure: runs in the browser too.
 */
export function workerScript(files: { llmsTxt?: string | null; robotsTxt?: string | null }): string {
  const lit = (s: string | null | undefined) => (s ? JSON.stringify(s) : "null");
  return `// ${BRAND.name} fixes as a Cloudflare Worker. Generated ${new Date().toISOString().slice(0, 10)}.
// Deploy: Cloudflare dashboard → Workers & Pages → Create → paste this → add a route for yourdomain.com/*.
// It serves /llms.txt and /robots.txt from below, and passes every other request through unchanged.
const LLMS_TXT = ${lit(files.llmsTxt)};
const ROBOTS_TXT = ${lit(files.robotsTxt)};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const text = (body) => new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600", ...SECURITY_HEADERS } });
    if (url.pathname === "/llms.txt" && LLMS_TXT) return text(LLMS_TXT);
    if (url.pathname === "/robots.txt" && ROBOTS_TXT) return text(ROBOTS_TXT);
    const res = await fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
    return out;
  },
};
`;
}
