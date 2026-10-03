import { db } from '@/src/prisma/db';

export class LogisticsDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogisticsDomainError';
  }
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type DeliveryStatus =
  | 'REQUESTED' | 'PRICED' | 'CREATED' | 'DISPATCHED' | 'ASSIGNED'
  | 'AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_DROPOFF'
  | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  REQUESTED:  ['PRICED', 'CREATED', 'CANCELLED', 'FAILED'],
  PRICED:     ['CREATED', 'CANCELLED', 'FAILED'],
  CREATED:    ['DISPATCHED', 'CANCELLED', 'FAILED'],
  DISPATCHED: ['ASSIGNED', 'CANCELLED', 'FAILED'],
  ASSIGNED:   ['AT_PICKUP', 'CANCELLED', 'FAILED'],
  AT_PICKUP:  ['PICKED_UP', 'CANCELLED', 'FAILED'],
  PICKED_UP:  ['IN_TRANSIT', 'CANCELLED', 'FAILED'],
  IN_TRANSIT: ['AT_DROPOFF', 'FAILED'],
  AT_DROPOFF: ['DELIVERED', 'FAILED'],
  DELIVERED:  ['COMPLETED', 'FAILED'],
  COMPLETED:  [],
  CANCELLED:  [],
  FAILED:     [],
};

// ---------------------------------------------------------------------------
// Helpers: detect unique constraint violations from Prisma Next / Postgres
// ---------------------------------------------------------------------------

export function isUniqueConstraintError(e: any): boolean {
  return (
    e?.code === '23505' ||
    e?.cause?.code === '23505' ||
    e?.message?.includes('23505') ||
    e?.message?.toLowerCase().includes('unique constraint') ||
    // Prisma 7 legacy code kept for completeness
    e?.code === 'P2002'
  );
}

// ---------------------------------------------------------------------------
// createDeliveryJob
// ---------------------------------------------------------------------------

/**
 * Creates a DeliveryJob idempotently.
 *
 * Idempotency key is scoped to the provider: @@unique([providerId, idempotencyKey]).
 *
 * Under a concurrent race for the same key+provider:
 *   - Both callers with the same payload receive the same job (no 500).
 *   - A conflicting payload for an existing key is rejected with a domain error.
 */
export async function createDeliveryJob(params: {
  providerId:     string;
  sourceType:     string;
  sourceId:       string;
  idempotencyKey: string;
  dropoffAddress: string;
}) {
  try {
    return await db.transaction(async (tx: any) => {
      // Check for an existing job with this provider+key first.
      const existing = (await tx.orm.public.DeliveryJob.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all())[0];

      if (existing) {
        if (existing.sourceType !== params.sourceType || existing.sourceId !== params.sourceId) {
          throw new LogisticsDomainError('Idempotency conflict: Different payload provided for same key');
        }
        return existing;
      }

      const created = await tx.orm.public.DeliveryJob.create({
        providerId:     params.providerId,
        sourceType:     params.sourceType,
        sourceId:       params.sourceId,
        idempotencyKey: params.idempotencyKey,
        dropoffAddress: params.dropoffAddress,
        status:         'REQUESTED'
      });
      return created;
    });
  } catch (error: any) {
    // A concurrent race hit the DB unique constraint — re-read and validate.
    if (isUniqueConstraintError(error)) {
      const existing = (await db.orm.public.DeliveryJob.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all())[0];
      if (existing) {
        if (existing.sourceType !== params.sourceType || existing.sourceId !== params.sourceId) {
          throw new LogisticsDomainError('Idempotency conflict: Different payload provided for same key');
        }
        return existing;
      }
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// transitionDeliveryStatus
// ---------------------------------------------------------------------------

/**
 * Transitions a DeliveryJob to a new status, enforcing the state machine.
 * Invalid transitions throw LogisticsDomainError.
 */
export async function transitionDeliveryStatus(
  deliveryJobId: string,
  newStatus:     DeliveryStatus,
  providerId?:   string,
  txClient?:     any
) {
  const runner = txClient ? async (fn: any) => fn(txClient) : db.transaction;
  return await runner(async (tx: any) => {
    const job = (await tx.orm.public.DeliveryJob.where({ id: deliveryJobId }).all())[0];
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');

    if (providerId && job.providerId !== providerId) {
      throw new LogisticsDomainError('Provider mismatch on state transition');
    }

    const currentStatus = job.status as DeliveryStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new LogisticsDomainError(`Invalid transition from ${currentStatus} to ${newStatus}`);
    }

    const plan = tx.sql.public.deliveryJob
      .update({ status: newStatus })
      .where((f: any, fns: any) => fns.and(
        fns.eq(f.id, deliveryJobId),
        fns.eq(f.status, currentStatus)
      ))
      .returning('id', 'status')
      .build();
    
    const result = await tx.execute(plan);
    
    if (result.affectedRows === 0) {
      throw new LogisticsDomainError(`Invalid transition from ${currentStatus} to ${newStatus}`);
    }
    
    const updatedJob = await tx.orm.public.DeliveryJob.first({ id: deliveryJobId });
    return updatedJob;
  });
}

// ---------------------------------------------------------------------------
// assignDelivery
// ---------------------------------------------------------------------------

/**
 * Assigns a driver (and optionally a vehicle) to a DeliveryJob.
 *
 * Concurrency strategy — partial unique indexes (DB-level enforcement):
 *   Three partial unique indexes on "deliveryAssignment" guarantee at the
 *   PostgreSQL level that only ONE active (PENDING | ACCEPTED) assignment
 *   can exist per:
 *     - deliveryJobId   → deliveryAssignment_active_job_uidx
 *     - driverProfileId → deliveryAssignment_active_driver_uidx
 *     - vehicleId       → deliveryAssignment_active_vehicle_uidx
 *
 *   These constraints are enforced atomically by the INSERT itself, regardless
 *   of isolation level or PgBouncer connection pooling mode.  No explicit row
 *   locking is needed.
 *
 *   If two concurrent calls race past the pre-flight checks, the losing INSERT
 *   receives error 23505 (unique_violation), caught and surfaced as a
 *   LogisticsDomainError.
 *
 * Provider isolation: job, driver, and vehicle must all share the same
 *   providerId.  Vehicle→Fleet cross-provider is enforced by the composite FK
 *   on logisticsVehicle (fields: [fleetId, providerId]).
 */
export async function assignDelivery(params: {
  deliveryJobId:   string;
  driverProfileId: string;
  vehicleId?:      string;
  providerId:      string;
}) {
  try {
    return await db.transaction(async (tx: any) => {
      // 1. Read and validate the referenced entities.
      const job = (await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
      if (!job) throw new LogisticsDomainError('DeliveryJob not found');

      const driver = (await tx.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).all())[0];
      if (!driver) throw new LogisticsDomainError('Driver not found');

      let vehicle: any = null;
      if (params.vehicleId) {
        vehicle = (await tx.orm.public.LogisticsVehicle.where({ id: params.vehicleId }).all())[0];
        if (!vehicle) throw new LogisticsDomainError('Vehicle not found');
      }

      // 2. Provider isolation checks.
      if (job.providerId !== params.providerId) {
        throw new LogisticsDomainError('Provider isolation violation: Job does not belong to provider');
      }
      if (driver.providerId !== params.providerId) {
        throw new LogisticsDomainError('Provider isolation violation: Driver does not belong to provider');
      }
      if (vehicle && vehicle.providerId !== params.providerId) {
        throw new LogisticsDomainError('Provider isolation violation: Vehicle does not belong to provider');
      }
      if (vehicle && vehicle.status !== 'ACTIVE') {
        throw new LogisticsDomainError('Vehicle not available');
      }

      // 3. Pre-flight availability checks (best-effort, gives cleaner messages).
      //    The partial unique indexes below are the authoritative enforcement.
      //    Note: { in: [] } filter is not supported by this ORM version;
      //    use plain .where() then filter in-memory.
      const allJobAssignments = await tx.orm.public.DeliveryAssignment
        .where({ deliveryJobId: params.deliveryJobId })
        .all();
      const activeJobAssignments = allJobAssignments.filter(
        (a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)
      );
      if (activeJobAssignments.length > 0) {
        throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
      }

      const allDriverAssignments = await tx.orm.public.DeliveryAssignment
        .where({ driverProfileId: params.driverProfileId })
        .all();
      const activeDriverAssignments = allDriverAssignments.filter(
        (a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)
      );
      if (activeDriverAssignments.length > 0) {
        throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
      }

      if (params.vehicleId) {
        const allVehicleAssignments = await tx.orm.public.DeliveryAssignment
          .where({ vehicleId: params.vehicleId })
          .all();
        const activeVehicleAssignments = allVehicleAssignments.filter(
          (a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)
        );
        if (activeVehicleAssignments.length > 0) {
          throw new LogisticsDomainError('Concurrency error: Vehicle already has an active assignment');
        }
      }


      // 4. Insert — the partial unique indexes enforce atomicity against concurrent
      //    inserts for the same job / driver / vehicle.
      return await tx.orm.public.DeliveryAssignment.create({
        deliveryJobId:   params.deliveryJobId,
        driverProfileId: params.driverProfileId,
        vehicleId:       params.vehicleId,
        status:          'PENDING',
      });
    });
  } catch (error: any) {
    // Translate partial unique index violations (23505) into domain errors when
    // two concurrent callers race past the pre-flight checks.
    if (isUniqueConstraintError(error)) {
      const msg = (error?.message ?? error?.cause?.message ?? '').toLowerCase();
      if (msg.includes('active_job')) {
        throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
      }
      if (msg.includes('active_driver')) {
        throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
      }
      if (msg.includes('active_vehicle')) {
        throw new LogisticsDomainError('Concurrency error: Vehicle already has an active assignment');
      }
      throw new LogisticsDomainError('Concurrency error: Assignment already exists');
    }
    throw error;
  }
}
