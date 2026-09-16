import PropertyDetail from '@/components/cityos/PropertyDetail';

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PropertyDetail id={id} />;
}