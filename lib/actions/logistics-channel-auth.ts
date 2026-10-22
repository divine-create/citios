import { db } from '@/src/prisma/db';
import { pusherServer } from '@/lib/pusher';

export interface ChannelAuthResult {
  authorized: boolean;
  status: number;
  reason?: string;
  authResponse?: any;
}

/**
 * Authoritative server-side authorization for private Pusher channels:
 * 1. `private-user-${personId}`: Restricted to the authenticated user.
 * 2. `private-rider-${driverProfileId}`: Restricted to the driver whose personId matches the authenticated user.
 * 3. `private-delivery-${deliveryJobId}`: Restricted to:
 *    - The assigned rider (driverProfile.personId matches user)
 *    - The merchant/provider organization members
 *    - The customer/recipient associated with the delivery
 */
export async function authorizePusherChannel(params: {
  personId: string | null | undefined;
  isSystemAdmin?: boolean;
  channelName: string;
  socketId?: string;
}): Promise<ChannelAuthResult> {
  const { personId, isSystemAdmin, channelName, socketId } = params;

  if (!personId) {
    return { authorized: false, status: 401, reason: 'Authentication required' };
  }

  // 1. Personal User Channel: private-user-${personId}
  if (channelName === `private-user-${personId}`) {
    const authResponse = socketId ? pusherServer.authorizeChannel(socketId, channelName) : { auth: 'ok' };
    return { authorized: true, status: 200, authResponse };
  }

  // 2. Rider Channel: private-rider-${driverProfileId}
  if (channelName.startsWith('private-rider-')) {
    const driverProfileId = channelName.replace('private-rider-', '').trim();
    if (!driverProfileId) {
      return { authorized: false, status: 400, reason: 'Invalid rider channel name' };
    }

    if (isSystemAdmin) {
      const authResponse = socketId ? pusherServer.authorizeChannel(socketId, channelName) : { auth: 'ok' };
      return { authorized: true, status: 200, authResponse };
    }

    const driver = await db.orm.public.LogisticsDriverProfile
      .where({ id: driverProfileId })
      .all()
      .first();

    if (!driver || driver.personId !== personId) {
      return { authorized: false, status: 403, reason: 'Unauthorized rider channel access' };
    }

    const authResponse = socketId ? pusherServer.authorizeChannel(socketId, channelName) : { auth: 'ok' };
    return { authorized: true, status: 200, authResponse };
  }

  // 3. Delivery Tracking Channel: private-delivery-${deliveryJobId}
  if (channelName.startsWith('private-delivery-')) {
    const deliveryJobId = channelName.replace('private-delivery-', '').trim();
    if (!deliveryJobId) {
      return { authorized: false, status: 400, reason: 'Invalid delivery channel name' };
    }

    if (isSystemAdmin) {
      const authResponse = socketId ? pusherServer.authorizeChannel(socketId, channelName) : { auth: 'ok' };
      return { authorized: true, status: 200, authResponse };
    }

    const job = await db.orm.public.DeliveryJob
      .where({ id: deliveryJobId })
      .include('assignments')
      .all()
      .first();

    if (!job) {
      return { authorized: false, status: 404, reason: 'Delivery job not found' };
    }

    // Check A: Is the user the assigned driver?
    const activeAssignments = (job.assignments || []).filter(
      (a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)
    );
    for (const a of activeAssignments) {
      const driverId = (a as any).driverProfileId ? String((a as any).driverProfileId) : null;
      if (driverId) {
        const d = await db.orm.public.LogisticsDriverProfile.where({ id: driverId }).all().first();
        if (d && d.personId === personId) {
          const authResponse = socketId ? pusherServer.authorizeChannel(socketId, channelName) : { auth: 'ok' };
          return { authorized: true, status: 200, authResponse };
        }
      }
    }

    // Check B: Is the user a member of the provider organization?
    if (job.providerId) {
      const membership = await db.orm.public.Membership
        .where({ personId, organizationId: String(job.providerId) })
        .all()
        .first();
      if (membership) {
        const authResponse = socketId ? pusherServer.authorizeChannel(socketId, channelName) : { auth: 'ok' };
        return { authorized: true, status: 200, authResponse };
      }
    }

    // Check C: Is the user the sender/creator or linked to customerData?
    if (job.customerDataId) {
      const customer = await db.orm.public.CustomerData
        .where({ id: String(job.customerDataId) })
        .all()
        .first();
      if (customer && customer.personId === personId) {
        const authResponse = socketId ? pusherServer.authorizeChannel(socketId, channelName) : { auth: 'ok' };
        return { authorized: true, status: 200, authResponse };
      }
    }

    return { authorized: false, status: 403, reason: 'Unauthorized delivery tracking channel access' };
  }

  // Any other channel name is denied by default
  return { authorized: false, status: 403, reason: 'Forbidden channel' };
}
