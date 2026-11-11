import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWidget } from "@/lib/widgets";
import { BRAND } from "@/lib/brand";
import WidgetApp from "./WidgetApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Website audit", robots: { index: false, follow: false } };

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = /^[\w-]{6,64}$/.test(id) ? await getWidget(id) : null;
  if (!w) notFound();
  return (
    <WidgetApp
      id={w.id}
      agency={w.agency}
      color={w.color}
      logoUrl={w.logoUrl}
      ctaText={w.ctaText}
      ctaUrl={w.ctaUrl}
      poweredBy={w.whiteLabel ? null : { name: BRAND.name, url: BRAND.url }}
    />
  );
}
