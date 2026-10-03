import { db } from '@/src/prisma/db';
import { LogisticsDomainError, isUniqueConstraintError, assignDelivery } from './logistics-domain';
import '@js-temporal/polyfill';

type DispatchStatus = 'PENDING' | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';

function toTemporal(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

/**
 * Deterministically returns eligible candidates for a DeliveryJob.
 */
export async function findEligibleCandidates(params: { deliveryJobId: string; providerId: string }) {
  const drivers = await db.orm.public.LogisticsDriverProfile
    .where({ providerId: params.providerId, status: 'ONLINE', onboardingComplete: true })
    .all();
    
  const vehicles = await db.orm.public.LogisticsVehicle
    .where({ providerId: params.providerId, status: 'ACTIVE' })
    .all();

  // Find active assignments to exclude them
  const allAssignments = await db.orm.public.DeliveryAssignment.all();
  const activeAssignments = allAssignments.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));

  const assignedDriverIds = new Set(activeAssignments.map((a: any) => a.driverProfileId));
  const assignedVehicleIds = new Set(activeAssignments.map((a: any) => a.vehicleId).filter(Boolean));

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

      if (job.status !== 'REQUESTED' && job.status !== 'CREATED' && job.status !== 'DISPATCHED') {
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
      // Re-read idempotency
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
 * Driver accepts the dispatch.
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
    if (dispatch.expiresAt && dispatch.expiresAt < new Date()) {
      throw new LogisticsDomainError('Dispatch expired');
    }

    // Attempt the assignment
    // We delegate to the Phase 1 canonical assignDelivery which enforces DB-level unique constraints
    // If it fails with a constraint error, we just throw that back to the caller
    // NOTE: Because assignDelivery starts its own db.transaction, and Prisma Next transactions do not 
    // nest well, we need to extract assignDelivery core logic into a reusable inner function OR 
    // just call the public assignDelivery outside the current tx? 
    // Since we need to update the dispatch atomically, we can't do that easily without nesting.
    // Wait, let's just do it directly here using tx.
    
    // 1. Read Driver
    const driver = (await tx.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).all())[0];
    if (!driver || driver.providerId !== params.providerId) throw new LogisticsDomainError('Driver not found or provider mismatch');

    // 2. Pre-flight checks (best effort)
    const allAssignmentsJob = await tx.orm.public.DeliveryAssignment.where({ deliveryJobId: dispatch.deliveryJobId }).all();
    if (allAssignmentsJob.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)).length > 0) {
      throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
    }
    
    const allAssignmentsDriver = await tx.orm.public.DeliveryAssignment.where({ driverProfileId: params.driverProfileId }).all();
    if (allAssignmentsDriver.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)).length > 0) {
      throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
    }

    let vehicleId = dispatch.vehicleId;
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
