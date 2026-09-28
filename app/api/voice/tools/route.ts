import { NextResponse } from 'next/server';
import { executeTool } from '@/lib/voice/tools';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'You must be signed in to use Voice features.' }, { status: 401 });
    }

    const { name, arguments: args } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'INVALID_ARGUMENT', message: 'Tool name is required' }, { status: 400 });
    }

    // Add a strict timeout to prevent hanging the voice session
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 8000)
    );
    
    const executionPromise = executeTool(name, args || {}, session);
    const result = await Promise.race([executionPromise, timeoutPromise]);
    
    return NextResponse.json(result);
  } catch (err: any) {
    if (err.message === 'TIMEOUT') {
      return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', message: 'The request took too long to complete.' }, { status: 503 });
    }
    console.error('Tools API Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to execute tool due to an internal error.' }, { status: 500 });
  }
}
