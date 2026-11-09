import { recordSiteCheck } from "@/lib/siteChecks";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl } from "@/lib/safeFetch";
import { parsePsi, type PsiResult, type Strategy } from "@/lib/pagespeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Results are cached per URL and device for 15 minutes so repeat checks don't use Google quota.
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; result: PsiResult }>();

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const target = params.get("url") ?? "";
  const strategy: Strategy = params.get("strategy") === "desktop" ? "desktop" : "mobile";

  let url: URL;
  try {
    url = await assertPublicUrl(target);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad URL" }, { status: 400 });
  }

  const key = `${strategy}|${url.toString()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return Response.json({ ...hit.result, cached: true });

  if (!rateLimit("psi:" + clientIp(req), 20))
    return Response.json({ error: "Speed test limit reached. Try again later." }, { status: 429 });

  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url.toString());
  api.searchParams.set("strategy", strategy);
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) api.searchParams.append("category", c);
  if (process.env.PAGESPEED_API_KEY) api.searchParams.set("key", process.env.PAGESPEED_API_KEY);

  const res = await fetch(api, { signal: AbortSignal.timeout(58000) }).catch((e) => e as Error);
  if (res instanceof Error) return Response.json({ error: "Google PageSpeed timed out. Try again in a minute." }, { status: 504 });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.lighthouseResult) {
    const msg: string = data?.error?.message ?? `PageSpeed error (${res.status})`;
    // Without PAGESPEED_API_KEY, requests share Google's tiny anonymous quota and fail fast.
    const quota = /quota/i.test(msg);
    const friendly = quota
      ? process.env.PAGESPEED_API_KEY
        ? "Google PageSpeed's daily quota for this site is used up. Try again tomorrow."
        : "Google PageSpeed's daily quota is used up. The site owner needs to add a free PAGESPEED_API_KEY; try again later."
      : /lighthouse returned error|failed_document_request|errored_document_request/i.test(msg)
        ? "Google couldn't load this page for testing. Check that it's public and loads in a browser."
        : msg;
    return Response.json({ error: friendly }, { status: quota ? 429 : 502 });
  }

  const result = parsePsi(data, strategy, url.toString());
  recordSiteCheck({ url: url.toString(), tool: "speed-test", scores: result.scores });
  cache.set(key, { at: Date.now(), result });
  if (cache.size > 300) cache.delete(cache.keys().next().value as string);
  return Response.json(result);
}
