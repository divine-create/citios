import { notFound } from 'next/navigation';
import { fetchMyOrderById } from '@/app/actions/orders';
import LiveOrderTracker from '@/components/cityos/LiveOrderTracker';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Order Status - 9jaLive',
};

export default async function OrderTrackPage({ params }: Props) {
  const { id } = await params;
  try {
    const order = await fetchMyOrderById(id);
    if (!order) {
      notFound();
    }
    return <LiveOrderTracker order={order} />;
  } catch (err) {
    notFound();
  }
}
