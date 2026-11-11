import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The signed-in app. It has its own sidebar, so no site header or footer. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      {children}
    </>
  );
}
