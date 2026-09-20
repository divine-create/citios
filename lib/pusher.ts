import Pusher from 'pusher';

const isPusherConfigured = Boolean(
  process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER
);

// Backend Pusher instance with safe fallback to avoid startup crash when env keys are not provided
export const pusherServer: Pusher = isPusherConfigured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    })
  : ({
      trigger: async (channel: string, event: string, data: any) => {
        // Safe no-op when Pusher credentials are not provided
        return Promise.resolve({ status: 200 });
      },
      authenticateUser: () => ({ auth: '' }),
      authorizeChannel: () => ({ auth: '' }),
    } as unknown as Pusher);
