import { db } from '@/src/prisma/db';
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
