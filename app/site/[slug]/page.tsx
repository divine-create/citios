import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMicrositeBySlug } from "@/lib/actions/microsite";
import MicrositeRenderer from "@/components/microsite/MicrositeRenderer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const site = await getMicrositeBySlug(slug);
  if (!site) return { title: "Site not found" };
  return {
    title: site.seoTitle || site.title,
    description: site.seoDescription || site.tagline || undefined,
  };
}

export default async function MicrositePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getMicrositeBySlug(slug);
  if (!site) notFound();

  return <MicrositeRenderer data={site} />;
}
