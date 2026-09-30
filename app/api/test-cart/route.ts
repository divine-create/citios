import { getVoiceCart } from '@/lib/voice/cart';

export async function GET() {
  try {
    const data = await getVoiceCart('test-person-id');
    return new Response(JSON.stringify(data), { status: 200 });
  } catch(e: any) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500 });
  }
}
