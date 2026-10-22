'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LogisticsDomainError } from './logistics-domain';
import { dispatchNetworkJob } from './logistics-dispatch';
import {
  type NetworkDispatchPolicy,
  getNetworkDispatchPolicy,
  getCityOSFleetOrgIds,
  isCityOSPlatformFleet,
} from './logistics-policy';
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
 * Validates that the caller is an authenticated operations staff member or system administrator.
 * In CITYOS_ONLY mode, non-admin operators must belong to an explicitly authorized CityOS platform fleet.
 */
export async function requireOperationsStaff(targetProviderId?: string | null) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session?.user?.personId) {
    throw new LogisticsDomainError('UNAUTHENTICATED: Active session required for operations actions.');
  }

  const fleetIds = getCityOSFleetOrgIds();

  // 1. System administrators have global operations authorization
  if (session.user.isSystemAdmin) {
    return {
      session,
      isSystemAdmin: true,
      attributionOrgId: targetProviderId || fleetIds[0] || null,
      authorizedOrgIds: fleetIds,
    };
  }

  // 2. Validate active account
  const account = await db.orm.public.Account.where({ personId: session.user.personId }).all().first();
  if (!account || !account.isActive) {
    throw new LogisticsDomainError('FORBIDDEN: User account is deactivated or suspended.');
  }

  // 3. Query memberships with organization details
  const memberships = await db.orm.public.Membership
    .where({ personId: session.user.personId })
    .include('organization')
    .all();

  const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER'];

  // Filter to active organizations
  const activeMemberships = memberships.filter(
    (m: any) => m.organization && m.organization.status !== 'SUSPENDED'
  );

  if (activeMemberships.length === 0) {
    throw new LogisticsDomainError('FORBIDDEN: No active organization memberships found.');
  }

  const policy = getNetworkDispatchPolicy();
  let candidateMemberships = activeMemberships;

  // In CITYOS_ONLY mode, non-admin operations are strictly restricted to authorized platform fleet organizations.
  // Missing or empty fleet allowlist fails closed.
  if (policy === 'CITYOS_ONLY') {
    candidateMemberships = candidateMemberships.filter((m: any) => fleetIds.includes(m.organizationId));
  }

  // If a specific target provider is requested, ensure membership matches
  if (targetProviderId) {
    candidateMemberships = candidateMemberships.filter((m: any) => m.organizationId === targetProviderId);
  }

  if (candidateMemberships.length === 0) {
    throw new LogisticsDomainError(
      'FORBIDDEN: Caller is not authorized for operations on this organization or network fleet.'
    );
  }

  // 4. Verify roles for eligible memberships
  const candidateIds = candidateMemberships.map((m: any) => m.id);
  const roles = await db.orm.public.MembershipRole.all();
  const userRoles = roles
    .filter((r: any) => candidateIds.includes(r.membershipId))
    .map((r: any) => r.role);

  const hasAuthorizedRole = userRoles.some((role: string) => allowedRoles.includes(role));
  if (!hasAuthorizedRole) {
    throw new LogisticsDomainError(
      `FORBIDDEN: Operations action requires one of the following roles: ${allowedRoles.join(', ')}`
    );
  }

  const authorizedOrgIds = candidateMemberships.map((m: any) => m.organizationId);

  return {
    session,
    isSystemAdmin: false,
    attributionOrgId: candidateMemberships[0].organizationId,
    authorizedOrgIds,
  };
}

/**
 * Resolves a valid Organization ID for DeliveryTrackingEvent foreign key constraints.
 * Falls back to the first active platform fleet or active logistics provider in the database.
 * NEVER returns fabricated string identifiers.
 */
async function resolveTrackingProviderId(
  explicitProviderId: string | null | undefined,
  attributionOrgId: string | null | undefined
): Promise<string> {
  if (explicitProviderId) return explicitProviderId;
  if (attributionOrgId) return attributionOrgId;

  const fleetIds = getCityOSFleetOrgIds();
  for (const fid of fleetIds) {
    const org = await db.orm.public.Organization.where({ id: fid, status: 'ACTIVE' as any }).first();
    if (org) return org.id;
  }

  const fallback = await db.orm.public.Organization.where({
    type: 'LOGISTICS' as any,
    status: 'ACTIVE' as any,
  }).first();

  if (fallback) return fallback.id;
  throw new LogisticsDomainError('No active logistics organization found for audit attribution.');
}

/**
 * Retrieves deliveries that have exhausted dispatch or have no eligible rider,
 * enabling operations staff to monitor the fleet dispatch backlog.
 * Gated by operations authentication and authorization.
 */
export async function getExhaustedDeliveries(params: {
  providerId?: string;
} = {}): Promise<ExhaustedDeliveryItem[]> {
  const auth = await requireOperationsStaff(params.providerId);
  const targetOrgIds = params.providerId
    ? new Set([params.providerId])
    : (!auth.isSystemAdmin ? new Set(auth.authorizedOrgIds) : null);

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
    if (targetOrgIds && (!job.providerId || !targetOrgIds.has(job.providerId))) {
      continue;
    }
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
 * Redacts recipient OTPs and plain credentials to prevent sensitive information exposure.
 */
export async function getDeliveryDispatchAudit(
  deliveryJobId: string
): Promise<DeliveryDispatchAuditReport> {
  // Authorize operations access before querying protected delivery records
  const auth = await requireOperationsStaff();

  const jobs = await db.orm.public.DeliveryJob.where({ id: deliveryJobId }).all();
  const job = jobs[0];
  if (!job) throw new LogisticsDomainError(`DeliveryJob ${deliveryJobId} not found.`);

  if (!auth.isSystemAdmin) {
    if (job.providerId) {
      if (!auth.authorizedOrgIds.includes(job.providerId)) {
        throw new LogisticsDomainError('FORBIDDEN: Caller is not authorized for operations on this provider.');
      }
    } else {
      const policy = getNetworkDispatchPolicy();
      const hasPlatformFleet = auth.authorizedOrgIds.some((id: string) => isCityOSPlatformFleet(id));
      if (policy === 'CITYOS_ONLY' && !hasPlatformFleet) {
        throw new LogisticsDomainError('FORBIDDEN: Caller is not authorized for operations on unassigned network deliveries.');
      }
    }
  }

  const [dispatches, assignments, trackingEvents] = await Promise.all([
    db.orm.public.DeliveryDispatch.where({ deliveryJobId }).all(),
    db.orm.public.DeliveryAssignment.where({ deliveryJobId }).all(),
    db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId }).all(),
  ]);

  dispatches.sort((a: any, b: any) => (a.attempt || 0) - (b.attempt || 0));
  trackingEvents.sort((a: any, b: any) => Date.parse(String(a.recordedAt)) - Date.parse(String(b.recordedAt)));

  const activeAssignment = assignments.find((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status)) || null;

  const failureEvent = trackingEvents
    .slice()
    .reverse()
    .find((e: any) => e.eventType === 'FAILED' || e.notes?.toLowerCase().includes('exhausted'));

  // Sanitize dispatches and assignments (strip credentials, internal tokens)
  const sanitizedDispatches = dispatches.map((d: any) => ({
    id: d.id,
    attempt: d.attempt,
    status: d.status,
    driverProfileId: d.driverProfileId,
    vehicleId: d.vehicleId,
    expiresAt: d.expiresAt,
    acceptedAt: d.acceptedAt,
    rejectedAt: d.rejectedAt,
    failureReason: d.failureReason,
    createdAt: d.createdAt,
  }));

  const sanitizedAssignments = assignments.map((a: any) => ({
    id: a.id,
    driverProfileId: a.driverProfileId,
    vehicleId: a.vehicleId,
    status: a.status,
    assignedAt: a.assignedAt,
    respondedAt: a.respondedAt,
    completedAt: a.completedAt,
  }));

  return {
    deliveryJobId: job.id,
    currentStatus: job.status,
    providerId: job.providerId,
    totalAttempts: dispatches.length,
    activeAssignment,
    assignments: sanitizedAssignments,
    dispatches: sanitizedDispatches,
    trackingEvents,
    rootCause: failureEvent?.notes || job.failureReason || null,
  };
}

/**
 * Safely re-attempts dispatch for an unassigned or exhausted delivery job.
 * Enforces operations authorization and ensures no active assignment exists before re-evaluating eligible riders.
 */
export async function reattemptDispatch(params: {
  deliveryJobId: string;
  acceptanceWindowSeconds?: number;
  operatorNotes?: string;
}) {
  // Authorize operations access before querying protected delivery records
  const auth = await requireOperationsStaff();

  const jobs = await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
  const job = jobs[0];
  if (!job) throw new LogisticsDomainError(`DeliveryJob ${params.deliveryJobId} not found.`);

  if (!auth.isSystemAdmin) {
    if (job.providerId) {
      if (!auth.authorizedOrgIds.includes(job.providerId)) {
        throw new LogisticsDomainError('FORBIDDEN: Caller is not authorized for operations on this provider.');
      }
    } else {
      const policy = getNetworkDispatchPolicy();
      const hasPlatformFleet = auth.authorizedOrgIds.some((id: string) => isCityOSPlatformFleet(id));
      if (policy === 'CITYOS_ONLY' && !hasPlatformFleet) {
        throw new LogisticsDomainError('FORBIDDEN: Caller is not authorized for operations on unassigned network deliveries.');
      }
    }
  }

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

  // Resolve valid foreign-key providerId for tracking event
  const trackingProviderId = await resolveTrackingProviderId(job.providerId, auth.attributionOrgId);

  // Record operations audit event
  await db.orm.public.DeliveryTrackingEvent.create({
    deliveryJobId: params.deliveryJobId,
    eventType: 'DISPATCHED',
    providerId: trackingProviderId,
    notes: `Operations staff initiated dispatch reattempt. ${params.operatorNotes || ''}`.trim(),
    recordedAt: toTemporal(new Date()),
  });

  return await dispatchNetworkJob({
    deliveryJobId: params.deliveryJobId,
    providerId: job.providerId || undefined,
    acceptanceWindowSeconds: params.acceptanceWindowSeconds || 60,
  });
}

/**
 * Escalates a failed or exhausted delivery to operations supervisors,
 * updating status and recording immutable tracking event.
 * Enforces operations authorization and valid foreign key attributions.
 */
export async function escalateDeliveryIssue(params: {
  deliveryJobId: string;
  reason: string;
  notes?: string;
}) {
  if (!params.reason) {
    throw new LogisticsDomainError('Escalation reason is required.');
  }

  // Authorize operations access before transaction
  const auth = await requireOperationsStaff();

  return await db.transaction(async (tx: any) => {
    const jobs = await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
    const job = jobs[0];
    if (!job) throw new LogisticsDomainError(`DeliveryJob ${params.deliveryJobId} not found.`);

    if (!auth.isSystemAdmin) {
      if (job.providerId) {
        if (!auth.authorizedOrgIds.includes(job.providerId)) {
          throw new LogisticsDomainError('FORBIDDEN: Caller is not authorized for operations on this provider.');
        }
      } else {
        const policy = getNetworkDispatchPolicy();
        const hasPlatformFleet = auth.authorizedOrgIds.some((id: string) => isCityOSPlatformFleet(id));
        if (policy === 'CITYOS_ONLY' && !hasPlatformFleet) {
          throw new LogisticsDomainError('FORBIDDEN: Caller is not authorized for operations on unassigned network deliveries.');
        }
      }
    }

    if (['DELIVERED', 'COMPLETED'].includes(job.status)) {
      throw new LogisticsDomainError(`Cannot escalate completed delivery ${job.id}`);
    }

    await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({
      status: 'FAILED',
      failureReason: `ESCALATED: ${params.reason}`,
      updatedAt: toTemporal(new Date()),
    });

    const trackingProviderId = await resolveTrackingProviderId(job.providerId, auth.attributionOrgId);

    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      deliveryJobId: params.deliveryJobId,
      eventType: 'FAILED',
      providerId: trackingProviderId,
      notes: `[OPERATIONS ESCALATION] ${params.reason}. ${params.notes || ''}`.trim(),
      recordedAt: toTemporal(new Date()),
    });

    return { success: true, deliveryJobId: job.id, status: 'FAILED', event };
  });
}
