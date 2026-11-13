/**
 * Where to send someone after signing in: a path on this site, never another site. Rejects
 * "//host" and "/\host" (browsers treat a backslash as a slash) and control characters, then
 * checks the result really stays on the same origin. Safe in the browser and on the server.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || next.length > 2000 || !next.startsWith("/") || /^\/[\\/]/.test(next) || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "https://same-origin.invalid";
    const u = new URL(next, base);
    if (u.origin !== base) return fallback;
    // Check the result too: dot segments ("/.//host", "/%2e//host") collapse into "//host" when normalised.
    const out = u.pathname + u.search + u.hash;
    return /^\/[\\/]/.test(out) ? fallback : out;
  } catch {
    return fallback;
  }
}
