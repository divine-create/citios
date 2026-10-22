'use server';

import { db } from '@/src/prisma/db';
import { requireMembership } from '@/lib/actions/tenant';
import { revalidatePath } from 'next/cache';

/**
 * Inspect whether a business can be deleted immediately (Tier 1: Zero-activity purge)
 * or must be safely closed and archived (Tier 2: Preserves accounting, receipts, and order histories).
 */
export async function getBusinessClosureEligibility(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER']);

    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    if (!org) {
      return { error: 'Organization not found.' };
    }

    // 1. Financial Activity & Wallet
    const wallet = await db.orm.public.Wallet.where({ organizationId }).all().first();
    const walletBalance = wallet?.balance ?? 0;
    const ledgerEntries = wallet
      ? await db.orm.public.LedgerEntry.where({ walletId: wallet.id }).all()
      : [];
    const ledgerCount = ledgerEntries.length;

    const payouts = await db.orm.public.Payout.where({ organizationId }).all();
    const payoutsCount = payouts.length;

    const refunds = await db.orm.public.RefundRequest.where({ organizationId }).all();
    const pendingRefundsCount = refunds.filter((r) => r.status === 'PENDING').length;

    // 2. Orders & Operations across verticals
    const [retailOrders, restaurantOrders, reservations, deliveryJobs, serviceJobs] = await Promise.all([
      db.orm.public.RetailOrder.where({ organizationId }).all(),
      db.orm.public.RestaurantOrder.where({ organizationId }).all(),
      db.orm.public.Reservation.where({ organizationId }).all(),
      db.orm.public.DeliveryJob.where({ providerId: organizationId }).all(),
      db.orm.public.ServiceJob.where({ organizationId }).all(),
    ]);

    const activeRetailOrders = retailOrders.filter((o) =>
      ['PENDING'].includes(o.status)
    ).length;
    const activeRestaurantOrders = restaurantOrders.filter((o) =>
      ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
    ).length;
    const activeReservations = reservations.filter((r) =>
      ['CONFIRMED', 'CHECKED_IN'].includes(r.status)
    ).length;
    const activeDeliveryJobs = deliveryJobs.filter((d) =>
      ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
    ).length;
    const activeServiceJobs = serviceJobs.filter((s) =>
      ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(s.status)
    ).length;

    const totalOrdersCount =
      retailOrders.length + restaurantOrders.length + reservations.length + deliveryJobs.length + serviceJobs.length;
    const activeOrdersCount =
      activeRetailOrders + activeRestaurantOrders + activeReservations + activeDeliveryJobs + activeServiceJobs;

    // Determine activity:
    const hasActivity = totalOrdersCount > 0 || ledgerCount > 0 || payoutsCount > 0 || refunds.length > 0;
    const tier: 'PURGE' | 'ARCHIVE' = hasActivity ? 'ARCHIVE' : 'PURGE';

    const reasons: string[] = [];
    if (org.status === 'SUSPENDED') {
      reasons.push('This organization is currently suspended by the platform.');
    }

    if (tier === 'ARCHIVE') {
      if (Math.abs(walletBalance) > 0.001) {
        reasons.push(
          `Wallet has a remaining balance of ₦${walletBalance.toLocaleString()}. Please withdraw or settle funds before closing.`
        );
      }
      if (activeOrdersCount > 0) {
        reasons.push(
          `There are ${activeOrdersCount} unfulfilled or active order(s)/booking(s). Please complete or cancel them first.`
        );
      }
      if (pendingRefundsCount > 0) {
        reasons.push(
          `There are ${pendingRefundsCount} pending refund request(s). Please resolve them before closing.`
        );
      }
    }

    const eligible = reasons.length === 0 && org.status !== 'CLOSED' && org.status !== 'ARCHIVED';

    return {
      success: true,
      organizationId,
      name: org.name,
      type: org.type,
      status: org.status,
      tier,
      hasActivity,
      eligible,
      reasons,
      metrics: {
        walletBalance,
        ledgerCount,
        totalOrdersCount,
        activeOrdersCount,
        pendingRefundsCount,
        payoutsCount,
      },
    };
  } catch (error: any) {
    console.error('Error checking business closure eligibility:', error);
    return { error: error?.message || 'Failed to inspect business closure eligibility.' };
  }
}

/**
 * Execute Tier 1 (Permanent Purge) or Tier 2 (Safe Closure & Archival)
 */
export async function closeOrDeleteOrganization(organizationId: string) {
  try {
    const { person } = await requireMembership(organizationId, ['OWNER']);

    return await db.transaction(async (tx: any) => {
      // Row lock the Organization record
      await tx.execute(
        db.raw.sql`SELECT id FROM "organization" WHERE id = ${organizationId} FOR UPDATE`.affectedCount().build()
      );

      const org = await tx.orm.public.Organization.where({ id: organizationId }).all().first();
      if (!org) {
        return { error: 'Organization not found.' };
      }

      if (org.status === 'SUSPENDED') {
        return { error: 'Cannot close or delete an organization suspended by platform administration.' };
      }

      // Check financial activity & ledger
      const wallet = await tx.orm.public.Wallet.where({ organizationId }).all().first();
      const walletBalance = wallet?.balance ?? 0;
      const ledgerEntries = wallet
        ? await tx.orm.public.LedgerEntry.where({ walletId: wallet.id }).all()
        : [];
      const ledgerCount = ledgerEntries.length;

      const payouts = await tx.orm.public.Payout.where({ organizationId }).all();
      const payoutsCount = payouts.length;

      const refunds = await tx.orm.public.RefundRequest.where({ organizationId }).all();
      const pendingRefundsCount = refunds.filter((r: any) => r.status === 'PENDING').length;

      // Check orders across verticals
      const [retailOrders, restaurantOrders, reservations, deliveryJobs, serviceJobs] = await Promise.all([
        tx.orm.public.RetailOrder.where({ organizationId }).all(),
        tx.orm.public.RestaurantOrder.where({ organizationId }).all(),
        tx.orm.public.Reservation.where({ organizationId }).all(),
        tx.orm.public.DeliveryJob.where({ providerId: organizationId }).all(),
        tx.orm.public.ServiceJob.where({ organizationId }).all(),
      ]);

      const activeRetailOrders = retailOrders.filter((o: any) =>
        ['PENDING'].includes(o.status)
      ).length;
      const activeRestaurantOrders = restaurantOrders.filter((o: any) =>
        ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
      ).length;
      const activeReservations = reservations.filter((r: any) =>
        ['CONFIRMED', 'CHECKED_IN'].includes(r.status)
      ).length;
      const activeDeliveryJobs = deliveryJobs.filter((d: any) =>
        ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
      ).length;
      const activeServiceJobs = serviceJobs.filter((s: any) =>
        ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(s.status)
      ).length;

      const totalOrdersCount =
        retailOrders.length + restaurantOrders.length + reservations.length + deliveryJobs.length + serviceJobs.length;
      const activeOrdersCount =
        activeRetailOrders + activeRestaurantOrders + activeReservations + activeDeliveryJobs + activeServiceJobs;

      const hasActivity = totalOrdersCount > 0 || ledgerCount > 0 || payoutsCount > 0 || refunds.length > 0;

      // =========================================================================
      // TIER 1: FAST PURGE (0 Activity, Zero Orders, Zero Transactions)
      // =========================================================================
      if (!hasActivity) {
        // 1. Delete Discovery Listings
        await tx.orm.public.DiscoveryListing.where({ organizationId }).delete();

        // 2. Delete Microsites & Pages
        const microsites = await tx.orm.public.Microsite.where({ organizationId }).all();
        for (const ms of microsites) {
          await tx.orm.public.MicrositeSection.where({ micrositeId: ms.id }).delete();
          await tx.orm.public.MicrositePage.where({ micrositeId: ms.id }).delete();
          await tx.orm.public.Microsite.where({ id: ms.id }).delete();
        }

        // 3. Delete Memberships, Roles, and Location bindings
        const memberships = await tx.orm.public.Membership.where({ organizationId }).all();
        for (const m of memberships) {
          await tx.orm.public.MembershipRole.where({ membershipId: m.id }).delete();
          await tx.orm.public.MembershipLocation.where({ membershipId: m.id }).delete();
          await tx.orm.public.Membership.where({ id: m.id }).delete();
        }

        // 4. Delete Locations
        await tx.orm.public.Location.where({ organizationId }).delete();

        // 5. Delete Organization Wallet (crucial: Wallet has onDelete: Restrict)
        if (wallet) {
          await tx.orm.public.Wallet.where({ id: wallet.id }).delete();
        }

        // 6. Delete Organization (cascades remaining settings: RetailSettings, RestaurantSettings, etc.)
        await tx.orm.public.Organization.where({ id: organizationId }).delete();

        try {
          revalidatePath('/business');
          revalidatePath('/explore');
        } catch {}

        return {
          success: true,
          action: 'PURGED',
          message: `"${org.name}" had no order or ledger history and has been permanently deleted.`,
        };
      }

      // =========================================================================
      // TIER 2: SAFE CLOSURE & ARCHIVAL (Preserves receipts, ledgers & audit trails)
      // =========================================================================
      if (Math.abs(walletBalance) > 0.001) {
        return {
          error: `Cannot close business with remaining wallet balance of ₦${walletBalance.toLocaleString()}. Please withdraw or settle funds first.`,
        };
      }

      if (activeOrdersCount > 0) {
        return {
          error: `Cannot close business with ${activeOrdersCount} unfulfilled or active order(s). Please complete or cancel them first.`,
        };
      }

      if (pendingRefundsCount > 0) {
        return {
          error: `Cannot close business with ${pendingRefundsCount} pending refund request(s). Please resolve them first.`,
        };
      }

      // Transition to CLOSED
      await tx.orm.public.Organization.where({ id: organizationId }).update({ status: 'CLOSED' });

      // Delist from Explore and City Marketplace
      await tx.orm.public.DiscoveryListing.where({ organizationId }).update({ isActive: false });

      // Unpublish microsite
      const microsite = await tx.orm.public.Microsite.where({ organizationId }).all().first();
      if (microsite) {
        await tx.orm.public.Microsite.where({ id: microsite.id }).update({ isPublished: false });
      }

      // Record HQ Audit event
      await tx.orm.public.HQAuditEvent.create({
        actorPersonId: person.id,
        action: 'ORGANIZATION_CLOSED',
        targetType: 'Organization',
        targetId: organizationId,
        metadata: {
          previousStatus: org.status,
          totalOrdersCount,
          closedBy: person.id,
        },
      });

      try {
        revalidatePath('/business');
        revalidatePath('/explore');
      } catch {}

      return {
        success: true,
        action: 'CLOSED',
        message: `"${org.name}" has been safely closed and archived. Public listings are hidden and past accounting is preserved.`,
      };
    });
  } catch (error: any) {
    console.error('Error closing or deleting organization:', error);
    return { error: error?.message || 'Failed to close or delete organization.' };
  }
}

/**
 * Reopen a closed or archived organization
 */
export async function reopenOrganization(organizationId: string) {
  try {
    const { person } = await requireMembership(organizationId, ['OWNER']);

    return await db.transaction(async (tx: any) => {
      await tx.execute(
        db.raw.sql`SELECT id FROM "organization" WHERE id = ${organizationId} FOR UPDATE`.affectedCount().build()
      );

      const org = await tx.orm.public.Organization.where({ id: organizationId }).all().first();
      if (!org) {
        return { error: 'Organization not found.' };
      }

      if (org.status === 'SUSPENDED') {
        return {
          error: 'Cannot reopen a suspended organization. Please contact platform administration.',
        };
      }

      if (org.status === 'ACTIVE') {
        return { error: 'Organization is already active.' };
      }

      // Set status back to ACTIVE
      await tx.orm.public.Organization.where({ id: organizationId }).update({ status: 'ACTIVE' });

      // Reactivate public listings
      await tx.orm.public.DiscoveryListing.where({ organizationId }).update({ isActive: true });

      // Record HQ Audit event
      await tx.orm.public.HQAuditEvent.create({
        actorPersonId: person.id,
        action: 'ORGANIZATION_REOPENED',
        targetType: 'Organization',
        targetId: organizationId,
        metadata: {
          previousStatus: org.status,
          reopenedBy: person.id,
        },
      });

      try {
        revalidatePath('/business');
        revalidatePath('/explore');
      } catch {}

      return {
        success: true,
        message: `"${org.name}" has been reopened and is live again.`,
      };
    });
  } catch (error: any) {
    console.error('Error reopening organization:', error);
    return { error: error?.message || 'Failed to reopen organization.' };
  }
}
