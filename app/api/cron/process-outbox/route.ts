import { NextResponse } from 'next/server';
import { processOutboxBatch } from '@/lib/email/resend';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Secure endpoint: enforce bearer token if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await processOutboxBatch(25);
    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error('Process outbox cron failed:', error);
    return NextResponse.json({ error: error.message || 'Cron error' }, { status: 500 });
  }
}
