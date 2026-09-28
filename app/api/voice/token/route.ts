import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('ASSEMBLYAI_API_KEY is not set');
      return NextResponse.json({ error: 'Voice configuration error' }, { status: 500 });
    }

    const res = await fetch('https://api.assemblyai.com/v1/token', {
      method: 'POST',
      headers: {
        'Authorization': process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expires_in_seconds: 3600 })
    });

    if (!res.ok) {
      throw new Error(`Failed to generate token: ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json({ token: data.token });
  } catch (err) {
    console.error('Error generating Voice Agent token:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
