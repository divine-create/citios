'use server';

import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function suspendOrganization(organizationId: string) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || 'system';

  try {
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    if (!org) return { error: 'Organization not found' };

    await db.transaction(async (tx) => {
      await tx.orm.public.Organization.where({ id: organizationId }).update({ status: 'SUSPENDED' });
      await tx.orm.public.HQAuditEvent.create({
        actorPersonId: actorPersonId!,
        action: 'ORGANIZATION_SUSPENDED',
        targetType: 'Organization',
        targetId: organizationId,
        metadata: { previousStatus: org.status }
      });
    });

    revalidatePath('/hq/tenants');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to suspend organization' };
  }
}

export async function reactivateOrganization(organizationId: string) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || 'system';

  try {
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    if (!org) return { error: 'Organization not found' };

    await db.transaction(async (tx) => {
      await tx.orm.public.Organization.where({ id: organizationId }).update({ status: 'ACTIVE' });
      await tx.orm.public.HQAuditEvent.create({
        actorPersonId: actorPersonId!,
        action: 'ORGANIZATION_REACTIVATED',
        targetType: 'Organization',
        targetId: organizationId,
        metadata: { previousStatus: org.status }
      });
    });

    revalidatePath('/hq/tenants');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to reactivate organization' };
  }
}

export async function getOrganizationStatus(organizationId: string) {
  await requireSystemAdmin();
  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
  if (!org) throw new Error('Not found');
  return org.status;
}

export async function getHQMetrics() {
  await requireSystemAdmin();
  
  const [
    totalOrgs,
    suspendedOrgs,
    totalPeople,
    totalLocations,
  ] = await Promise.all([
    db.orm.public.Organization.count(),
    db.orm.public.Organization.where({ status: 'SUSPENDED' }).count(),
    db.orm.public.Person.count(),
    db.orm.public.Location.count(),
  ]);

  return {
    organizations: {
      total: totalOrgs,
      active: totalOrgs - suspendedOrgs,
      suspended: suspendedOrgs
    },
    users: {
      total: totalPeople
    },
    locations: {
      total: totalLocations
    }
  };
}
import { requireSystemAdmin } from '@/lib/rbac';

export async function inspectOrganization(organizationId: string) {
  await requireSystemAdmin();
  
  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
  if (!org) throw new Error("Organization not found");

  const [
    memberships,
    locations,
    transactions,
    orders,
    auditEvents
  ] = await Promise.all([
    db.orm.public.Membership.where({ organizationId }).all(),
    db.orm.public.Location.where({ organizationId }).all(),
    db.orm.public.Transaction.where({ organizationId }).all(),
    db.orm.public.RetailOrder.where({ organizationId }).all(),
    db.orm.public.HQAuditEvent.where({ targetId: organizationId }).all()
  ]);

  // Try to enrich memberships with Person data, limiting to 50 for bounding
  const enrichedMemberships = [];
  for (const m of memberships.slice(0, 50)) {
    const p = await db.orm.public.Person.where({ id: m.personId }).all().first();
    const roles = await db.orm.public.MembershipRole.where({ membershipId: m.id }).all();
    if (p) enrichedMemberships.push({ ...m, person: p, roles });
  }

  return {
    organization: org,
    memberships: enrichedMemberships,
    locations,
    recentTransactions: transactions.slice(-10),
    recentOrders: orders.slice(-10),
    recentAuditEvents: auditEvents.slice(-10),
  };
}

export async function inspectPerson(personId: string) {
  await requireSystemAdmin();

  const person = await db.orm.public.Person.where({ id: personId }).all().first();
  if (!person) throw new Error("Person not found");

  const [
    account,
    identifiers,
    memberships,
    wallets,
    auditEvents
  ] = await Promise.all([
    db.orm.public.Account.where({ personId }).all().first(),
    db.orm.public.PersonIdentifier.where({ personId }).all(),
    db.orm.public.Membership.where({ personId }).all(),
    db.orm.public.Wallet.where({ personId }).all(),
    db.orm.public.HQAuditEvent.where({ actorPersonId: personId }).all()
  ]);

  const enrichedMemberships = [];
  for (const m of memberships.slice(0, 50)) {
    const org = await db.orm.public.Organization.where({ id: m.organizationId }).all().first();
    const roles = await db.orm.public.MembershipRole.where({ membershipId: m.id }).all();
    if (org) enrichedMemberships.push({ ...m, organization: org, roles });
  }

  return {
    person,
    account,
    identifiers,
    memberships: enrichedMemberships,
    wallets,
    recentAuditEvents: auditEvents.slice(-10)
  };
}

