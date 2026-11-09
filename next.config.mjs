import { fileURLToPath } from "node:url";

// NEXT_PUBLIC_ values ship to every visitor's browser, so a secret key here would be public.
const browserKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
let browserKeyRole = "";
try {
  browserKeyRole = JSON.parse(Buffer.from(browserKey.split(".")[1], "base64url").toString()).role;
} catch {
  /* not a JWT: the sb_publishable_ / sb_secret_ format */
}
if (browserKey.startsWith("sb_secret_") || browserKeyRole === "service_role") {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is a secret key. Use the public (anon) key: this value is sent to browsers.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the root so Next uses this lockfile even if a parent folder has one.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  // Self-contained build for cPanel / any Node host (see docs/app/DEPLOY-CPANEL.md)
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
      // Everything except the agency widget stays out of other sites' frames.
      { source: "/((?!embed/).*)", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors http: https:" }] },
    ];
  },
};

export default nextConfig;
