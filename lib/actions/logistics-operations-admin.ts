import { db } from '@/src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';
import { dispatchNetworkJob } from './logistics-dispatch';
import { type NetworkDispatchPolicy, getNetworkDispatchPolicy } from './logistics-policy';
import '@js-temporal/polyfill';

function toTemporal(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export interface ExhaustedDeliveryItem {
  id: string;
  trackingReference: string | null;
  status: string;
  providerId: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  packageWeightKg: number | null;
  serviceLevel: string | null;
  createdAt: string;
  updatedAt: string;
  dispatchAttempts: number;
  lastDispatchStatus: string | null;
  exhaustionReason: string | null;
}

export interface DeliveryDispatchAuditReport {
  deliveryJobId: string;
  currentStatus: string;
  providerId: string | null;
  totalAttempts: number;
  activeAssignment: any | null;
  assignments: any[];
  dispatches: any[];
  trackingEvents: any[];
  rootCause: string | null;
}

/**
 * Retrieves deliveries that have exhausted dispatch or have no eligible rider,
 * enabling operations staff to monitor the fleet dispatch backlog.
 */
export async function getExhaustedDeliveries(params: {
  providerId?: string;
} = {}): Promise<ExhaustedDeliveryItem[]> {
  const allJobs = await db.orm.public.DeliveryJob.all();
  const allDispatches = await db.orm.public.DeliveryDispatch.all();
  const allAssignments = await db.orm.public.DeliveryAssignment.all();
  const allTracking = await db.orm.public.DeliveryTrackingEvent.all();

  const activeAssignedJobIds = new Set(
    allAssignments
      .filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status))
      .map((a: any) => a.deliveryJobId)
  );

  const dispatchesByJob = new Map<string, any[]>();
  for (const d of allDispatches) {
    if (!dispatchesByJob.has(d.deliveryJobId)) dispatchesByJob.set(d.deliveryJobId, []);
    dispatchesByJob.get(d.deliveryJobId)!.push(d);
  }

  const trackingByJob = new Map<string, any[]>();
  for (const t of allTracking) {
    if (!trackingByJob.has(t.deliveryJobId)) trackingByJob.set(t.deliveryJobId, []);
    trackingByJob.get(t.deliveryJobId)!.push(t);
  }

  const exhaustedList: ExhaustedDeliveryItem[] = [];

  for (const job of allJobs) {
    if (params.providerId && job.providerId !== params.providerId) continue;
    if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(job.status)) continue;
    if (activeAssignedJobIds.has(job.id)) continue;

    const dispatches = dispatchesByJob.get(job.id) || [];
    dispatches.sort((a, b) => (b.attempt || 0) - (a.attempt || 0));
    const lastDispatch = dispatches[0];

    const tracking = trackingByJob.get(job.id) || [];
    tracking.sort((a, b) => Date.parse(String(b.recordedAt)) - Date.parse(String(a.recordedAt)));
    const exhaustionEvent = tracking.find(
      (e: any) =>
        e.notes?.toLowerCase().includes('exhausted') ||
        e.notes?.toLowerCase().includes('no eligible') ||
        e.notes?.toLowerCase().includes('operations intervention')
    );

    // If job has been dispatched or attempted without assignment, or explicitly marked exhausted
    const isExhausted =
      job.status === 'DISPATCHED' &&
      (!lastDispatch || ['REJECTED', 'EXPIRED', 'FAILED'].includes(lastDispatch.status));

    if (isExhausted || exhaustionEvent) {
      exhaustedList.push({
        id: job.id,
        trackingReference: job.trackingReference,
        status: job.status,
        providerId: job.providerId,
        pickupAddress: job.pickupAddress,
        dropoffAddress: job.dropoffAddress,
        packageWeightKg: job.packageWeightKg,
        serviceLevel: job.serviceLevel,
        createdAt: String(job.createdAt),
        updatedAt: String(job.updatedAt),
        dispatchAttempts: dispatches.length,
        lastDispatchStatus: lastDispatch?.status || null,
        exhaustionReason: exhaustionEvent?.notes || lastDispatch?.failureReason || 'Dispatch attempts exhausted',
      });
    }
  }

  return exhaustedList;
}

/**
 * Provides comprehensive audit history of a delivery's dispatch attempts,
 * tracking events, and assignments to identify root cause of failure.
 */
export async function getDeliveryDispatchAudit(
  deliveryJobId: string
): Promise<DeliveryDispatchAuditReport> {
  const [jobs, dispatches, assignments, trackingEvents] = await Promise.all([
    db.orm.public.DeliveryJob.where({ id: deliveryJobId }).all(),
    db.orm.public.DeliveryDispatch.where({ deliveryJobId }).all(),
    db.orm.public.DeliveryAssignment.where({ deliveryJobId }).all(),
    db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId }).all(),
  ]);

  const job = jobs[0];
  if (!job) throw new LogisticsDomainError(`DeliveryJob ${deliveryJobId} not found.`);

  dispatches.sort((a: any, b: any) => (a.attempt || 0) - (b.attempt || 0));
  trackingEvents.sort((a: any, b: any) => Date.parse(String(a.recordedAt)) - Date.parse(String(b.recordedAt)));

  const activeAssignment = assignments.find((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)) || null;

  const failureEvent = trackingEvents
    .slice()
    .reverse()
    .find((e: any) => e.eventType === 'FAILED' || e.notes?.toLowerCase().includes('exhausted'));

  return {
    deliveryJobId: job.id,
    currentStatus: job.status,
    providerId: job.providerId,
    totalAttempts: dispatches.length,
    activeAssignment,
    assignments,
    dispatches,
    trackingEvents,
    rootCause: failureEvent?.notes || job.failureReason || null,
  };
}

/**
 * Safely re-attempts dispatch for an unassigned or exhausted delivery job.
 * Enforces that no active assignment exists before re-evaluating eligible riders.
 */
export async function reattemptDispatch(params: {
  deliveryJobId: string;
  acceptanceWindowSeconds?: number;
  policy?: NetworkDispatchPolicy;
  operatorNotes?: string;
}) {
  const jobs = await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
  const job = jobs[0];
  if (!job) throw new LogisticsDomainError(`DeliveryJob ${params.deliveryJobId} not found.`);

  if (['ASSIGNED', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(job.status)) {
    throw new LogisticsDomainError(`Cannot reattempt dispatch for delivery in status ${job.status}`);
  }

  const assignments = await db.orm.public.DeliveryAssignment
    .where({ deliveryJobId: params.deliveryJobId })
    .all();
  const activeAssignment = assignments.find((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));
  if (activeAssignment) {
    throw new LogisticsDomainError('Cannot reattempt dispatch: Job already has an active assignment.');
  }

  // Record operations audit event
  await db.orm.public.DeliveryTrackingEvent.create({
    deliveryJobId: params.deliveryJobId,
    eventType: 'DISPATCHED',
    providerId: job.providerId || 'OPERATIONS',
    notes: `Operations staff initiated dispatch reattempt. ${params.operatorNotes || ''}`.trim(),
    recordedAt: toTemporal(new Date()),
  });

  return await dispatchNetworkJob({
    deliveryJobId: params.deliveryJobId,
    providerId: job.providerId || undefined,
    acceptanceWindowSeconds: params.acceptanceWindowSeconds || 60,
    policy: params.policy || getNetworkDispatchPolicy(),
  });
}

/**
 * Escalates a failed or exhausted delivery to operations supervisors,
 * updating status and recording immutable tracking event.
 */
export async function escalateDeliveryIssue(params: {
  deliveryJobId: string;
  reason: string;
  notes?: string;
  authorizedPersonId?: string;
}) {
  if (!params.reason) {
    throw new LogisticsDomainError('Escalation reason is required.');
  }

  return await db.transaction(async (tx: any) => {
    const jobs = await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
    const job = jobs[0];
    if (!job) throw new LogisticsDomainError(`DeliveryJob ${params.deliveryJobId} not found.`);

    if (['DELIVERED', 'COMPLETED'].includes(job.status)) {
      throw new LogisticsDomainError(`Cannot escalate completed delivery ${job.id}`);
    }

    await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({
      status: 'FAILED',
      failureReason: `ESCALATED: ${params.reason}`,
      updatedAt: toTemporal(new Date()),
    });

    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: params.deliveryJobId,
      eventType: 'FAILED',
      providerId: job.providerId || 'OPERATIONS',
      notes: `[OPERATIONS ESCALATION] ${params.reason}. ${params.notes || ''}`.trim(),
      recordedAt: toTemporal(new Date()),
    });

    return { success: true, deliveryJobId: job.id, status: 'FAILED', event };
  });
}
