import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { authorizePusherChannel } from '@/lib/actions/logistics-channel-auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = await req.formData();
    const socketId = data.get('socket_id') as string;
    const channelName = data.get('channel_name') as string;

    const authResult = await authorizePusherChannel({
      personId: session.user.personId,
      isSystemAdmin: (session.user as any)?.isSystemAdmin,
      channelName,
      socketId,
    });

    if (!authResult.authorized) {
      return new NextResponse(authResult.reason || 'Unauthorized', { status: authResult.status });
    }

    return NextResponse.json(authResult.authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
