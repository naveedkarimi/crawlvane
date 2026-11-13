import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocPage from "@/components/DocPage";
import { BRAND } from "@/lib/brand";
import { CHECKED, COMPARISONS, comparison, comparisonMarkdown } from "@/lib/compare";

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = comparison((await params).slug);
  if (!c) return {};
  return {
    title: `${BRAND.name} vs ${c.name}`,
    description: `${BRAND.name} vs ${c.name}: prices, AI engines and fixes compared, from ${c.name}'s own pricing page.`,
    alternates: { canonical: `/compare/${c.slug}` },
  };
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = comparison((await params).slug);
  if (!c) notFound();
  return <DocPage kicker="Compare" title={`${BRAND.name} vs ${c.name}`} dek={`An honest side-by-side: what each one does, what it costs and when to pick it.`} updated={CHECKED} body={comparisonMarkdown(c)} />;
}
