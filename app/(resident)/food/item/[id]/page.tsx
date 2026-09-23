import FoodItemDetail from '@/components/cityos/FoodItemDetail';

export default async function FoodItemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <FoodItemDetail id={id} />;
}
