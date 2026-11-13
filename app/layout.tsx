import type { Metadata, Viewport } from "next";
import { DM_Sans, Figtree, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Figtree({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name}: free SEO, AEO and AI search audit`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  openGraph: {
    type: "website",
    url: BRAND.url,
    siteName: BRAND.name,
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: "Check if your site is ready for search engines, ChatGPT, Claude, Perplexity and AI Overviews, and get the fixes.",
  },
  twitter: { card: "summary_large_image" },
  authors: [{ name: BRAND.name, url: BRAND.url }],
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: BRAND.themeColor };

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BRAND.url}/#org`,
      name: BRAND.name,
      url: BRAND.url,
      logo: `${BRAND.url}/icon-512.png`,
      description: BRAND.description,
    },
    {
      "@type": "WebSite",
      "@id": `${BRAND.url}/#website`,
      name: BRAND.name,
      url: BRAND.url,
      publisher: { "@id": `${BRAND.url}/#org` },
    },
    {
      "@type": "WebApplication",
      "@id": `${BRAND.url}/#app`,
      name: BRAND.name,
      url: BRAND.url,
      description: BRAND.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": `${BRAND.url}/#org` },
      publisher: { "@id": `${BRAND.url}/#org` },
    },
  ],
};


const PLAUSIBLE = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* Privacy-friendly analytics, only when a Plausible domain is configured (no cookies). */}
        {PLAUSIBLE && (
          <>
            <script defer data-domain={PLAUSIBLE} src={process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.tagged-events.js"} />
            <script dangerouslySetInnerHTML={{ __html: "window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}" }} />
          </>
        )}
      </head>
      {/* Public pages get the header and footer from app/(site)/layout.tsx; the dashboard uses app/(app)/layout.tsx. */}
      <body>{children}</body>
    </html>
  );
}
