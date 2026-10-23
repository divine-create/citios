import { NextResponse } from 'next/server';
import { sweepExpiredDispatchOffers } from '@/lib/actions/logistics-dispatch';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Secure endpoint: enforce bearer token if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sweepExpiredDispatchOffers();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Logistics dispatch sweep cron failed:', error);
    return NextResponse.json({ error: error.message || 'Cron error' }, { status: 500 });
  }
}
