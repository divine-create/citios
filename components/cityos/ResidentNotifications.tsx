'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchResidentNotifications, markNotificationsRead, markAllNotificationsRead } from '@/lib/actions/resident-notifications';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusherClient';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: Date;
};

const NOTIF_EMOJI: Record<string, string> = {
  ORDER_CONFIRMED: '🛍️',
  FOOD_ORDER_CONFIRMED: '🍽️',
  SERVICE_REQUESTED: '🔧',
  SERVICE_STATUS: '🛠️',
  JOB_APPLICATION: '💼',
  POST_COMMENT: '💬',
  POST_LIKE: '❤️',
  REVIEW_RESPONSE: '⭐',
  SYSTEM: '📅',
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders & Food' },
  { id: 'services', label: 'Services' },
  { id: 'social', label: 'Social & Feed' },
];

export default function ResidentNotifications() {
  const router = useRouter();
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

      // Synchronize with local custom events (e.g. read from the bell dropdown)
      const handleLocalSync = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail?.all) {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } else if (Array.isArray(customEvent.detail?.notificationIds)) {
          const ids = customEvent.detail.notificationIds;
          setNotifications((prev) =>
            prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
          );
        }
      };

      window.addEventListener('cityos:notifications-read', handleLocalSync);

      const pusherClient = getPusherClient();
      if (!pusherClient) {
        return () => {
          window.removeEventListener('cityos:notifications-read', handleLocalSync);
        };
      }

      const channelName = `private-user-${session.user.personId}`;
      const channel = pusherClient.subscribe(channelName);

      channel.bind('new-notification', () => {
        loadNotifications();
      });

      channel.bind('notifications-read', (data: any) => {
        if (data?.all) {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } else if (Array.isArray(data?.notificationIds)) {
          const ids = data.notificationIds;
          setNotifications((prev) =>
            prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
          );
        }
      });

      return () => {
        window.removeEventListener('cityos:notifications-read', handleLocalSync);
        pusherClient.unsubscribe(channelName);
      };
    }
  }, [session?.user?.personId]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cityos:notifications-read', {
            detail: { notificationIds: [notif.id] },
          })
        );
      }
      try {
        await markNotificationsRead([notif.id]);
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    if (notif.href) {
      router.push(notif.href);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cityos:notifications-read', {
          detail: { all: true },
        })
      );
    }
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    if (selectedCategory === 'orders') {
      return notifications.filter(
        (n) => n.type.includes('ORDER') || n.type.includes('FOOD')
      );
    }
    if (selectedCategory === 'services') {
      return notifications.filter((n) => n.type.includes('SERVICE') || n.type.includes('JOB'));
    }
    if (selectedCategory === 'social') {
      return notifications.filter(
        (n) => n.type.includes('POST') || n.type.includes('COMMENT') || n.type.includes('REVIEW')
      );
    }
    return notifications;
  }, [notifications, selectedCategory]);

  if (loading && notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3 mb-6"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 md:pb-12">
      {/* Header with Back button and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/70 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-colors',
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {cat.label}
            {cat.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification Stream */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-100 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl mb-3 shadow-xs">
            <Bell className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">
            {selectedCategory === 'unread' ? "You're all caught up!" : "No notifications found"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {selectedCategory === 'unread'
              ? "You have no unread notifications. All order updates and alerts are safely archived in the 'All' tab."
              : "Order updates, booking confirmations, and community interactions will appear here in real time."}
          </p>
          {selectedCategory === 'unread' && notifications.length > 0 && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              View all notifications ({notifications.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={cn(
                'p-3.5 md:p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 group',
                notif.isRead
                  ? 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-xs'
                  : 'bg-teal-50/50 border-teal-100/80 hover:bg-teal-50 hover:border-teal-200 shadow-xs'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                {NOTIF_EMOJI[notif.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className={cn('text-xs md:text-sm truncate', notif.isRead ? 'font-bold text-slate-800' : 'font-black text-slate-900')}>
                    {notif.title}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {notif.body && (
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>
                )}
              </div>
              {!notif.isRead && (
                <div className="w-2.5 h-2.5 mt-2 rounded-full bg-teal-500 shrink-0 shadow-xs"></div>
              )}
            </div>
          ))}

          {nextCursor && (
            <button
              onClick={() => loadNotifications(nextCursor)}
              className="w-full py-3 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors mt-4 border border-slate-200/60"
            >
              Load older notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
