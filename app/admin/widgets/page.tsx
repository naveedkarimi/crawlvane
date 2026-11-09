import type { Metadata } from "next";
import WidgetAdmin from "./WidgetAdmin";

export const metadata: Metadata = { title: "Widgets (admin)", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="section">
      <div className="container">
        <WidgetAdmin />
      </div>
    </main>
  );
}
