import { db } from '@/src/prisma/db';
import { LogisticsDomainError, transitionDeliveryStatus } from './logistics-domain';
import { verifyDeliveryOtp, isDeliveryOtpExpired } from './logistics-otp';
import { dispatchDeliveryOtp } from './logistics-sms';
import '@js-temporal/polyfill';

export type TrackingEventType =
  | 'CREATED'
  | 'DISPATCHED'
  | 'ASSIGNED'
  | 'AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'AT_DROPOFF'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'LOCATION_UPDATE';

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

      if (params.newStatus === 'COMPLETED' && assignment?.id) {
        await tx.orm.public.DeliveryAssignment.where({ id: assignment.id }).update({
          status: 'COMPLETED',
          completedAt: toTemporal(new Date())
        });
      }

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
export async function arriveAtPickup(params: { deliveryJobId: string; providerId: string; driverProfileId: string; latitude?: number; longitude?: number; idempotencyKey?: string }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['ASSIGNED'],
    newStatus: 'AT_PICKUP',
    eventType: 'AT_PICKUP',
    notes: 'Driver arrived at pickup location'
  });
}

// 2. Confirm pickup
export async function confirmPickup(params: { deliveryJobId: string; providerId: string; driverProfileId: string; idempotencyKey?: string }) {
  const res = await performOperationalTransition({
    ...params,
    expectedCurrentState: ['AT_PICKUP'],
    newStatus: 'PICKED_UP',
    eventType: 'PICKED_UP',
    notes: 'Driver confirmed package pickup'
  });

  // Dispatch recipient delivery PIN notification when package is in custody
  try {
    const job = res.job;
    if (job?.recipientOtp) {
      await dispatchDeliveryOtp({
        deliveryJobId: job.id,
        providerId: job.providerId,
        rawOtp: job.rawOtp || '',
        trackingReference: job.trackingReference || job.id.slice(0, 8).toUpperCase(),
        customerDataId: job.customerDataId,
        recipientPhone: job.dropoffContactPhone,
        recipientName: job.dropoffContactName,
      });
    }
  } catch (err: any) {
    console.warn('[CityDrive Pickup] Non-fatal OTP notification warning:', err.message);
  }

  return res;
}

// 3. Enter transit
export async function enterTransit(params: { deliveryJobId: string; providerId: string; driverProfileId: string; idempotencyKey?: string }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['PICKED_UP'],
    newStatus: 'IN_TRANSIT',
    eventType: 'IN_TRANSIT',
    notes: 'Package is in transit to destination'
  });
}

// 4. Arrive at dropoff
export async function arriveAtDropoff(params: { deliveryJobId: string; providerId: string; driverProfileId: string; latitude?: number; longitude?: number; idempotencyKey?: string }) {
  return performOperationalTransition({
    ...params,
    expectedCurrentState: ['IN_TRANSIT'],
    newStatus: 'AT_DROPOFF',
    eventType: 'AT_DROPOFF',
    notes: 'Driver arrived at dropoff destination'
  });
}

// 5. Complete Delivery (Proof of Delivery verification)
export async function completeDelivery(params: {
  deliveryJobId: string;
  providerId: string;
  driverProfileId: string;
  type: string; // PIN | OTP | SIGNATURE | PHOTO
  otp?: string;
  evidenceUrl?: string;
  recipientName?: string;
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
        const existingJobs = await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
        const existingPods = await tx.orm.public.ProofOfDelivery.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all();
        return { event: existingEvent, job: existingJobs[0], proofOfDelivery: existingPods[0] };
      }
    }

    try {
      // 1. Atomically serialize concurrent completion attempts via row-lock update
      await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({ updatedAt: toTemporal(new Date()) });

      const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);

      if (job.status !== 'AT_DROPOFF') {
        throw new LogisticsDomainError(`Cannot perform DELIVERED from state ${job.status}`);
      }

      // Check duplicate POD / prevent replay
      const existingPod = await tx.orm.public.ProofOfDelivery.where({ deliveryJobId: params.deliveryJobId }).all();
      if (existingPod.length > 0) {
        throw new LogisticsDomainError('Proof of Delivery already exists for this DeliveryJob');
      }

      // If the delivery job has a recipient OTP configured, it is mandatory, rate-limited, and expires
      if (job.recipientOtp) {
        if (!params.otp || !params.otp.trim()) {
          throw new LogisticsDomainError('Recipient OTP is required to complete this delivery');
        }

        // Check OTP expiration (default 24h)
        if (job.createdAt && isDeliveryOtpExpired(job.createdAt)) {
          throw new LogisticsDomainError('Recipient OTP has expired. Please request a new delivery OTP.');
        }

        // Rate limit check: count prior failed attempts for this delivery
        const priorFailedEvents = await db.orm.public.DeliveryTrackingEvent.where({
          deliveryJobId: params.deliveryJobId,
          eventType: 'FAILED',
        }).all();
        const failedOtpCount = priorFailedEvents.filter((e: any) => e.notes?.startsWith('OTP_VERIFICATION_FAILED')).length;

        if (failedOtpCount >= 5) {
          throw new LogisticsDomainError('Maximum OTP verification attempts exceeded. Delivery locked for security.');
        }

        const salt = job.idempotencyKey || job.trackingReference || job.id;
        const isValid = verifyDeliveryOtp(params.otp, job.recipientOtp, salt);

        if (!isValid) {
          // Log failed attempt tracking event using db (outside tx) so it persists across transaction rollbacks
          await db.orm.public.DeliveryTrackingEvent.create({
            deliveryJobId: params.deliveryJobId,
            eventType: 'FAILED',
            providerId: params.providerId,
            driverProfileId: assignment.driverProfileId,
            notes: `OTP_VERIFICATION_FAILED: attempt ${failedOtpCount + 1}/5`,
            recordedAt: toTemporal(new Date()),
          });
          throw new LogisticsDomainError('Invalid recipient verification OTP');
        }
      }

      // 2. Create ProofOfDelivery
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

      // 3. State transition to DELIVERED and consume OTP atomically
      const updatedJob = await transitionDeliveryStatus(params.deliveryJobId, 'DELIVERED', params.providerId, tx);
      await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({ recipientOtp: null });

      // Complete the assignment so the driver is no longer locked on active assignment index
      if (assignment?.id) {
        await tx.orm.public.DeliveryAssignment.where({ id: assignment.id }).update({
          status: 'COMPLETED',
          completedAt: toTemporal(new Date()),
        });
      }

      // Transition driver back to ONLINE for subsequent dispatches
      if (assignment.driverProfileId) {
        await tx.orm.public.LogisticsDriverProfile.where({ id: assignment.driverProfileId }).update({
          status: 'ONLINE' as any,
        });
      }

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

// 7. Fail Delivery with Exception Reason
export async function failDelivery(params: {
  deliveryJobId: string;
  providerId: string;
  driverProfileId?: string;
  reason: string;
  notes?: string;
  idempotencyKey?: string;
}) {
  return await db.transaction(async (tx: any) => {
    const job = (await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');
    if (job.providerId !== params.providerId) throw new LogisticsDomainError('Provider mismatch');

    if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(job.status)) {
      throw new LogisticsDomainError(`Cannot fail delivery in terminal status ${job.status}`);
    }

    // Cancel active assignment
    const activeAssignments = await tx.orm.public.DeliveryAssignment.where({
      deliveryJobId: params.deliveryJobId,
      status: 'ACCEPTED',
    }).all();
    for (const a of activeAssignments) {
      await tx.orm.public.DeliveryAssignment.where({ id: a.id }).update({ status: 'CANCELLED' });
    }

    const updatedJob = await transitionDeliveryStatus(params.deliveryJobId, 'FAILED', params.providerId, tx, params.reason);

    if (params.driverProfileId) {
      await tx.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).update({
        status: 'ONLINE' as any,
      });
    }

    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: params.deliveryJobId,
      eventType: 'FAILED',
      providerId: params.providerId,
      driverProfileId: params.driverProfileId,
      notes: `Delivery issue: ${params.reason}. ${params.notes || ''}`.trim(),
      recordedAt: toTemporal(new Date()),
    });

    return { event, job: updatedJob };
  });
}

// 8. Cancel Delivery
export async function cancelDelivery(params: {
  deliveryJobId: string;
  providerId: string;
  reason?: string;
}) {
  return await db.transaction(async (tx: any) => {
    const job = (await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');
    if (job.providerId !== params.providerId) throw new LogisticsDomainError('Provider mismatch');

    if (['IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED', 'COMPLETED'].includes(job.status)) {
      throw new LogisticsDomainError(`Cannot cancel delivery once in transit or delivered (current status: ${job.status})`);
    }

    const assignments = await tx.orm.public.DeliveryAssignment.where({ deliveryJobId: params.deliveryJobId }).all();
    for (const a of assignments) {
      if (['PENDING', 'ACCEPTED'].includes(a.status)) {
        await tx.orm.public.DeliveryAssignment.where({ id: a.id }).update({ status: 'CANCELLED' });
      }
    }

    const dispatches = await tx.orm.public.DeliveryDispatch.where({ deliveryJobId: params.deliveryJobId }).all();
    for (const d of dispatches) {
      if (['PENDING', 'OFFERED'].includes(d.status)) {
        await tx.orm.public.DeliveryDispatch.where({ id: d.id }).update({ status: 'CANCELLED' });
      }
    }

    const updatedJob = await transitionDeliveryStatus(params.deliveryJobId, 'CANCELLED', params.providerId, tx, params.reason);

    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: params.deliveryJobId,
      eventType: 'CANCELLED',
      providerId: params.providerId,
      notes: params.reason || 'Delivery cancelled',
      recordedAt: toTemporal(new Date()),
    });

    return { event, job: updatedJob };
  });
}

// 9. Location Update (Telemetry)
export async function logLocation(params: {
  deliveryJobId: string;
  providerId: string;
  driverProfileId: string;
  latitude: number;
  longitude: number;
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
      if (existingEvent) return { event: existingEvent };
    }

    const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);
    
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
      notes: 'GPS Ping',
      recordedAt: toTemporal(new Date())
    });

    return { event };
  });
}

// 10. Tracking History
export async function getTrackingHistory(deliveryJobId: string, providerId: string) {
  const job = (await db.orm.public.DeliveryJob.where({ id: deliveryJobId }).all())[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');
  if (job.providerId !== providerId) throw new LogisticsDomainError('Provider mismatch');

  const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId }).all();
  events.sort((a: any, b: any) => Date.parse(String(a.recordedAt)) - Date.parse(String(b.recordedAt)));
  return events;
}

// 11. Delivery State Inspection
export async function getDeliveryState(deliveryJobId: string, providerId: string) {
  const job = (await db.orm.public.DeliveryJob.where({ id: deliveryJobId }).all())[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');
  if (job.providerId !== providerId) throw new LogisticsDomainError('Provider mismatch');

  const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId }).all();
  events.sort((a: any, b: any) => Date.parse(String(a.recordedAt)) - Date.parse(String(b.recordedAt)));
  const latestTrackingEvent = events.length > 0 ? events[events.length - 1] : null;

  return {
    job,
    currentStatus: job.status,
    latestTrackingEvent,
    trackingEvents: events,
  };
}
