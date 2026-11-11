import type { Metadata } from "next";
import ReportView from "@/components/ReportView";

export const metadata: Metadata = {
  title: "Site report",
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="container page">
      <ReportView id={id} />
    </main>
  );
}
