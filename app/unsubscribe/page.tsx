import type { Metadata } from "next";
import UnsubscribeButton from "./UnsubscribeButton";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default function UnsubscribePage() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <h1>Unsubscribe from the newsletter</h1>
          <UnsubscribeButton />
        </div>
      </section>
    </main>
  );
}
