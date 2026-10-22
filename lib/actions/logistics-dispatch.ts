'use server';

import { db } from '@/src/prisma/db';
import { LogisticsDomainError, isUniqueConstraintError, assignDelivery } from './logistics-domain';
import { resolvePointServiceability, isPointServiceable } from '../mapping/serviceability';
import { getRiderTelemetry } from './logistics-rider';
import { pusherServer } from '@/lib/pusher';
import { maskPublicAddress } from './logistics-tracking';
import '@js-temporal/polyfill';

export type DispatchStatus = 'PENDING' | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';

import {
  type NetworkDispatchPolicy,
  type ProviderCategory,
  getNetworkDispatchPolicy,
  isCityOSPlatformFleet,
  getProviderCategory,
} from './logistics-policy';

export type { NetworkDispatchPolicy, ProviderCategory };

function toTemporal(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

/**
 * Deterministically returns eligible candidates for a DeliveryJob,
 * efficiently scoping queries to prevent unbounded full-table scans.
 */
export async function findEligibleCandidates(params: { deliveryJobId: string; providerId: string }) {
  const [drivers, vehicles, activeJobs] = await Promise.all([
    db.orm.public.LogisticsDriverProfile
      .where({ providerId: params.providerId, status: 'ONLINE', onboardingComplete: true })
      .include('person')
      .include('currentVehicle')
      .all(),
    db.orm.public.LogisticsVehicle
      .where({ providerId: params.providerId, status: 'ACTIVE' })
      .all(),
    db.orm.public.DeliveryJob
      .where({ providerId: params.providerId })
      .include('assignments')
      .all(),
  ]);

  const activeAssignments = activeJobs
    .filter((j: any) => ['DISPATCHED', 'ASSIGNED', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF'].includes(j.status))
    .flatMap((j: any) => j.assignments || [])
    .filter((a: any) => a.status === 'PENDING' || a.status === 'ACCEPTED');

  const assignedDriverIds = new Set(
    activeAssignments.map((a: any) => a.driverProfileId).filter(Boolean)
  );

  const assignedVehicleIds = new Set(
    activeAssignments.map((a: any) => a.vehicleId).filter(Boolean)
  );

  return {
    drivers: drivers.filter((d: any) => !assignedDriverIds.has(d.id)),
    vehicles: vehicles.filter((v: any) => !assignedVehicleIds.has(v.id)),
  };
}

/**
 * Creates a Dispatch attempt for a DeliveryJob.
 */
export async function dispatchDelivery(params: {
  deliveryJobId: string;
  providerId: string;
  driverProfileId?: string;
  vehicleId?: string;
  idempotencyKey?: string;
  expiresAt?: Date;
}) {
  try {
    return await db.transaction(async (tx: any) => {
      const job = (await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
      if (!job) throw new LogisticsDomainError('DeliveryJob not found');
      if (job.providerId && job.providerId !== params.providerId) {
        throw new LogisticsDomainError('Provider isolation violation');
      }
      if (!job.providerId) {
        await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({ providerId: params.providerId });
      }

      if (params.idempotencyKey) {
        const existing = (await tx.orm.public.DeliveryDispatch.where({ deliveryJobId: params.deliveryJobId, idempotencyKey: params.idempotencyKey }).all())[0];
        if (existing) {
          return existing;
        }
      }

      const allDispatches = await tx.orm.public.DeliveryDispatch.where({ deliveryJobId: params.deliveryJobId }).all();
      const activeDispatches = allDispatches.filter((d: any) => ['PENDING', 'OFFERED'].includes(d.status));
      if (activeDispatches.length > 0) {
        throw new LogisticsDomainError('DeliveryJob already has an active dispatch');
      }

      if (!['REQUESTED', 'PRICED', 'CREATED', 'DISPATCHED'].includes(job.status)) {
        throw new LogisticsDomainError(`Cannot dispatch DeliveryJob in status ${job.status}`);
      }

      const attempt = allDispatches.length + 1;
      
      const dispatch = await tx.orm.public.DeliveryDispatch.create({
        deliveryJobId: params.deliveryJobId,
        providerId: params.providerId,
        status: params.driverProfileId ? 'OFFERED' : 'PENDING',
        driverProfileId: params.driverProfileId,
        vehicleId: params.vehicleId,
        idempotencyKey: params.idempotencyKey,
        expiresAt: params.expiresAt ? toTemporal(new Date(params.expiresAt)) : undefined,
        attempt
      });

      if (job.status !== 'DISPATCHED') {
        await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({ status: 'DISPATCHED' });
        await tx.orm.public.DeliveryTrackingEvent.create({
          deliveryJobId: params.deliveryJobId,
          eventType: 'DISPATCHED',
          providerId: params.providerId,
          notes: `Dispatch attempt ${attempt}`
        });
      }

      // Broadcast real-time dispatch notification to driver's private channel
      if (params.driverProfileId) {
        try {
          const maskedDropoff = maskPublicAddress(job.dropoffAddress);
          const maskedPickup = maskPublicAddress(job.pickupAddress);
          await pusherServer.trigger(`private-rider-${params.driverProfileId}`, 'dispatch:offered', {
            dispatchId: dispatch.id,
            deliveryJobId: params.deliveryJobId,
            attempt,
            pickupArea: maskedPickup,
            dropoffArea: maskedDropoff,
            packageWeightKg: job.packageWeightKg || 1.0,
            serviceLevel: job.serviceLevel || 'STANDARD',
            expiresAt: params.expiresAt ? new Date(params.expiresAt).toISOString() : null,
          });
        } catch (notifyErr: any) {
          console.warn('[Pusher Dispatch Notification Warning]', notifyErr?.message);
        }
      }

      return dispatch;
    });
  } catch (error: any) {
    if (isUniqueConstraintError(error)) {
      if (params.idempotencyKey) {
        const existing = (await db.orm.public.DeliveryDispatch.where({ deliveryJobId: params.deliveryJobId, idempotencyKey: params.idempotencyKey }).all())[0];
        if (existing) return existing;
      }
      throw new LogisticsDomainError('Concurrency error: Dispatch already exists for this job');
    }
    throw error;
  }
}

/**
 * Driver accepts the dispatch and locks assignment.
 */
export async function acceptDispatch(params: {
  dispatchId: string;
  driverProfileId: string;
  providerId: string;
}) {
  return await db.transaction(async (tx: any) => {
    const dispatch = (await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).all())[0];
    if (!dispatch) throw new LogisticsDomainError('Dispatch not found');
    if (dispatch.providerId !== params.providerId) throw new LogisticsDomainError('Provider isolation violation');
    if (dispatch.driverProfileId && dispatch.driverProfileId !== params.driverProfileId) {
      throw new LogisticsDomainError('Dispatch was not offered to this driver');
    }
    if (dispatch.status !== 'PENDING' && dispatch.status !== 'OFFERED') {
      throw new LogisticsDomainError(`Dispatch is no longer active (status: ${dispatch.status})`);
    }
    if (dispatch.expiresAt && Date.parse(String(dispatch.expiresAt)) < Date.now()) {
      throw new LogisticsDomainError('Dispatch expired');
    }

    // 1. Read Driver & Verify Eligibility
    const driver = (await tx.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).all())[0];
    if (!driver || driver.providerId !== params.providerId) throw new LogisticsDomainError('Driver not found or provider mismatch');
    if (driver.status === 'SUSPENDED') throw new LogisticsDomainError('Suspended drivers cannot accept assignments');
    if (driver.status === 'OFFLINE') throw new LogisticsDomainError('Offline drivers cannot accept assignments');
    if (!driver.onboardingComplete) throw new LogisticsDomainError('Driver onboarding incomplete');

    let vehicleId = dispatch.vehicleId || driver.currentVehicleId;
    if (vehicleId) {
      const vehicle = (await tx.orm.public.LogisticsVehicle.where({ id: vehicleId }).all())[0];
      if (!vehicle || vehicle.status !== 'ACTIVE') {
        throw new LogisticsDomainError('Assigned vehicle is inactive or in maintenance');
      }
    } else {
      throw new LogisticsDomainError('No vehicle assigned to rider');
    }

    const telemetry = getRiderTelemetry(params.driverProfileId);
    if (telemetry) {
      if (telemetry.isStale) {
        throw new LogisticsDomainError('Rider GPS telemetry is stale. Fresh check-in required.');
      }
      if (!isPointServiceable({ latitude: telemetry.latitude, longitude: telemetry.longitude })) {
        throw new LogisticsDomainError('Rider current location is outside active Calabar delivery coverage.');
      }
    }

    // 2. Pre-flight checks & Concurrency Lock
    const job = (await tx.orm.public.DeliveryJob.where({ id: dispatch.deliveryJobId }).all())[0];
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');
    if (['ASSIGNED', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(job.status)) {
      throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
    }

    // Serialize concurrent attempts by touching DeliveryJob row lock
    await tx.orm.public.DeliveryJob.where({ id: dispatch.deliveryJobId }).update({
      updatedAt: toTemporal(new Date()),
    });

    const allAssignmentsJob = await tx.orm.public.DeliveryAssignment.where({ deliveryJobId: dispatch.deliveryJobId }).all();
    if (allAssignmentsJob.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)).length > 0) {
      throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
    }
    
    const allAssignmentsDriver = await tx.orm.public.DeliveryAssignment.where({ driverProfileId: params.driverProfileId }).all();
    if (allAssignmentsDriver.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)).length > 0) {
      throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
    }

    if (vehicleId) {
      const allAssignmentsVehicle = await tx.orm.public.DeliveryAssignment.where({ vehicleId }).all();
      if (allAssignmentsVehicle.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)).length > 0) {
        throw new LogisticsDomainError('Concurrency error: Vehicle already has an active assignment');
      }
    }

    // 3. Create the assignment
    const assignment = await tx.orm.public.DeliveryAssignment.create({
      deliveryJobId: dispatch.deliveryJobId,
      driverProfileId: params.driverProfileId,
      vehicleId,
      status: 'ACCEPTED',
    }).catch((e: any) => {
      if (isUniqueConstraintError(e)) {
        const msg = (e?.message ?? e?.cause?.message ?? '').toLowerCase();
        if (msg.includes('active_job')) throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
        if (msg.includes('active_driver')) throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
        if (msg.includes('active_vehicle')) throw new LogisticsDomainError('Concurrency error: Vehicle already has an active assignment');
        throw new LogisticsDomainError('Concurrency error: Assignment already exists');
      }
      throw e;
    });

    // 4. Update the Dispatch
    const updatedDispatch = await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).update({
      status: 'ACCEPTED',
      acceptedAt: toTemporal(new Date()),
      driverProfileId: params.driverProfileId
    });

    // 5. Update DeliveryJob, Driver status & Audit
    await tx.orm.public.DeliveryJob.where({ id: dispatch.deliveryJobId }).update({ status: 'ASSIGNED' });
    await tx.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).update({ status: 'BUSY' as any });
    await tx.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: dispatch.deliveryJobId,
      eventType: 'ASSIGNED',
      providerId: dispatch.providerId,
      driverProfileId: params.driverProfileId,
      notes: 'Dispatch accepted by driver'
    });

    return { dispatch: updatedDispatch, assignment };
  });
}

/**
 * Driver or system rejects the dispatch.
 */
export async function rejectDispatch(params: {
  dispatchId: string;
  driverProfileId?: string;
  providerId: string;
  reason?: string;
}) {
  return await db.transaction(async (tx: any) => {
    const dispatch = (await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).all())[0];
    if (!dispatch) throw new LogisticsDomainError('Dispatch not found');
    if (dispatch.providerId !== params.providerId) throw new LogisticsDomainError('Provider isolation violation');
    if (params.driverProfileId && dispatch.driverProfileId && dispatch.driverProfileId !== params.driverProfileId) {
      throw new LogisticsDomainError('Not authorized to reject this dispatch');
    }
    if (dispatch.status !== 'PENDING' && dispatch.status !== 'OFFERED') {
      throw new LogisticsDomainError(`Cannot reject dispatch in status ${dispatch.status}`);
    }

    return await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).update({
      status: 'REJECTED',
      rejectedAt: toTemporal(new Date()),
      failureReason: params.reason
    });
  });
}

/**
 * Cancels an active dispatch attempt.
 */
export async function cancelDispatch(params: {
  dispatchId: string;
  providerId: string;
  reason?: string;
}) {
  return await db.transaction(async (tx: any) => {
    const dispatch = (await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).all())[0];
    if (!dispatch) throw new LogisticsDomainError('Dispatch not found');
    if (dispatch.providerId !== params.providerId) throw new LogisticsDomainError('Provider isolation violation');
    if (dispatch.status !== 'PENDING' && dispatch.status !== 'OFFERED') {
      throw new LogisticsDomainError(`Cannot cancel dispatch in status ${dispatch.status}`);
    }

    return await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).update({
      status: 'CANCELLED',
      cancelledAt: toTemporal(new Date()),
      failureReason: params.reason || 'Cancelled by dispatcher'
    });
  });
}

/**
 * System expires a dispatch.
 */
export async function expireDispatch(params: {
  dispatchId: string;
  providerId: string;
}) {
  return await db.transaction(async (tx: any) => {
    const dispatch = (await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).all())[0];
    if (!dispatch) throw new LogisticsDomainError('Dispatch not found');
    if (dispatch.providerId !== params.providerId) throw new LogisticsDomainError('Provider isolation violation');
    if (dispatch.status !== 'PENDING' && dispatch.status !== 'OFFERED') {
      throw new LogisticsDomainError(`Cannot expire dispatch in status ${dispatch.status}`);
    }

    return await tx.orm.public.DeliveryDispatch.where({ id: params.dispatchId }).update({
      status: 'EXPIRED'
    });
  });
}

/**
 * Automated dispatch engine: scores candidates and creates an offer to the best driver.
 */
export async function autoDispatchDelivery(params: {
  deliveryJobId: string;
  providerId: string;
  expiryMinutes?: number;
}) {
  const job = await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId, providerId: params.providerId }).first();
  if (!job) throw new LogisticsDomainError('DeliveryJob not found for provider');

  const { drivers, vehicles } = await findEligibleCandidates({
    deliveryJobId: params.deliveryJobId,
    providerId: params.providerId,
  });

  if (drivers.length === 0) {
    return { success: false, reason: 'NO_ELIGIBLE_DRIVERS', dispatch: null };
  }

  // Scoring heuristic:
  // 1. Driver has assigned active vehicle: +10 pts
  // 2. Heavy package (> 15kg) with car/van/truck: +20 pts
  // 3. Light package (< 5kg) with motorcycle/bike: +15 pts
  const scoredDrivers = drivers.map((driver: any) => {
    let score = 50; // base score

    if (driver.currentVehicleId) {
      score += 10;
      const v = vehicles.find((veh: any) => veh.id === driver.currentVehicleId);
      if (v) {
        const isHeavy = (job.packageWeightKg ?? 1) > 10;
        if (isHeavy && ['CAR', 'VAN', 'TRUCK'].includes(v.type)) score += 20;
        if (!isHeavy && ['BIKE', 'MOTORCYCLE'].includes(v.type)) score += 15;
      }
    }

    return { driver, score };
  });

  scoredDrivers.sort((a, b) => b.score - a.score);
  const bestCandidate = scoredDrivers[0].driver;

  const expiryMinutes = params.expiryMinutes || 15;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const dispatch = await dispatchDelivery({
    deliveryJobId: params.deliveryJobId,
    providerId: params.providerId,
    driverProfileId: bestCandidate.id,
    vehicleId: bestCandidate.currentVehicleId || undefined,
    expiresAt,
    idempotencyKey: `auto-dispatch-${params.deliveryJobId}-${Date.now()}`,
  });

  return { success: true, dispatch, driver: bestCandidate };
}

/**
 * Finds eligible, online, approved CityOS Network riders across participating providers.
 * Ranks candidates by zone proximity, vehicle suitability, and active workload.
 * In CITYOS_ONLY mode, only CityOS-operated platform fleets are eligible.
 */
export async function findNetworkCandidates(params: {
  deliveryJobId: string;
  providerId?: string;
  pickup?: { latitude: number; longitude: number };
  dropoff?: { latitude: number; longitude: number };
  packageWeightKg?: number;
  excludedDriverIds?: string[];
  policy?: NetworkDispatchPolicy;
}) {
  const policy = params.policy || getNetworkDispatchPolicy();

  let pickupZone = null;
  if (params.pickup) {
    const pickupServ = resolvePointServiceability(params.pickup);
    if (pickupServ.status === 'INSIDE_COVERAGE') {
      pickupZone = pickupServ.zone;
    }
  }

  // Query network participant organizations
  const participantSettings = await db.orm.public.LogisticsSettings.where({
    isNetworkParticipant: true,
  }).all();

  const allParticipantOrgIds = participantSettings.map((s: any) => s.organizationId);
  if (allParticipantOrgIds.length === 0) {
    return { candidates: [], serviceabilityVerified: !!pickupZone, pickupZone };
  }

  // Fetch participant organizations to evaluate category
  const participantOrgs = await db.orm.public.Organization.all();
  const orgMap = new Map(participantOrgs.map((o: any) => [o.id, o]));

  const eligibleNetworkOrgIds = new Set<string>();
  for (const orgId of allParticipantOrgIds) {
    const org = orgMap.get(orgId);
    if (!org || org.status !== 'ACTIVE') continue;

    if (policy === 'CITYOS_ONLY') {
      if (isCityOSPlatformFleet(org.id, org.name)) {
        eligibleNetworkOrgIds.add(org.id);
      }
    } else {
      eligibleNetworkOrgIds.add(org.id);
    }
  }

  if (eligibleNetworkOrgIds.size === 0) {
    return { candidates: [], serviceabilityVerified: !!pickupZone, pickupZone };
  }

  // Find online, onboarded drivers belonging to participating eligible providers
  const allOnlineDrivers = await db.orm.public.LogisticsDriverProfile
    .where({ status: 'ONLINE', onboardingComplete: true })
    .include('person')
    .include('currentVehicle')
    .all();

  let networkDrivers = allOnlineDrivers.filter((d: any) => eligibleNetworkOrgIds.has(d.providerId));
  if (params.providerId) {
    networkDrivers = networkDrivers.filter((d: any) => d.providerId === params.providerId);
  }

  // Exclude drivers currently on active assignments
  const activeAssignments = (await db.orm.public.DeliveryAssignment.all())
    .filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));
  const busyDriverIds = new Set(activeAssignments.map((a: any) => a.driverProfileId));

  // Also exclude drivers who have already rejected, expired, or been excluded for this job
  const pastDispatches = await db.orm.public.DeliveryDispatch
    .where({ deliveryJobId: params.deliveryJobId })
    .all();
  const excludedDriverSet = new Set(
    pastDispatches
      .filter((d: any) => ['REJECTED', 'EXPIRED', 'CANCELLED'].includes(d.status))
      .map((d: any) => d.driverProfileId)
      .filter(Boolean)
  );

  if (params.excludedDriverIds) {
    for (const id of params.excludedDriverIds) {
      excludedDriverSet.add(id);
    }
  }

  const availableDrivers = networkDrivers.filter(
    (d: any) => !busyDriverIds.has(d.id) && !excludedDriverSet.has(d.id)
  );

  // Rank available candidates
  const scored = availableDrivers.map((d: any) => {
    let score = 50; // base score
    const v = d.currentVehicle;
    if (v) {
      if (v.status === 'ACTIVE') {
        score += 10;
        const isHeavy = (params.packageWeightKg || 1) > 10;
        if (isHeavy && ['CAR', 'VAN', 'TRUCK'].includes(v.type)) score += 20;
        if (!isHeavy && ['BIKE', 'MOTORCYCLE'].includes(v.type)) score += 15;
      } else {
        score -= 40; // Penalize inactive/maintenance vehicles
      }
    }

    // Proximity ranking using fresh telemetry
    const telemetry = getRiderTelemetry(d.id);
    if (telemetry && !telemetry.isStale) {
      if (pickupZone && telemetry.zoneId === pickupZone.id) {
        score += 50; // In same operational zone
      } else if (pickupZone && (telemetry.lgaCode === pickupZone.lgaId || telemetry.lgaCode === (pickupZone as any).code)) {
        score += 20; // In same LGA
      }
    }

    return { driver: d, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    candidates: scored.map((s) => s.driver),
    serviceabilityVerified: !!pickupZone,
    pickupZone,
  };
}

/**
 * Executes CityDrive Network dispatch with priority for CityOS network riders,
 * and strictly controlled behavior when network capacity is exhausted.
 * In CITYOS_ONLY mode, external partner fallback is prohibited and returns NO_RIDER_AVAILABLE.
 */
export async function dispatchNetworkJob(params: {
  deliveryJobId: string;
  providerId?: string;
  pickup?: { latitude: number; longitude: number };
  dropoff?: { latitude: number; longitude: number };
  packageWeightKg?: number;
  acceptanceWindowSeconds?: number;
  idempotencyKey?: string;
  policy?: NetworkDispatchPolicy;
}) {
  const policy = params.policy || getNetworkDispatchPolicy();

  const job = (await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');

  // Verify private business isolation:
  // If the delivery belongs to a provider that is not a network participant,
  // it is a private merchant/business delivery and must NOT enter shared network dispatch!
  if (job.providerId) {
    const settings = await db.orm.public.LogisticsSettings.where({
      organizationId: job.providerId,
    }).first();
    if (settings && !settings.isNetworkParticipant) {
      throw new LogisticsDomainError(
        `Private CityDrive Business delivery (provider ${job.providerId}) cannot enter shared CityDrive Network dispatch.`
      );
    }
  }

  const targetProviderId = params.providerId || job.providerId || undefined;

  const { candidates } = await findNetworkCandidates({
    deliveryJobId: params.deliveryJobId,
    providerId: targetProviderId,
    pickup:
      params.pickup ||
      (job.pickupLat && job.pickupLng
        ? { latitude: job.pickupLat, longitude: job.pickupLng }
        : undefined),
    dropoff:
      params.dropoff ||
      (job.dropoffLat && job.dropoffLng
        ? { latitude: job.dropoffLat, longitude: job.dropoffLng }
        : undefined),
    packageWeightKg: params.packageWeightKg || job.packageWeightKg || 1.0,
    policy,
  });

  // If network candidates are available, offer job to top candidate
  if (candidates.length > 0) {
    const topCandidate = candidates[0];
    const windowSec = params.acceptanceWindowSeconds || 60;
    const expiresAt = new Date(Date.now() + windowSec * 1000);

    const dispatch = await dispatchDelivery({
      deliveryJobId: params.deliveryJobId,
      providerId: topCandidate.providerId,
      driverProfileId: topCandidate.id,
      vehicleId: topCandidate.currentVehicleId || undefined,
      expiresAt,
      idempotencyKey:
        params.idempotencyKey || `net-disp-${params.deliveryJobId}-${topCandidate.id}`,
    });

    return {
      success: true,
      tier: 'CITYOS_NETWORK' as const,
      dispatch,
      driver: topCandidate,
      candidateCount: candidates.length,
      partnerFallbackEligible: false,
    };
  }

  // Network capacity exhausted branch:
  if (policy === 'CITYOS_ONLY') {
    let trackingProviderId = targetProviderId;
    if (!trackingProviderId) {
      const fallbackOrg = await db.orm.public.Organization.where({ type: 'LOGISTICS' as any, status: 'ACTIVE' as any }).first();
      trackingProviderId = fallbackOrg?.id;
    }
    if (trackingProviderId) {
      await db.orm.public.DeliveryTrackingEvent.create({
        deliveryJobId: params.deliveryJobId,
        eventType: 'DISPATCHED',
        providerId: trackingProviderId,
        notes: 'CityDrive Network dispatch exhausted: No eligible CityOS fleet riders available. Operations intervention required.',
      }).catch((e: any) => console.warn('[Dispatch Exhausted Tracking Warning]', e.message));
    }

    return {
      success: false,
      tier: 'NO_RIDER_AVAILABLE' as const,
      dispatch: null,
      driver: null,
      candidateCount: 0,
      partnerFallbackEligible: false,
      operationalInterventionRequired: true,
      reason: 'CityDrive Network riders exhausted. No eligible CityOS fleet riders available.',
    };
  }

  // Open-network fallback branch:
  let trackingProviderId = targetProviderId;
  if (!trackingProviderId) {
    const fallbackOrg = await db.orm.public.Organization.where({ type: 'LOGISTICS' as any, status: 'ACTIVE' as any }).first();
    trackingProviderId = fallbackOrg?.id;
  }
  if (trackingProviderId) {
    await db.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: params.deliveryJobId,
      eventType: 'DISPATCHED',
      providerId: trackingProviderId,
      notes: 'CityDrive Network riders exhausted. Flagged for approved partner fallback.',
    }).catch(() => {});
  }

  return {
    success: false,
    tier: 'PARTNER_FALLBACK' as const,
    dispatch: null,
    driver: null,
    candidateCount: 0,
    partnerFallbackEligible: true,
    reason: 'CityDrive Network capacity exhausted. Fallback to approved logistics partner.',
  };
}

/**
 * Driver declines a dispatch offer.
 * Triggers automatic reassignment to the next best eligible network candidate or records exhaustion.
 */
export async function declineDispatchOffer(params: {
  dispatchId: string;
  driverProfileId: string;
  providerId: string;
  reason?: string;
  acceptanceWindowSeconds?: number;
  policy?: NetworkDispatchPolicy;
}) {
  const rejected = await rejectDispatch(params);

  await db.orm.public.DeliveryTrackingEvent.create({
    deliveryJobId: rejected.deliveryJobId,
    eventType: 'DISPATCHED',
    providerId: params.providerId,
    driverProfileId: params.driverProfileId,
    notes: `Dispatch offer declined by rider. Reason: ${params.reason || 'Declined'}. Reassigning...`,
  }).catch(() => {});

  const reassignment = await reassignDeliveryJob({
    deliveryJobId: rejected.deliveryJobId,
    acceptanceWindowSeconds: params.acceptanceWindowSeconds,
    policy: params.policy,
  });

  return { rejected, reassignment };
}

/**
 * Handles expiry/timeout of a dispatch offer.
 * Triggers automatic reassignment to the next best eligible network candidate or records exhaustion.
 */
export async function handleDispatchOfferTimeout(params: {
  dispatchId: string;
  providerId: string;
  acceptanceWindowSeconds?: number;
  policy?: NetworkDispatchPolicy;
}) {
  const expired = await expireDispatch(params);

  await db.orm.public.DeliveryTrackingEvent.create({
    deliveryJobId: expired.deliveryJobId,
    eventType: 'DISPATCHED',
    providerId: params.providerId,
    driverProfileId: expired.driverProfileId,
    notes: `Dispatch offer expired for rider ${expired.driverProfileId || 'unassigned'}. Reassigning...`,
  }).catch(() => {});

  const reassignment = await reassignDeliveryJob({
    deliveryJobId: expired.deliveryJobId,
    acceptanceWindowSeconds: params.acceptanceWindowSeconds,
    policy: params.policy,
  });

  return { expired, reassignment };
}

/**
 * Re-evaluates network candidates for an unassigned job,
 * excluding previously declined/expired riders, and dispatches to the next candidate or records exhaustion.
 */
export async function reassignDeliveryJob(params: {
  deliveryJobId: string;
  acceptanceWindowSeconds?: number;
  policy?: NetworkDispatchPolicy;
}) {
  const job = (await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');

  if (['ASSIGNED', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(job.status)) {
    return { reassigned: false, reason: `Job already in status ${job.status}` };
  }

  const result = await dispatchNetworkJob({
    deliveryJobId: params.deliveryJobId,
    providerId: job.providerId || undefined,
    acceptanceWindowSeconds: params.acceptanceWindowSeconds || 60,
    policy: params.policy,
  });

  return {
    reassigned: result.success,
    tier: result.tier,
    dispatch: result.dispatch,
    driver: result.driver,
    partnerFallbackEligible: result.partnerFallbackEligible,
  };
}
