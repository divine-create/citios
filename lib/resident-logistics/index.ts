/**
 * Resident Logistics — authorised entry point.
 *
 * NOT 'use server' (takes personId). Callers must resolve personId from the
 * NextAuth session (see app/actions/activity.ts).
 */
import { ownsOrderSource } from '@/lib/resident-activity/compose';
import { loadDeliveryForOwnedSource, type DeliverySource, type ResidentDelivery } from './read';

export type { ResidentDelivery } from './read';

/**
 * Returns the delivery for an order only if the resident owns that order
 * (ownership proven server-side via CustomerData). Returns null for
 * not-found, not-owned, wrong source type, or no delivery — indistinguishably.
 * A client-supplied deliveryId is never accepted.
 */
export async function getResidentDelivery(
  personId: string,
  sourceType: unknown,
  sourceId: unknown,
): Promise<ResidentDelivery | null> {
  if (!personId) return null;
  if (!(await ownsOrderSource(personId, sourceType, sourceId))) return null;
  return loadDeliveryForOwnedSource(sourceType as DeliverySource, sourceId as string);
}
