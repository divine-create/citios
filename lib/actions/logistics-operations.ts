import { db } from '@/src/prisma/db';
import { LogisticsDomainError, transitionDeliveryStatus } from './logistics-domain';
import '@js-temporal/polyfill';

type TrackingEventType = 'CREATED' | 'DISPATCHED' | 'ASSIGNED' | 'AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_DROPOFF' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'LOCATION_UPDATE';

function toTemporal(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

/**
 * Validates the operation is authorized for the given job.
 * Ensures the delivery belongs to the given provider.
 * Ensures the job has an active ACCEPTED assignment.
 * If driverProfileId is provided, ensures the assignment belongs to that driver.
 */
async function authorizeAndGetAssignment(tx: any, deliveryJobId: string, providerId: string, driverProfileId?: string) {
  const jobs = await tx.orm.public.DeliveryJob.where({ id: deliveryJobId }).all();
  const job = jobs[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');
  if (job.providerId !== providerId) throw new LogisticsDomainError('Provider mismatch');

  const assignments = await tx.orm.public.DeliveryAssignment
    .where({ deliveryJobId, status: 'ACCEPTED' })
    .all();
  const assignment = assignments[0];

  if (!assignment) throw new LogisticsDomainError('No active ACCEPTED assignment found for delivery');
    if (driverProfileId && assignment.driverProfileId !== driverProfileId) {
    throw new LogisticsDomainError('Driver not authorized for this delivery');
  }

  return { job, assignment };
}

/**
 * Common operational transition template.
 */
async function performOperationalTransition(params: {
  deliveryJobId: string;
  providerId: string;
  driverProfileId?: string;
  expectedCurrentState?: string[];
  newStatus: any;
  eventType: TrackingEventType;
  notes?: string;
  latitude?: number;
  longitude?: number;
  idempotencyKey?: string;
}) {
  return await db.transaction(async (tx: any) => {
    if (params.idempotencyKey) {
      const existingEvents = await tx.orm.public.DeliveryTrackingEvent.where({
        providerId: params.providerId,
        deliveryJobId: params.deliveryJobId,
        idempotencyKey: params.idempotencyKey
      }).all();
      const existingEvent = existingEvents[0];
      
      if (existingEvent) {
        // Return existing idempotently
        const existingJobs = await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
        const existingJob = existingJobs[0];
        return { event: existingEvent, job: existingJob };
      }
    }

    try {
      const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);

    if (params.expectedCurrentState && !params.expectedCurrentState.includes(job.status)) {
      throw new LogisticsDomainError(`Cannot perform ${params.eventType} from state ${job.status}`);
    }

    // Attempt state transition
    const updatedJob = await transitionDeliveryStatus(params.deliveryJobId, params.newStatus, params.providerId, tx);

    // Create event
    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: params.deliveryJobId,
      eventType: params.eventType,
      providerId: params.providerId,
      driverProfileId: assignment.driverProfileId,
      idempotencyKey: params.idempotencyKey,
      latitude: params.latitude,
      longitude: params.longitude,
      notes: params.notes,
      recordedAt: toTemporal(new Date())
    });

    return { event, job: updatedJob };
    } catch (e: any) {
      if (params.idempotencyKey) {
        // Re-read to see if another transaction completed it
        const existingEvents = await db.orm.public.DeliveryTrackingEvent.where({
          providerId: params.providerId,
          deliveryJobId: params.deliveryJobId,
          idempotencyKey: params.idempotencyKey
        }).all();
        if (existingEvents.length > 0) {
          const existingJobs = await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
          return { event: existingEvents[0], job: existingJobs[0] };
        }
      }
      throw e;
    }
  });
}

// 1. Arrive at pickup
export async function arriveAtPickup(params: { deliveryJobId: string; providerId: string; driverProfileId: string; idempotencyKey?: string; latitude?: number; longitude?: number }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['ASSIGNED'],
    newStatus: 'AT_PICKUP',
    eventType: 'AT_PICKUP',
    notes: 'Arrived at pickup location'
  });
}

// 2. Confirm Pickup
export async function confirmPickup(params: { deliveryJobId: string; providerId: string; driverProfileId: string; idempotencyKey?: string; latitude?: number; longitude?: number }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['AT_PICKUP'],
    newStatus: 'PICKED_UP',
    eventType: 'PICKED_UP',
    notes: 'Delivery picked up'
  });
}

// 3. Enter Transit
export async function enterTransit(params: { deliveryJobId: string; providerId: string; driverProfileId: string; idempotencyKey?: string; latitude?: number; longitude?: number }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['PICKED_UP'],
    newStatus: 'IN_TRANSIT',
    eventType: 'IN_TRANSIT',
    notes: 'Delivery is in transit'
  });
}

// 4. Arrive at dropoff
export async function arriveAtDropoff(params: { deliveryJobId: string; providerId: string; driverProfileId: string; idempotencyKey?: string; latitude?: number; longitude?: number }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['IN_TRANSIT'],
    newStatus: 'AT_DROPOFF',
    eventType: 'AT_DROPOFF',
    notes: 'Arrived at dropoff location'
  });
}

// 5. Complete Delivery
// NOTE: ProofOfDelivery deferred.
export async function completeDelivery(params: { 
  deliveryJobId: string; 
  providerId: string; 
  driverProfileId: string; 
  type: string;
  evidenceUrl?: string;
  recipientName?: string;
  notes?: string;
  idempotencyKey?: string; 
  latitude?: number; 
  longitude?: number; 
}) {
  return await db.transaction(async (tx: any) => {
    if (params.idempotencyKey) {
      const existingEvents = await tx.orm.public.DeliveryTrackingEvent.where({
        providerId: params.providerId,
        deliveryJobId: params.deliveryJobId,
        idempotencyKey: params.idempotencyKey
      }).all();
      const existingEvent = existingEvents[0];
      
      if (existingEvent) {
        // Idempotent return
        const existingJobs = await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
        const existingPods = await tx.orm.public.ProofOfDelivery.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all();
        return { event: existingEvent, job: existingJobs[0], proofOfDelivery: existingPods[0] };
      }
    }

    try {
      const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);

      if (job.status !== 'AT_DROPOFF') {
        throw new LogisticsDomainError(`Cannot perform DELIVERED from state ${job.status}`);
      }

      // Check duplicate POD
      const existingPod = await tx.orm.public.ProofOfDelivery.where({ deliveryJobId: params.deliveryJobId }).all();
      if (existingPod.length > 0) {
        throw new LogisticsDomainError('Proof of Delivery already exists for this DeliveryJob');
      }

      // 1. Create ProofOfDelivery
      const pod = await tx.orm.public.ProofOfDelivery.create({
        deliveryJobId: params.deliveryJobId,
        providerId: params.providerId,
        idempotencyKey: params.idempotencyKey,
        type: params.type,
        evidenceUrl: params.evidenceUrl,
        recipientName: params.recipientName,
        notes: params.notes,
        latitude: params.latitude,
        longitude: params.longitude
      });

      // 2. State transition
      const updatedJob = await transitionDeliveryStatus(params.deliveryJobId, 'DELIVERED', params.providerId, tx);

      // 3. Create tracking event
      const event = await tx.orm.public.DeliveryTrackingEvent.create({
        deliveryJobId: params.deliveryJobId,
        eventType: 'DELIVERED',
        providerId: params.providerId,
        driverProfileId: assignment.driverProfileId,
        idempotencyKey: params.idempotencyKey,
        latitude: params.latitude,
        longitude: params.longitude,
        notes: params.notes || 'Delivery completed with Proof of Delivery',
        recordedAt: toTemporal(new Date())
      });

      return { event, job: updatedJob, proofOfDelivery: pod };

    } catch (e: any) {
      if (params.idempotencyKey) {
        const existingEvents = await db.orm.public.DeliveryTrackingEvent.where({
          providerId: params.providerId,
          deliveryJobId: params.deliveryJobId,
          idempotencyKey: params.idempotencyKey
        }).all();
        if (existingEvents.length > 0) {
           const existingJobs = await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
           const existingPods = await db.orm.public.ProofOfDelivery.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all();
           return { event: existingEvents[0], job: existingJobs[0], proofOfDelivery: existingPods[0] };
        }
      }
      throw e;
    }
  });
}

// 6. Close Workflow
export async function closeWorkflow(params: { deliveryJobId: string; providerId: string; idempotencyKey?: string }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['DELIVERED'],
    newStatus: 'COMPLETED',
    eventType: 'COMPLETED',
    notes: 'LogisticsOS operational workflow closed'
  });
}

// Location Update
export async function logLocation(params: { deliveryJobId: string; providerId: string; driverProfileId: string; latitude: number; longitude: number; idempotencyKey?: string }) {
  return await db.transaction(async (tx: any) => {
    if (params.idempotencyKey) {
      const existingEvents = await tx.orm.public.DeliveryTrackingEvent.where({
        providerId: params.providerId,
        deliveryJobId: params.deliveryJobId,
        idempotencyKey: params.idempotencyKey
      }).all();
      const existingEvent = existingEvents[0];
      if (existingEvent) return { event: existingEvent };
    }

    const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);
    
    // Only allow location updates if currently in an active state
    if (['COMPLETED', 'CANCELLED', 'FAILED', 'DELIVERED'].includes(job.status)) {
       throw new LogisticsDomainError('Cannot log location for inactive delivery');
    }

    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: params.deliveryJobId,
      eventType: 'LOCATION_UPDATE',
      providerId: params.providerId,
      driverProfileId: assignment.driverProfileId,
      idempotencyKey: params.idempotencyKey,
      latitude: params.latitude,
      longitude: params.longitude,
      notes: 'Location ping',
      recordedAt: toTemporal(new Date())
    });

    return { event };
  });
}

// Read: Get tracking history
export async function getTrackingHistory(deliveryJobId: string, providerId: string) {
  const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId }).all();
  // Ensure provider isolation
  if (events.length > 0 && events.some((e: any) => e.providerId !== providerId)) {
    throw new LogisticsDomainError('Provider mismatch');
  }
  // Sort oldest -> newest
  return events.sort((a, b) => (globalThis as any).Temporal.Instant.compare(a.recordedAt, b.recordedAt));
}

// Read: Get delivery state
export async function getDeliveryState(deliveryJobId: string, providerId: string) {
  const jobs = await db.orm.public.DeliveryJob.where({ id: deliveryJobId }).all();
  const job = jobs[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');
  if (job.providerId !== providerId) throw new LogisticsDomainError('Provider mismatch');

  const assignments = await db.orm.public.DeliveryAssignment.where({ deliveryJobId, status: 'ACCEPTED' }).all();
  const assignment = assignments[0];
  const driver = assignment ? (await db.orm.public.LogisticsDriverProfile.where({ id: assignment.driverProfileId }).all())[0] : null;
  const vehicle = assignment?.vehicleId ? (await db.orm.public.LogisticsVehicle.where({ id: assignment.vehicleId }).all())[0] : null;
  const events = await getTrackingHistory(deliveryJobId, providerId);

  return {
    delivery: job,
    currentStatus: job.status,
    assignment,
    driver,
    vehicle,
    latestTrackingEvent: events.length > 0 ? events[events.length - 1] : null
  };
}
