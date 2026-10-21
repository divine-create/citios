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

export type DeliveryStatus =
  | 'REQUESTED' | 'PRICED' | 'CREATED' | 'DISPATCHED' | 'ASSIGNED'
  | 'AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_DROPOFF'
  | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
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
// Helpers: unique constraints and generators
// ---------------------------------------------------------------------------

export function isUniqueConstraintError(e: any): boolean {
  return (
    e?.code === '23505' ||
    e?.cause?.code === '23505' ||
    e?.message?.includes('23505') ||
    e?.message?.toLowerCase().includes('unique constraint') ||
    e?.code === 'P2002'
  );
}

export function generateTrackingReference(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CD-${code}`;
}

export function generateRecipientOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------------------------------------
// createDeliveryJob
// ---------------------------------------------------------------------------

export interface CreateDeliveryJobParams {
  providerId:          string;
  sourceType:          string;
  sourceId:            string;
  idempotencyKey:      string;
  dropoffAddress:      string;
  dropoffLat?:         number;
  dropoffLng?:         number;
  dropoffContactName?: string;
  dropoffContactPhone?:string;
  pickupAddress?:      string;
  pickupLat?:          number;
  pickupLng?:          number;
  pickupContactName?:  string;
  pickupContactPhone?: string;
  packageDescription?: string;
  packageWeightKg?:    number;
  serviceLevel?:       string;
  customerDataId?:     string;
  trackingReference?:  string;
  recipientOtp?:       string;
}

/**
 * Creates a DeliveryJob idempotently.
 *
 * Idempotency key is scoped to the provider: @@unique([providerId, idempotencyKey]).
 * Under a concurrent race for the same key+provider:
 *   - Both callers with the same payload receive the same job (no 500).
 *   - A conflicting payload for an existing key is rejected with a domain error.
 */
export async function createDeliveryJob(params: CreateDeliveryJobParams) {
  const trackingReference = params.trackingReference || generateTrackingReference();
  const recipientOtp = params.recipientOtp || generateRecipientOtp();
  const serviceLevel = params.serviceLevel || 'STANDARD';

  try {
    return await db.transaction(async (tx: any) => {
      // Check for an existing job with this provider+key first.
      const existing = (await tx.orm.public.DeliveryJob.where({
        providerId: params.providerId,
        idempotencyKey: params.idempotencyKey
      }).all())[0];

      if (existing) {
        if (existing.sourceType !== params.sourceType || existing.sourceId !== params.sourceId) {
          throw new LogisticsDomainError('Idempotency conflict: Different payload provided for same key');
        }
        return existing;
      }

      const created = await tx.orm.public.DeliveryJob.create({
        providerId:          params.providerId,
        sourceType:          params.sourceType,
        sourceId:            params.sourceId,
        idempotencyKey:      params.idempotencyKey,
        dropoffAddress:      params.dropoffAddress,
        dropoffLat:          params.dropoffLat,
        dropoffLng:          params.dropoffLng,
        dropoffContactName:  params.dropoffContactName,
        dropoffContactPhone: params.dropoffContactPhone,
        pickupAddress:       params.pickupAddress,
        pickupLat:           params.pickupLat,
        pickupLng:           params.pickupLng,
        pickupContactName:   params.pickupContactName,
        pickupContactPhone:  params.pickupContactPhone,
        packageDescription:  params.packageDescription,
        packageWeightKg:     params.packageWeightKg,
        serviceLevel,
        trackingReference,
        recipientOtp,
        customerDataId:      params.customerDataId,
        status:              'REQUESTED'
      });
      return created;
    });
  } catch (error: any) {
    // A concurrent race hit the DB unique constraint — re-read and validate.
    if (isUniqueConstraintError(error)) {
      const existing = (await db.orm.public.DeliveryJob.where({
        providerId: params.providerId,
        idempotencyKey: params.idempotencyKey
      }).all())[0];
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
  txClient?:     any,
  reason?:       string
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

    const updatePayload: any = { status: newStatus };
    if (newStatus === 'CANCELLED' && reason) {
      updatePayload.cancellationReason = reason;
    } else if (newStatus === 'FAILED' && reason) {
      updatePayload.failureReason = reason;
    }

    const plan = tx.sql.public.deliveryJob
      .update(updatePayload)
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

    const updated = (await tx.orm.public.DeliveryJob.where({ id: deliveryJobId }).all())[0];
    return updated;
  });
}

// ---------------------------------------------------------------------------
// assignDelivery
// ---------------------------------------------------------------------------

/**
 * Assigns a driver and (optionally) a vehicle to a DeliveryJob atomically.
 */
export async function assignDelivery(params: {
  deliveryJobId:   string;
  driverProfileId: string;
  vehicleId?:      string;
  providerId:      string;
}) {
  try {
    return await db.transaction(async (tx: any) => {
      // 1. Fetch entities.
      const job = (await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
      if (!job) throw new LogisticsDomainError('DeliveryJob not found');

      const driver = (await tx.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).all())[0];
      if (!driver) throw new LogisticsDomainError('Driver profile not found');

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

      // 3. Pre-flight availability checks.
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

      // 4. Insert assignment with PENDING status
      return await tx.orm.public.DeliveryAssignment.create({
        deliveryJobId:   params.deliveryJobId,
        driverProfileId: params.driverProfileId,
        vehicleId:       params.vehicleId,
        status:          'PENDING',
      });
    });
  } catch (error: any) {
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

export class Money {
  readonly cents: number;
  readonly currency: string;

  constructor(amountInMajorUnits: number, currency = 'NGN') {
    this.cents = Math.round(amountInMajorUnits * 100);
    this.currency = currency.toUpperCase();
  }

  static fromCents(cents: number, currency = 'NGN'): Money {
    const m = Object.create(Money.prototype);
    m.cents = Math.round(cents);
    m.currency = currency.toUpperCase();
    return m;
  }

  get amount(): number {
    return this.cents / 100;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.cents + other.cents, this.currency);
  }

  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.cents * factor), this.currency);
  }

  private assertSameCurrency(other: Money) {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} !== ${other.currency}`);
    }
  }
}

export class MockPartnerCourierAdapter {
  providerName = 'CityDrive Partner Express';

  async getQuote(req: any): Promise<any> {
    const baseFee = 800;
    const distanceEstimateKm = 6;
    const distanceFee = distanceEstimateKm * 180;
    const weightFee = (req.weightKg || 1) * 50;
    const total = baseFee + distanceFee + weightFee + (req.priority ? 1200 : 0);

    return {
      courierName: this.providerName,
      quoteReference: `PARTNER-Q-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      totalAmount: total,
      currency: 'NGN',
      estimatedDeliveryMinutes: req.priority ? 45 : 90,
    };
  }

  async bookShipment(req: any): Promise<any> {
    return {
      success: true,
      externalTrackingNumber: `CDP-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'BOOKED',
    };
  }

  async getTracking(externalTrackingNumber: string) {
    return {
      status: 'IN_TRANSIT',
      milestones: ['Shipment Registered', 'Picked up by partner courier', 'In transit to hub'],
    };
  }
}
