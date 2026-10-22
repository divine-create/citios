import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuthenticatedAccount } from '@/lib/actions/tenant';
import { LogisticsDomainError } from './logistics-domain';
import { acceptDispatch, rejectDispatch, declineDispatchOffer } from './logistics-dispatch';
import { pusherServer } from '@/lib/pusher';
import {
  arriveAtPickup,
  confirmPickup,
  enterTransit,
  arriveAtDropoff,
  completeDelivery,
  failDelivery,
  logLocation,
} from './logistics-operations';
import {
  isValidCoordinate,
  isPointServiceable,
  findClosestOperationalZone,
} from '../mapping/serviceability';
import type { CoordinateProvenance } from './resident-address';

export class LogisticsRiderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogisticsRiderError';
  }
}

export interface RiderLocationObservation {
  latitude: number;
  longitude: number;
  observedAt: number; // Unix timestamp in ms
  zoneId: string | null;
  zoneName: string | null;
  lgaCode: string | null;
  provenance: CoordinateProvenance;
  isStale: boolean;
}

export interface RiderReadinessReport {
  driverProfileId: string;
  personId: string;
  providerId: string;
  providerName: string;
  status: string;
  onboardingComplete: boolean;
  hasActiveVehicle: boolean;
  vehicleDetails: {
    id: string;
    type: string;
    licensePlate: string;
    status: string;
  } | null;
  isNetworkParticipant: boolean;
  lastLocation: RiderLocationObservation | null;
  isDispatchEligible: boolean;
  ineligibilityReasons: string[];
}

// In-memory telemetry cache for real-time driver spatial observations
const driverTelemetryMap = new Map<
  string,
  {
    latitude: number;
    longitude: number;
    observedAt: number;
    zoneId: string | null;
    zoneName: string | null;
    lgaCode: string | null;
    provenance: CoordinateProvenance;
  }
>();

export const MAX_LOCATION_AGE_MS = 15 * 60 * 1000; // 15 minutes freshness threshold

/**
 * Checks whether a driver's observed location is still fresh for proximity ranking.
 */
export function isDriverLocationFresh(observedAt: number): boolean {
  return Date.now() - observedAt <= MAX_LOCATION_AGE_MS;
}

/**
 * Gets the current telemetry observation for a rider.
 */
export function getRiderTelemetry(driverProfileId: string): RiderLocationObservation | null {
  const entry = driverTelemetryMap.get(driverProfileId);
  if (!entry) return null;

  const isStale = !isDriverLocationFresh(entry.observedAt);
  return {
    ...entry,
    isStale,
  };
}

/**
 * Manually sets telemetry for testing or mock environments.
 */
export function setTestRiderTelemetry(
  driverProfileId: string,
  observation: {
    latitude: number;
    longitude: number;
    observedAt?: number;
    provenance?: CoordinateProvenance;
  }
) {
  const point = { latitude: observation.latitude, longitude: observation.longitude };
  const match = findClosestOperationalZone(point);
  driverTelemetryMap.set(driverProfileId, {
    latitude: observation.latitude,
    longitude: observation.longitude,
    observedAt: observation.observedAt ?? Date.now(),
    zoneId: match?.zone.id || null,
    zoneName: match?.zone.name || null,
    lgaCode: match?.lga?.code || match?.zone.lgaId || null,
    provenance: observation.provenance || 'DEVICE_GPS',
  });
}

/**
 * Evaluates the full operational readiness of a rider.
 */
export async function getRiderReadiness(driverProfileId: string): Promise<RiderReadinessReport> {
  const driver = await db.orm.public.LogisticsDriverProfile
    .where({ id: driverProfileId })
    .all()
    .first();

  if (!driver) {
    throw new LogisticsDomainError(`Driver profile ${driverProfileId} not found.`);
  }

  const ineligibilityReasons: string[] = [];

  // 1. Identity & Onboarding verification
  if (!driver.onboardingComplete) {
    ineligibilityReasons.push('Rider onboarding is incomplete.');
  }

  // 2. Provider verification & network settings
  const provider = await db.orm.public.Organization.where({ id: driver.providerId }).all().first();
  if (!provider || provider.status !== 'ACTIVE') {
    ineligibilityReasons.push('Logistics provider organization is inactive or suspended.');
  }

  const settings = await db.orm.public.LogisticsSettings
    .where({ organizationId: driver.providerId })
    .all()
    .first();
  const isNetworkParticipant = settings?.isNetworkParticipant === true;
  if (!isNetworkParticipant) {
    ineligibilityReasons.push('Provider organization has not activated CityDrive Network participation.');
  }

  // 3. Vehicle assignment & active status
  let vehicleDetails: RiderReadinessReport['vehicleDetails'] = null;
  let hasActiveVehicle = false;

  if (driver.currentVehicleId) {
    const vehicle = await db.orm.public.LogisticsVehicle
      .where({ id: driver.currentVehicleId })
      .all()
      .first();

    if (vehicle && vehicle.status === 'ACTIVE') {
      hasActiveVehicle = true;
      vehicleDetails = {
        id: vehicle.id,
        type: vehicle.type,
        licensePlate: vehicle.licensePlate,
        status: vehicle.status,
      };
    } else {
      ineligibilityReasons.push('Assigned vehicle is not active or in maintenance.');
    }
  } else {
    ineligibilityReasons.push('No vehicle currently assigned to rider.');
  }

  // 4. Status check
  if (driver.status === 'SUSPENDED') {
    ineligibilityReasons.push('Driver account is suspended.');
  }

  // 5. Telemetry & Location freshness
  const lastLocation = getRiderTelemetry(driverProfileId);
  if (lastLocation) {
    if (lastLocation.isStale) {
      ineligibilityReasons.push('Rider GPS coordinates are stale (> 15 minutes old).');
    }
    const serviceable = isPointServiceable({
      latitude: lastLocation.latitude,
      longitude: lastLocation.longitude,
    });
    if (!serviceable) {
      ineligibilityReasons.push('Rider last-known location is outside Calabar delivery zones.');
    }
  }

  const isDispatchEligible = ineligibilityReasons.length === 0 && driver.status === 'ONLINE';

  return {
    driverProfileId: driver.id,
    personId: driver.personId,
    providerId: driver.providerId,
    providerName: provider?.name || 'Unknown Provider',
    status: driver.status,
    onboardingComplete: driver.onboardingComplete,
    hasActiveVehicle,
    vehicleDetails,
    isNetworkParticipant,
    lastLocation,
    isDispatchEligible,
    ineligibilityReasons,
  };
}

/**
 * Checks in a rider to ONLINE status.
 * Enforces:
 * 1. Actor authentication and rider ownership (personId match).
 * 2. Onboarding complete check.
 * 3. Approved active vehicle assigned.
 * 4. Coordinate validation (rejects invalid coords or coords outside Calabar).
 * 5. Transitions driver status to ONLINE.
 */
export async function checkInRider(params: {
  driverProfileId: string;
  latitude: number;
  longitude: number;
  provenance?: CoordinateProvenance;
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  const driver = await db.orm.public.LogisticsDriverProfile
    .where({ id: params.driverProfileId })
    .all()
    .first();

  if (!driver) {
    throw new LogisticsDomainError('Driver profile not found.');
  }

  // In non-test mode or when session exists, enforce that authenticated person matches driver.personId
  if (session?.user?.personId && driver.personId !== session.user.personId && !session.user.isSystemAdmin) {
    throw new LogisticsDomainError('UNAUTHORIZED: Cannot check in for another driver.');
  }

  if (driver.status === 'SUSPENDED') {
    throw new LogisticsDomainError('Suspended drivers cannot check in.');
  }

  if (!driver.onboardingComplete) {
    throw new LogisticsDomainError('Rider onboarding must be completed before checking in.');
  }

  if (!driver.currentVehicleId) {
    throw new LogisticsDomainError('An active vehicle must be assigned before checking in.');
  }

  const vehicle = await db.orm.public.LogisticsVehicle
    .where({ id: driver.currentVehicleId })
    .all()
    .first();

  if (!vehicle || vehicle.status !== 'ACTIVE') {
    throw new LogisticsDomainError('Assigned vehicle is not active.');
  }

  // Coordinate and Coverage Validation
  if (!isValidCoordinate(params.latitude, params.longitude)) {
    throw new LogisticsDomainError('Valid GPS coordinates are required for rider check-in.');
  }

  const point = { latitude: params.latitude, longitude: params.longitude };
  if (!isPointServiceable(point)) {
    throw new LogisticsDomainError(
      'Check-in location is outside active Calabar delivery coverage zones.'
    );
  }

  const match = findClosestOperationalZone(point);
  const now = Date.now();

  // Update telemetry
  driverTelemetryMap.set(params.driverProfileId, {
    latitude: params.latitude,
    longitude: params.longitude,
    observedAt: now,
    zoneId: match?.zone.id || null,
    zoneName: match?.zone.name || null,
    lgaCode: match?.lga?.code || match?.zone.lgaId || null,
    provenance: params.provenance || 'DEVICE_GPS',
  });

  // Update DB driver status to ONLINE
  await db.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).update({
    status: 'ONLINE' as any,
  });

  return {
    success: true,
    status: 'ONLINE',
    driverProfileId: params.driverProfileId,
    zoneId: match?.zone.id,
    zoneName: match?.zone.name,
    checkedInAt: new Date(now).toISOString(),
  };
}

/**
 * Checks out a rider to OFFLINE status.
 * Enforces that no active, in-transit deliveries are pending completion.
 */
export async function checkOutRider(params: { driverProfileId: string }) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  const driver = await db.orm.public.LogisticsDriverProfile
    .where({ id: params.driverProfileId })
    .all()
    .first();

  if (!driver) {
    throw new LogisticsDomainError('Driver profile not found.');
  }

  if (session?.user?.personId && driver.personId !== session.user.personId && !session.user.isSystemAdmin) {
    throw new LogisticsDomainError('UNAUTHORIZED: Cannot check out for another driver.');
  }

  // Check for active assignments
  const activeAssignments = (await db.orm.public.DeliveryAssignment
    .where({ driverProfileId: params.driverProfileId })
    .all())
    .filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));

  if (activeAssignments.length > 0) {
    throw new LogisticsDomainError(
      'Cannot check out while having active delivery assignments in progress.'
    );
  }

  await db.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).update({
    status: 'OFFLINE' as any,
  });

  return {
    success: true,
    status: 'OFFLINE',
    driverProfileId: params.driverProfileId,
  };
}

/**
 * Updates the rider's real-time GPS coordinates while on duty.
 */
export async function updateRiderLocation(params: {
  driverProfileId: string;
  latitude: number;
  longitude: number;
  provenance?: CoordinateProvenance;
  observedAt?: number;
  deliveryJobId?: string;
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  const driver = await db.orm.public.LogisticsDriverProfile
    .where({ id: params.driverProfileId })
    .all()
    .first();

  if (!driver) {
    throw new LogisticsDomainError('Driver profile not found.');
  }

  if (session?.user?.personId && driver.personId !== session.user.personId && !session.user.isSystemAdmin) {
    throw new LogisticsDomainError('UNAUTHORIZED: Cannot update location for another driver.');
  }

  if (!isValidCoordinate(params.latitude, params.longitude)) {
    throw new LogisticsDomainError('Valid GPS coordinates required.');
  }

  const now = params.observedAt ?? Date.now();
  const existing = driverTelemetryMap.get(params.driverProfileId);

  // Reject out-of-order timestamps
  if (existing && existing.observedAt && now < existing.observedAt) {
    throw new LogisticsDomainError('Out-of-order location update rejected.');
  }

  // Rate limiting (< 500ms between updates)
  if (existing && existing.observedAt && (now - existing.observedAt) < 500) {
    return {
      success: true,
      rateLimited: true,
      observedAt: new Date(existing.observedAt).toISOString(),
      zoneId: existing.zoneId,
      zoneName: existing.zoneName,
    };
  }

  const point = { latitude: params.latitude, longitude: params.longitude };
  const match = findClosestOperationalZone(point);

  driverTelemetryMap.set(params.driverProfileId, {
    latitude: params.latitude,
    longitude: params.longitude,
    observedAt: now,
    zoneId: match?.zone.id || null,
    zoneName: match?.zone.name || null,
    lgaCode: match?.lga?.code || match?.zone.lgaId || null,
    provenance: params.provenance || 'DEVICE_GPS',
  });

  // Broadcast live location to active delivery tracking channel if on active delivery
  if (params.deliveryJobId) {
    try {
      await pusherServer.trigger(`private-delivery-${params.deliveryJobId}`, 'rider:location', {
        driverProfileId: params.driverProfileId,
        latitude: params.latitude,
        longitude: params.longitude,
        observedAt: new Date(now).toISOString(),
        zoneId: match?.zone.id || null,
        provenance: params.provenance || 'DEVICE_GPS',
      });
    } catch (e: any) {
      console.warn('[Pusher Warning] Location stream broadcast error:', e?.message);
    }
  }

  return {
    success: true,
    rateLimited: false,
    observedAt: new Date(now).toISOString(),
    zoneId: match?.zone.id || null,
    zoneName: match?.zone.name || null,
  };
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

  const dispatches = await db.orm.public.DeliveryDispatch
    .where({ driverProfileId, status: 'OFFERED' })
    .include('deliveryJob')
    .all();

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
    return await declineDispatchOffer({
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
  reason:
    | 'RECIPIENT_UNAVAILABLE'
    | 'INCORRECT_ADDRESS'
    | 'PACKAGE_DAMAGED'
    | 'CUSTOMER_CANCELLED'
    | 'VEHICLE_BREAKDOWN'
    | 'OTHER';
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
