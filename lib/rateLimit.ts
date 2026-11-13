import { createHmac } from "node:crypto";
import { db } from "./store";

/**
 * Rate limits shared by every server process, kept in Supabase (hit_rate_limit in schema.sql), so a
 * restart or a second server doesn't reset them. Windows are fixed, not sliding.
 *
 * Keys often contain an IP address, so the database only ever sees an HMAC of the key (with the
 * server's secret key), and rows are deleted within two days (lib/retention.ts).
 *
 * If Supabase isn't set up, the SQL hasn't been run yet, or the call fails, it falls back to the
 * in-memory limiter below, which works per process only. `local: true` skips the database for very
 * busy endpoints where a per-process limit is enough.
 */
const hits = new Map<string, number[]>();

/** Per-process sliding window. Also the fallback. */
export function localRateLimit(key: string, limit: number, windowMs = 3600_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}

const secret = () => process.env.SUPABASE_SECRET_KEY?.trim() || process.env.TOKEN_ENCRYPTION_KEY?.trim() || "";
let sharedBroken = 0;

/** The key as the database stores it: a keyed hash, so IP addresses never reach the database. */
export const hashedKey = (key: string, salt = secret()): string => createHmac("sha256", salt).update(key).digest("base64url").slice(0, 32);

export async function rateLimit(key: string, limit: number, windowMs = 3600_000, opts: { local?: boolean } = {}): Promise<boolean> {
  // After a failure, use the local limiter for a minute instead of trying the database on every request.
  if (opts.local || !secret() || !process.env.SUPABASE_URL?.trim() || Date.now() - sharedBroken < 60_000) return localRateLimit(key, limit, windowMs);
  try {
    const { data, error } = await db().rpc("hit_rate_limit", { p_key: hashedKey(key), p_limit: limit, p_window_seconds: Math.max(1, Math.round(windowMs / 1000)) });
    if (error || typeof data !== "boolean") throw new Error(error?.message ?? "unexpected answer");
    return data;
  } catch (e) {
    if (!sharedBroken) console.error("Shared rate limit unavailable, using the per-process limit:", e instanceof Error ? e.message : e);
    sharedBroken = Date.now();
    return localRateLimit(key, limit, windowMs);
  }
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
