import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildVoiceSessionBootstrap } from '@/lib/voice/core/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.personId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('ASSEMBLYAI_API_KEY is not set');
      return NextResponse.json({ error: 'Voice configuration error' }, { status: 500 });
    }

    const { systemPrompt } = await buildVoiceSessionBootstrap(session.user.personId as string);

    const res = await fetch('https://agents.assemblyai.com/v1/token?expires_in_seconds=600', {
      method: 'GET',
      headers: {
        'Authorization': process.env.ASSEMBLYAI_API_KEY
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to generate token: ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json({ token: data.token, systemPrompt });
  } catch (err) {
    console.error('Error generating Voice Agent token:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
