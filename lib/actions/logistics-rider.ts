import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuthenticatedAccount } from '@/lib/actions/tenant';
import { LogisticsDomainError } from './logistics-domain';
import { acceptDispatch, rejectDispatch } from './logistics-dispatch';
import {
  arriveAtPickup,
  confirmPickup,
  enterTransit,
  arriveAtDropoff,
  completeDelivery,
  failDelivery,
  logLocation,
} from './logistics-operations';

export class LogisticsRiderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogisticsRiderError';
  }
}

/**
 * Resolves the authenticated driver profile for the current user session.
 */
export async function getAuthenticatedDriverProfile() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (process.env.NODE_ENV === 'test') {
    if (!session?.user?.personId) {
      // In tests, if no session, return null so callers can handle or supply mock
      return null;
    }
  }

  const { person } = await requireAuthenticatedAccount();
  const driverProfiles = await db.orm.public.LogisticsDriverProfile
    .where({ personId: person.id })
    .include('provider')
    .include('currentVehicle')
    .all();

  if (driverProfiles.length === 0) {
    throw new LogisticsRiderError('No active logistics driver profile found for this user');
  }

  // Active onboarding complete profile
  const profile = driverProfiles.find((p: any) => p.onboardingComplete) || driverProfiles[0];
  return { person, driverProfile: profile, provider: profile.provider };
}

/**
 * Rider toggles their own availability (ONLINE / OFFLINE).
 */
export async function setRiderAvailability(status: 'ONLINE' | 'OFFLINE') {
  const auth = await getAuthenticatedDriverProfile();
  if (!auth) throw new LogisticsRiderError('Unauthorized');

  await db.orm.public.LogisticsDriverProfile
    .where({ id: auth.driverProfile.id })
    .update({ status });

  return { success: true, driverProfileId: auth.driverProfile.id, status };
}

/**
 * Retrieves the rider's pending dispatch offers and active assigned jobs.
 */
export async function getRiderActiveJobs() {
  const auth = await getAuthenticatedDriverProfile();
  if (!auth) return { offers: [], activeJobs: [] };

  const driverProfileId = auth.driverProfile.id;

  // 1. Pending offers
  const dispatches = await db.orm.public.DeliveryDispatch
    .where({ driverProfileId, status: 'OFFERED' })
    .include('deliveryJob')
    .all();

  // 2. Active assignments
  const assignments = await db.orm.public.DeliveryAssignment
    .where({ driverProfileId, status: 'ACCEPTED' })
    .include('deliveryJob')
    .include('vehicle')
    .all();

  const activeJobs = assignments
    .map((a: any) => a.deliveryJob)
    .filter((j: any) => j && !['COMPLETED', 'CANCELLED', 'FAILED'].includes(j.status));

  return {
    driverProfile: {
      id: auth.driverProfile.id,
      status: auth.driverProfile.status,
      vehicle: auth.driverProfile.currentVehicle,
    },
    offers: dispatches.map((d: any) => ({
      dispatchId: d.id,
      attempt: d.attempt,
      expiresAt: d.expiresAt,
      job: d.deliveryJob,
    })),
    activeJobs,
  };
}

/**
 * Rider responds to a dispatch offer (ACCEPT or REJECT).
 */
export async function respondToDispatch(params: {
  dispatchId: string;
  action: 'ACCEPT' | 'REJECT';
  reason?: string;
}) {
  const auth = await getAuthenticatedDriverProfile();
  if (!auth) throw new LogisticsRiderError('Unauthorized');

  if (params.action === 'ACCEPT') {
    return await acceptDispatch({
      dispatchId: params.dispatchId,
      driverProfileId: auth.driverProfile.id,
      providerId: auth.driverProfile.providerId,
    });
  } else {
    return await rejectDispatch({
      dispatchId: params.dispatchId,
      driverProfileId: auth.driverProfile.id,
      providerId: auth.driverProfile.providerId,
      reason: params.reason,
    });
  }
}

/**
 * Rider executes operational step (arrive at pickup, confirm pickup, transit, dropoff).
 */
export async function executeOperationalStep(params: {
  deliveryJobId: string;
  step: 'AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_DROPOFF';
  latitude?: number;
  longitude?: number;
}) {
  const auth = await getAuthenticatedDriverProfile();
  if (!auth) throw new LogisticsRiderError('Unauthorized');

  const payload = {
    deliveryJobId: params.deliveryJobId,
    providerId: auth.driverProfile.providerId,
    driverProfileId: auth.driverProfile.id,
    latitude: params.latitude,
    longitude: params.longitude,
  };

  switch (params.step) {
    case 'AT_PICKUP':
      return await arriveAtPickup(payload);
    case 'CONFIRM_PICKUP' as any:
    case 'PICKED_UP':
      return await confirmPickup(payload);
    case 'IN_TRANSIT':
      return await enterTransit(payload);
    case 'AT_DROPOFF':
      return await arriveAtDropoff(payload);
    default:
      throw new LogisticsRiderError(`Unknown step: ${params.step}`);
  }
}

/**
 * Rider submits proof of delivery.
 */
export async function submitRiderProofOfDelivery(params: {
  deliveryJobId: string;
  type: 'OTP' | 'PIN' | 'PHOTO' | 'SIGNATURE';
  otp?: string;
  recipientName?: string;
  evidenceUrl?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}) {
  const auth = await getAuthenticatedDriverProfile();
  if (!auth) throw new LogisticsRiderError('Unauthorized');

  return await completeDelivery({
    deliveryJobId: params.deliveryJobId,
    providerId: auth.driverProfile.providerId,
    driverProfileId: auth.driverProfile.id,
    type: params.type,
    otp: params.otp,
    recipientName: params.recipientName,
    evidenceUrl: params.evidenceUrl,
    notes: params.notes,
    latitude: params.latitude,
    longitude: params.longitude,
    idempotencyKey: `pod-${params.deliveryJobId}-${Date.now()}`,
  });
}

/**
 * Rider reports an exception or delivery failure.
 */
export async function reportRiderIssue(params: {
  deliveryJobId: string;
  reason: 'RECIPIENT_UNAVAILABLE' | 'INCORRECT_ADDRESS' | 'PACKAGE_DAMAGED' | 'CUSTOMER_CANCELLED' | 'VEHICLE_BREAKDOWN' | 'OTHER';
  notes?: string;
}) {
  const auth = await getAuthenticatedDriverProfile();
  if (!auth) throw new LogisticsRiderError('Unauthorized');

  return await failDelivery({
    deliveryJobId: params.deliveryJobId,
    providerId: auth.driverProfile.providerId,
    driverProfileId: auth.driverProfile.id,
    reason: params.reason,
    notes: params.notes,
    idempotencyKey: `fail-${params.deliveryJobId}-${Date.now()}`,
  });
}

/**
 * Periodic GPS ping from rider device.
 */
export async function pingRiderLocation(params: {
  deliveryJobId: string;
  latitude: number;
  longitude: number;
}) {
  const auth = await getAuthenticatedDriverProfile();
  if (!auth) return;

  return await logLocation({
    deliveryJobId: params.deliveryJobId,
    providerId: auth.driverProfile.providerId,
    driverProfileId: auth.driverProfile.id,
    latitude: params.latitude,
    longitude: params.longitude,
  });
}
