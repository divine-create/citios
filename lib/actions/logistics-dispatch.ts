'use server';

import { db } from '@/src/prisma/db';
import { LogisticsDomainError, isUniqueConstraintError, assignDelivery } from './logistics-domain';
import '@js-temporal/polyfill';

export type DispatchStatus = 'PENDING' | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';

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
      if (job.providerId !== params.providerId) throw new LogisticsDomainError('Provider isolation violation');

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

    // 1. Read Driver
    const driver = (await tx.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).all())[0];
    if (!driver || driver.providerId !== params.providerId) throw new LogisticsDomainError('Driver not found or provider mismatch');

    // 2. Pre-flight checks
    const allAssignmentsJob = await tx.orm.public.DeliveryAssignment.where({ deliveryJobId: dispatch.deliveryJobId }).all();
    if (allAssignmentsJob.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)).length > 0) {
      throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
    }
    
    const allAssignmentsDriver = await tx.orm.public.DeliveryAssignment.where({ driverProfileId: params.driverProfileId }).all();
    if (allAssignmentsDriver.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)).length > 0) {
      throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
    }

    let vehicleId = dispatch.vehicleId || driver.currentVehicleId;
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

    // 5. Update DeliveryJob & Audit
    await tx.orm.public.DeliveryJob.where({ id: dispatch.deliveryJobId }).update({ status: 'ASSIGNED' });
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
