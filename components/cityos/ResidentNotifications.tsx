'use client';

import { useEffect, useState } from 'react';
import { fetchResidentNotifications, markNotificationsRead, markAllNotificationsRead } from '@/lib/actions/resident-notifications';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusherClient';
import { useSession } from 'next-auth/react';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: Date;
};

export default function ResidentNotifications() {
  const router = useRouter();
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadNotifications = async (cursor?: string) => {
    try {
      const res = await fetchResidentNotifications({ limit: 20, cursor });
      if (cursor) {
        setNotifications((prev) => [...prev, ...res.items]);
      } else {
        setNotifications(res.items);
      }
      setNextCursor(res.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.personId) {
      loadNotifications();

      const pusherClient = getPusherClient();
      if (!pusherClient) return;

      const channelName = `private-user-${session.user.personId}`;
      const channel = pusherClient.subscribe(channelName);
      
      channel.bind('new-notification', () => {
        // Just reload the first page to get the freshest state
        loadNotifications();
      });

      return () => {
        pusherClient.unsubscribe(channelName);
      };
    }
  }, [session?.user?.personId]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markNotificationsRead([notif.id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.href) {
      router.push(notif.href);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Notifications
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-sm font-medium px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                notif.isRead
                  ? 'bg-white border-gray-200 hover:bg-gray-50'
                  : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className={`font-medium ${notif.isRead ? 'text-gray-900' : 'text-blue-900'}`}>
                    {notif.title}
                  </h3>
                  {notif.body && (
                    <p className={`mt-1 text-sm ${notif.isRead ? 'text-gray-600' : 'text-blue-800'}`}>
                      {notif.body}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 shrink-0"></div>
                )}
              </div>
            </div>
          ))}

          {nextCursor && (
            <button
              onClick={() => loadNotifications(nextCursor)}
              className="w-full py-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Load older
            </button>
          )}
        </div>
      )}
    </div>
  );
}
