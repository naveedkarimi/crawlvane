import { BRAND } from "./brand";
import dns from "node:dns";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import type { FetchedResource } from "./types";

/** Crawler name shown in server logs and in "allow our crawler" messages. */
export const BOT_NAME = `${BRAND.name.replace(/[^A-Za-z0-9]/g, "")}Bot`;
export const USER_AGENT = `Mozilla/5.0 (compatible; ${BOT_NAME}/1.0; +${BRAND.url})`;

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_REDIRECTS = 5;

export class UnsafeUrlError extends Error {}

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved
  );
}

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("::ffff:")) return isPrivateIPv4(v6.slice(7));
  if (/^f[cd]/.test(v6)) return true; // unique local
  if (/^fe[89ab]/.test(v6)) return true; // link-local
  if (v6.startsWith("ff")) return true; // multicast
  return false;
}

/** Normalise user input into a URL and make sure it is a public http(s) target. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let input = raw.trim();
  if (!/^https?:\/\//i.test(input)) input = "https://" + input;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new UnsafeUrlError("Only http and https URLs can be audited.");
  if (url.port && url.port !== "80" && url.port !== "443")
    throw new UnsafeUrlError("Only standard ports (80/443) are allowed.");
  if (url.username || url.password)
    throw new UnsafeUrlError("URLs with credentials are not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || (!host.includes(".") && !net.isIP(host)))
    throw new UnsafeUrlError("Only public websites can be audited.");

  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new UnsafeUrlError(`Couldn't resolve ${host}.`);
  if (addrs.some((a) => isPrivateIP(a.address)))
    throw new UnsafeUrlError("Only public websites can be audited.");
  return url;
}

type LookupCallback = (err: Error | null, address?: string | dns.LookupAddress[], family?: number) => void;
type Resolver = (hostname: string, options: dns.LookupAllOptions, callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void) => void;

/**
 * DNS lookup used for the connection itself. assertPublicUrl resolves a name once for a friendly
 * error, but fetch would resolve it again, and a hostile DNS server can answer with a public IP
 * the first time and a private one the second (DNS rebinding). Checking the answer that the socket
 * actually connects to closes that gap.
 */
export function publicOnlyLookup(resolve: Resolver = dns.lookup as Resolver) {
  return (hostname: string, options: dns.LookupOptions, callback: LookupCallback) => {
    resolve(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err);
      if (!addresses.length || addresses.some((a) => isPrivateIP(a.address)))
        return callback(new UnsafeUrlError("Only public websites can be audited."));
      if (options.all) return callback(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

const publicOnlyAgent = new Agent({ connect: { lookup: publicOnlyLookup() as never } });

/** fetch that can only connect to public addresses. Use for every URL a visitor can influence. */
export function guardedFetch(url: string | URL, init: RequestInit): Promise<Response> {
  return undiciFetch(url, { ...init, dispatcher: publicOnlyAgent } as never) as unknown as Promise<Response>;
}

export async function readLimited(res: Response): Promise<{ body: string; bytes: number }> {
  if (!res.body) return { body: "", bytes: 0 };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(Math.min(bytes, MAX_BYTES));
  let off = 0;
  for (const c of chunks) {
    buf.set(c.subarray(0, buf.length - off), off);
    off += c.byteLength;
    if (off >= buf.length) break;
  }
  return { body: new TextDecoder("utf-8", { fatal: false }).decode(buf), bytes };
}

/**
 * Fetch a public URL, following redirects manually so every hop is checked
 * against the private-network guard.
 */
export async function safeFetch(
  target: string,
  opts: { timeoutMs?: number; accept?: string; userAgent?: string; headersOnly?: boolean } = {},
): Promise<FetchedResource> {
  const started = Date.now();
  const redirects: string[] = [];
  let current = target;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertPublicUrl(current);
      const res = await guardedFetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 12000),
        headers: {
          "User-Agent": opts.userAgent ?? USER_AGENT,
          Accept: opts.accept ?? "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "en;q=0.9,*;q=0.5",
        },
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        redirects.push(`${res.status} ${url.toString()}`);
        current = new URL(location, url).toString();
        continue;
      }
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      if (opts.headersOnly) await res.body?.cancel().catch(() => {});
      const { body, bytes } = opts.headersOnly ? { body: "", bytes: 0 } : await readLimited(res);
      return {
        url: url.toString(),
        ok: res.ok,
        status: res.status,
        body,
        headers,
        redirects,
        ms: Date.now() - started,
        bytes,
      };
    }
    throw new Error("Too many redirects");
  } catch (e) {
    return {
      url: current,
      ok: false,
      status: 0,
      body: "",
      headers: {},
      redirects,
      ms: Date.now() - started,
      bytes: 0,
      error: blockedByGuard(e) ?? (e instanceof Error ? e.message : String(e)),
    };
  }
}

/** undici wraps connection errors as "fetch failed"; surface the guard's own message. */
function blockedByGuard(e: unknown): string | undefined {
  const cause = (e as { cause?: unknown })?.cause;
  return cause instanceof UnsafeUrlError ? cause.message : undefined;
}
