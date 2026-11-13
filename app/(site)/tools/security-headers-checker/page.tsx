import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import HeadersTool from "./HeadersTool";

export const metadata: Metadata = {
  title: "Security headers checker: HSTS, CSP and more",
  description: "Check your site's HTTP security headers: HSTS, Content-Security-Policy, clickjacking protection, nosniff and version leaks, with the exact header to add. Free.",
  alternates: { canonical: "/tools/security-headers-checker" },
};

const faqs = [
  { q: "Do security headers affect SEO?", a: "Not directly. HTTPS is a light ranking signal, and the other headers don't change rankings. They protect visitors from hijacked pages and injected scripts, which can get a site flagged as unsafe or hacked, and that hurts traffic badly." },
  { q: "Which headers matter most?", a: "Strict-Transport-Security (forces HTTPS), Content-Security-Policy (limits injected scripts), X-Content-Type-Options: nosniff, and frame-ancestors or X-Frame-Options (stops clickjacking). Start with those four." },
  { q: "Where do I add them?", a: "In your server or hosting settings: .htaccess on Apache and most cPanel hosts, the server block on nginx, headers in next.config or vercel.json on Vercel, or Transform Rules on Cloudflare. WordPress security plugins can add them too." },
  { q: "Can a Content-Security-Policy break my site?", a: "Yes, if it's too strict it blocks your own scripts, fonts or analytics. Roll it out as Content-Security-Policy-Report-Only first, fix what it reports, then switch it on." },
];

export default function Page() {
  return (
    <ToolPage slug="security-headers-checker" h1="Security headers checker" faqs={faqs} guide="is-your-website-ready-for-ai-agents"
      sub="See which security headers your server sends, what's missing, and the line to add for each one.">
      <HeadersTool />
    </ToolPage>
  );
}
