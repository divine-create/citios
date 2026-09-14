import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMicrositeBySlug } from "@/lib/actions/microsite";
import MicrositeRenderer from "@/components/microsite/MicrositeRenderer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string, path?: string[] }> }): Promise<Metadata> {
  const { slug, path } = await params;
  const site = await getMicrositeBySlug(slug, path);
  if (!site || !site.page) return { title: "Site not found" };
  return {
    title: site.page.seoTitle || site.page.title || site.title,
    description: site.page.seoDescription || site.seoDescription || site.tagline || undefined,
  };
}

export default async function MicrositePage({ params }: { params: Promise<{ slug: string, path?: string[] }> }) {
  const { slug, path } = await params;
  const site = await getMicrositeBySlug(slug, path);
  if (!site || !site.page) notFound();

  return <MicrositeRenderer data={site} />;
}
