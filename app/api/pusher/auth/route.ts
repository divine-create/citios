import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = await req.formData();
    const socketId = data.get('socket_id') as string;
    const channelName = data.get('channel_name') as string;

    // Ensure the user can only subscribe to their own private channel
    if (channelName !== `private-user-${session.user.personId}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
