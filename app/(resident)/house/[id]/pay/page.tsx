import RentPayment from '@/components/cityos/RentPayment';

export default async function RentPayPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <RentPayment id={id} />;
}