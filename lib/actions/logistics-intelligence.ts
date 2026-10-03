import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';

// --- Part A: Observability & Logging ---
export function logLogisticsOperation(operation: string, details: Record<string, any>) {
  // Use structured JSON for CityOS observability systems.
  const structuredLog = {
    timestamp: new Date().toISOString(),
    component: 'LogisticsOS',
    operation,
    ...details
  };
  // In production, this would pipe to Datadog/CloudWatch etc.
  console.log(JSON.stringify(structuredLog));
}

// --- Part C & M: Stuck Delivery Detection ---
export interface StuckDeliveryCriteria {
  maxDispatchPendingMinutes?: number;
  maxAssignedMinutes?: number;
  maxAtPickupMinutes?: number;
  maxTransitMinutes?: number;
}

export async function findStuckDeliveries(criteria: StuckDeliveryCriteria = {}) {
  const defaults = {
    maxDispatchPendingMinutes: 15,
    maxAssignedMinutes: 30,
    maxAtPickupMinutes: 20,
    maxTransitMinutes: 120
  };
  const config = { ...defaults, ...criteria };

  const allDeliveries = await db.orm.public.DeliveryJob.all();
  const activeDeliveries = allDeliveries.filter((f: any) => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(f.status));

  const stuck = [];
  const now = new Date().getTime();

  for (const job of activeDeliveries) {
    // Determine last activity.
    let lastActivityTs = new Date((job as any).updatedAt || (job as any).createdAt).getTime();

    // Try to get latest tracking event
    const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id }).all();
    if (events.length > 0) {
      events.sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      lastActivityTs = new Date(events[0].recordedAt).getTime();
    }

    const elapsedMinutes = (now - lastActivityTs) / (1000 * 60);

    let isStuck = false;
    let reason = '';

    if (job.status === 'REQUESTED' || job.status === 'CREATED' || job.status === 'DISPATCHED') {
      if (elapsedMinutes > config.maxDispatchPendingMinutes) {
        isStuck = true;
        reason = `Exceeded max dispatch pending time (${config.maxDispatchPendingMinutes}m)`;
      }
    } else if (job.status === 'ASSIGNED') {
      if (elapsedMinutes > config.maxAssignedMinutes) {
        isStuck = true;
        reason = `Exceeded max assigned time without pickup (${config.maxAssignedMinutes}m)`;
      }
    } else if (job.status === 'AT_PICKUP') {
      if (elapsedMinutes > config.maxAtPickupMinutes) {
        isStuck = true;
        reason = `Exceeded max at pickup time (${config.maxAtPickupMinutes}m)`;
      }
    } else if (job.status === 'PICKED_UP' || job.status === 'IN_TRANSIT' || job.status === 'AT_DROPOFF') {
      if (elapsedMinutes > config.maxTransitMinutes) {
        isStuck = true;
        reason = `Exceeded max transit time (${config.maxTransitMinutes}m)`;
      }
    }

    if (isStuck) {
      stuck.push({
        deliveryId: job.id,
        providerId: job.providerId,
        currentStatus: job.status,
        lastActivityTimestamp: new Date(lastActivityTs).toISOString(),
        elapsedMinutes: Math.round(elapsedMinutes),
        reason
      });
    }
  }

  return stuck;
}

// --- Part F: Settlement Reconciliation ---
export async function reconcileLogisticsSettlements() {
  const discrepancies = [];

  // 1. All COMPLETED jobs should have a SETTLED settlement
  const completedJobs = await db.orm.public.DeliveryJob.where({ status: 'COMPLETED' }).all();
  for (const job of completedJobs) {
    const settlements = await db.orm.public.LogisticsSettlement.where({ deliveryJobId: job.id }).all();
    if (settlements.length === 0) {
      discrepancies.push({ type: 'MISSING_SETTLEMENT', deliveryJobId: job.id, message: 'Completed job has no settlement record.' });
    } else if (settlements.length > 1) {
      discrepancies.push({ type: 'DUPLICATE_SETTLEMENT', deliveryJobId: job.id, message: `Completed job has ${settlements.length} settlement records.` });
    } else {
      const s = settlements[0];
      if (s.status !== 'SETTLED') {
        discrepancies.push({ type: 'INCONSISTENT_SETTLEMENT_STATUS', deliveryJobId: job.id, message: `Settlement status is ${s.status}, expected SETTLED.` });
      }
      if (!s.transactionId) {
        discrepancies.push({ type: 'MISSING_TRANSACTION', deliveryJobId: job.id, message: 'Settlement has no transactionId.' });
      } else {
        // Verify ledger entries
        const ledgers = await db.orm.public.LedgerEntry.where({ transactionId: s.transactionId }).all();
        if (ledgers.length === 0) {
          discrepancies.push({ type: 'MISSING_LEDGER_ENTRY', deliveryJobId: job.id, transactionId: s.transactionId, message: 'Transaction has no ledger entries.' });
        } else {
          const expectedAmount = Number(s.providerAmount);
          const ledgerSum = ledgers.reduce((acc, l) => acc + Number(l.amount), 0);
          if (ledgerSum !== expectedAmount) {
            discrepancies.push({ type: 'AMOUNT_MISMATCH', deliveryJobId: job.id, transactionId: s.transactionId, message: `Ledger sum ${ledgerSum} does not match settlement providerAmount ${expectedAmount}.` });
          }
          // Validate Wallet Ownership
          const walletIds = [...new Set(ledgers.map(l => l.walletId))];
          for (const wid of walletIds) {
            const wallets = await db.orm.public.Wallet.where({ id: wid }).all();
            if (wallets.length > 0 && wallets[0].organizationId !== s.providerId) {
              discrepancies.push({ type: 'WRONG_WALLET_PROVIDER', deliveryJobId: job.id, transactionId: s.transactionId, message: `Ledger credited wallet ${wid} belonging to ${wallets[0].organizationId}, but provider is ${s.providerId}.` });
            }
          }
        }
      }
    }
  }

  return discrepancies;
}

// --- Part N: Provider Performance Intelligence ---
export async function getProviderDeliveryOverview(providerId: string) {
  const jobs = await db.orm.public.DeliveryJob.where({ providerId }).all();
  
  let totalDeliveries = 0;
  let completedDeliveries = 0;
  let cancelledDeliveries = 0;
  let totalTimeMs = 0;

  for (const job of jobs) {
    totalDeliveries++;
    if (job.status === 'COMPLETED' || job.status === 'DELIVERED') {
      completedDeliveries++;
      // Determine delivery duration
      const createdAt = new Date((job as any).createdAt).getTime();
      const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id }).all();
      const dropoffEvents = events.filter(e => e.eventType === 'DROPOFF_CONFIRMED');
      if (dropoffEvents.length > 0) {
        dropoffEvents.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
        const dropoffTime = new Date(dropoffEvents[0].recordedAt).getTime();
        totalTimeMs += (dropoffTime - createdAt);
      }
    }
    if (job.status === 'CANCELLED') {
      cancelledDeliveries++;
    }
  }

  const completionRate = totalDeliveries > 0 ? completedDeliveries / totalDeliveries : 0;
  const failureRate = totalDeliveries > 0 ? cancelledDeliveries / totalDeliveries : 0;
  const averageDeliveryTimeMinutes = completedDeliveries > 0 ? (totalTimeMs / completedDeliveries) / (1000 * 60) : 0;

  // Dispatches
  const dispatches = await db.orm.public.DeliveryDispatch.where({ providerId }).all();
  const totalDispatches = dispatches.length;
  const acceptedDispatches = dispatches.filter(d => d.status === 'ACCEPTED').length;
  const rejectedDispatches = dispatches.filter(d => d.status === 'REJECTED').length;
  const expiredDispatches = dispatches.filter(d => d.status === 'EXPIRED').length;
  
  const dispatchAcceptanceRate = totalDispatches > 0 ? acceptedDispatches / totalDispatches : 0;

  return {
    providerId,
    deliveries: {
      total: totalDeliveries,
      completed: completedDeliveries,
      cancelled: cancelledDeliveries,
      completionRate,
      failureRate,
      averageDeliveryTimeMinutes: Math.round(averageDeliveryTimeMinutes)
    },
    dispatches: {
      total: totalDispatches,
      accepted: acceptedDispatches,
      rejected: rejectedDispatches,
      expired: expiredDispatches,
      acceptanceRate: dispatchAcceptanceRate
    }
  };
}

// --- Part Q: Health Checks ---
export async function getLogisticsHealthCheck() {
  const status = {
    databaseConnected: false,
    schemaAccessible: false,
    activeProvidersExist: false,
    overallHealth: 'UNHEALTHY',
    timestamp: new Date().toISOString()
  };

  try {
    const orgs = await db.orm.public.Organization.where({ type: 'LOGISTICS' as any }).all();
    status.databaseConnected = true;
    status.schemaAccessible = true;
    if (orgs.some(o => o.status === 'ACTIVE')) {
      status.activeProvidersExist = true;
    }
    if (status.databaseConnected && status.schemaAccessible) {
      status.overallHealth = 'HEALTHY';
    }
  } catch (error) {
    status.overallHealth = 'UNHEALTHY';
  }

  return status;
}
