import { db } from '@/src/prisma/db';
import { ResidentIntelligenceContext, ActivitySummary } from './types';
import { fetchMyOrders } from '@/app/actions/orders';
import { fetchMyServiceJobs } from '@/app/actions/service';
import { listPreferences } from './memory';
import { listReminders } from './reminders';

export async function buildResidentContext(personId: string): Promise<ResidentIntelligenceContext> {
  const [orders, services, preferencesRes, remindersRes, notifs] = await Promise.all([
    fetchMyOrders(), // Warning: fetchMyOrders relies on getServerSession() which might fail in pure Voice layer if not mocked properly, but we will mock/pass it. Actually, wait! The server actions usually read from headers or Next.js `cookies()`. If we are in a tool `execute`, does `fetchMyOrders` work?
    // Wait, the existing `getOrderStatus` tool uses `fetchMyOrders()`. So it must work.
    fetchMyServiceJobs(),
    listPreferences(personId),
    listReminders(personId),
    db.orm.public.Notification.where({ personId, isRead: false }).all()
  ]);

  const activeOrders = [...(orders.retail || []), ...(orders.restaurant || [])].filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const activeDeliveries = activeOrders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'SHIPPED');
  
  const activeServices = (services || []).filter((j: any) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED');

  const recentChanges = notifs.map(n => ({ id: n.id, title: n.title, body: n.body, date: n.createdAt }));

  return {
    personId,
    recentActivity: [],
    activeOrders: activeOrders.map((o: any) => ({ id: o.id, reference: o.ref, status: o.status, total: o.totalAmount || o.total })),
    activeDeliveries: activeDeliveries.map((o: any) => ({ id: o.id, reference: o.ref, status: o.status })),
    activeServiceRequests: activeServices.map((j: any) => ({ id: j.id, service: j.service?.title, status: j.status })),
    preferences: preferencesRes.data || [],
    reminders: remindersRes.data || [],
    upcomingEvents: [],
    recentChanges
  };
}
