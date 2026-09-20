import { db } from '@/src/prisma/db';
import { pusherServer } from '@/lib/pusher';

/**
 * Canonical emitter for resident notifications.
 *
 * Mirrors `createShopNotification` (lib/actions/retail.ts) on the org side:
 * - Fire-and-forget: a notification failure is logged, never surfaced to the
 *   user, and NEVER blocks or rolls back the mutation that triggered it.
 * - Real events only: every call site is a real server-side mutation. Rows are
 *   never fabricated for UI purposes.
 *
 * Call from server code only (server actions / route handlers) — it touches db
 * directly. It deliberately takes an explicit `personId` so emitters that
 * already resolved the recipient server-side (customerDataId → relationship →
 * personId) can notify without a session.
 */
export async function notifyPerson(
  personId: string,
  input: {
    type: string; // ORDER_CONFIRMED | FOOD_ORDER_CONFIRMED | SERVICE_REQUESTED | SERVICE_STATUS | JOB_APPLICATION | SYSTEM
    title: string;
    body?: string;
    href?: string;
  },
) {
  try {
    await db.orm.public.Notification.create({
      personId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      isRead: false,
    });
    // Trigger real-time push
    pusherServer.trigger(`private-user-${personId}`, 'new-notification', input).catch((e) => console.error('Pusher Error:', e));
  } catch (error) {
    // Non-fatal by design — see docblock.
    console.error('Error creating resident notification:', error);
  }
}

/**
 * Resolve the personId behind a CustomerData row (the customer surface used by
 * RetailOrder / RestaurantOrder / ServiceJob / ServiceAppointment). Returns
 * null when the chain is broken — callers simply skip notifying.
 */
export async function personIdForCustomerData(
  customerDataId: string,
): Promise<string | null> {
  try {
    const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).all().first();
    if (!customer) return null;
    const rel = await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first();
    return rel?.personId ?? null;
  } catch (error) {
    console.error('Error resolving customer personId:', error);
    return null;
  }
}
