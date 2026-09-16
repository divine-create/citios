import BusinessProfile from '@/components/cityos/BusinessProfile';

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <BusinessProfile slug={slug} />;
}