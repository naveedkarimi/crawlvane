import type { FetchedResource } from "./types";
import { assertPublicUrl } from "./safeFetch";

/**
 * ADVANCED (jsRender): render a page in a real headless browser before auditing.
 * cPanel shared hosting can't run Chrome, so this calls a remote service with a
 * Browserless-compatible /content endpoint, e.g.
 *   BROWSERLESS_URL=https://production-sfo.browserless.io?token=YOUR_TOKEN
 * (or your own browserless Docker container on a VPS).
 */
export async function renderWithBrowser(raw: FetchedResource): Promise<FetchedResource> {
  const base = process.env.BROWSERLESS_URL;
  if (!base) return raw;
  const url = await assertPublicUrl(raw.url);
  const endpoint = new URL(base);
  endpoint.pathname = endpoint.pathname.replace(/\/$/, "") + "/content";
  const started = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.toString(), gotoOptions: { waitUntil: "networkidle2", timeout: 25000 } }),
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) return raw;
    const body = await res.text();
    if (body.length < 200) return raw;
    return { ...raw, body, rawBody: raw.body, bytes: raw.bytes, ms: raw.ms + (Date.now() - started), rendered: true };
  } catch {
    return raw;
  }
}
