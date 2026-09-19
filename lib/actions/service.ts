'use server'

import '@js-temporal/polyfill'
import { db } from '@/src/prisma/db'
import { requireMembership } from '@/lib/actions/tenant'
import { notifyPerson, personIdForCustomerData } from '@/lib/notify'

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function epochMs(instant: unknown) {
  return (instant as { epochMilliseconds: number }).epochMilliseconds;
}

// Helper: resolve a Person's contact identifiers
async function getPersonIdentifiers(personId: string): Promise<{ email: string | null; phone: string | null }> {
  const identifiers = await db.orm.public.PersonIdentifier.where({ personId }).all();
  const emailId = identifiers.find((i) => i.type === 'EMAIL');
  const phoneId = identifiers.find((i) => i.type === 'PHONE');
  return {
    email: emailId?.normalizedValue ?? null,
    phone: phoneId?.normalizedValue ?? null,
  };
}

// Helper: resolve primary role from MembershipRole
async function getMembershipPrimaryRole(membershipId: string): Promise<string | null> {
  const roles = await db.orm.public.MembershipRole.where({ membershipId }).all();
  return roles[0]?.role ?? null;
}

// Helper: find Person by email or phone via PersonIdentifier
async function findPersonByContact(email?: string, phone?: string) {
  if (email) {
    const id = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: email.toLowerCase() }).all().first();
    if (id) return db.orm.public.Person.where({ id: id.personId }).all().first();
  }
  if (phone) {
    const id = await db.orm.public.PersonIdentifier.where({ type: 'PHONE', normalizedValue: phone }).all().first();
    if (id) return db.orm.public.Person.where({ id: id.personId }).all().first();
  }
  return null;
}

// Helper: create PersonIdentifiers for a new Person
async function createPersonIdentifiers(personId: string, email?: string, phone?: string) {
  if (email) {
    await db.orm.public.PersonIdentifier.create({ personId, type: 'EMAIL', normalizedValue: email.toLowerCase() });
  }
  if (phone) {
    await db.orm.public.PersonIdentifier.create({ personId, type: 'PHONE', normalizedValue: phone });
  }
}

// ==========================================
// UNIVERSAL CRM
// ==========================================

export async function getOrgCustomers(organizationId: string) {
  try {
    const rels = await db.orm.public.Relationship.where({ organizationId, type: 'CUSTOMER' }).all();
    const customers = [];
    for (const rel of rels) {
      const cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
      const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
      if (cd && person) {
        const { email, phone } = await getPersonIdentifiers(person.id);
        customers.push({
          ...cd,
          firstName: person.firstName,
          lastName: person.lastName,
          email,
          phone,
        });
      }
    }
    return JSON.parse(JSON.stringify(customers));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

export async function createOrgCustomer(input: {
  organizationId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    let person = await findPersonByContact(input.email, input.phone);
    if (!person) {
      person = await db.orm.public.Person.create({ firstName: input.firstName, lastName: input.lastName });
      await createPersonIdentifiers(person.id, input.email, input.phone);
    }

    const rel = await db.orm.public.Relationship.create({
      organizationId: input.organizationId,
      personId: person.id,
      type: 'CUSTOMER',
    });
    const customer = await db.orm.public.CustomerData.create({
      relationshipId: rel.id,
      notes: input.notes,
      loyaltyPoints: 0,
    });

    return {
      success: true,
      customer: JSON.parse(JSON.stringify({
        ...customer,
        firstName: person.firstName,
        lastName: person.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
      })),
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { error: 'Failed to create customer.' };
  }
}

// ==========================================
// SETTINGS
// ==========================================

export async function getServiceSettings(organizationId: string) {
  try {
    let settings = await db.orm.public.ServiceSettings.where({ organizationId }).all().first();
    if (!settings) {
      settings = await db.orm.public.ServiceSettings.create({ organizationId });
    }
    return settings;
  } catch (error) {
    console.error('Error fetching service settings:', error);
    return null;
  }
}

export async function updateServiceSettings(organizationId: string, updates: Partial<{
  appointmentsEnabled: boolean;
  jobsEnabled: boolean;
  quotesEnabled: boolean;
  onlineBookingEnabled: boolean;
  taxRate: number;
  currencySymbol: string;
}>) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.ServiceSettings.where({ organizationId }).update(updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating service settings:', error);
    return { error: 'Failed to update settings.' };
  }
}

// ==========================================
// STAFF & SERVICES
// ==========================================

export async function getServiceCatalogItems(organizationId: string) {
  try {
    return await db.orm.public.ServiceCatalogItem.where({ organizationId }).all();
  } catch (error) {
    console.error('Error fetching catalog items:', error);
    return [];
  }
}

export async function createServiceCatalogItem(input: {
  organizationId: string;
  name: string;
  price: number;
  durationMinutes: number;
  description?: string;
  showOnFeed?: boolean;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    
    const showOnFeed = input.showOnFeed ?? true;
    
    const item = await db.transaction(async (tx) => {
      const createdItem = await tx.orm.public.ServiceCatalogItem.create({
        organizationId: input.organizationId,
        name: input.name,
        price: input.price,
        durationMinutes: input.durationMinutes,
        description: input.description,
      });

      if (showOnFeed) {
        await tx.orm.public.Post.create({
          organizationId: input.organizationId,
          title: `New service available: ${createdItem.name}`,
          content: `New service available: ${createdItem.name}`,
          category: 'SERVICE',
          linkedEntityType: 'SERVICE',
          linkedEntityId: createdItem.id,
        });
      }

      return createdItem;
    });

    return { success: true, item };
  } catch (error) {
    console.error('Error creating catalog item:', error);
    return { error: 'Failed to create catalog item.' };
  }
}

export async function getServiceStaff(organizationId: string) {
  try {
    const memberships = await db.orm.public.Membership.where({ organizationId }).all();
    const staff = [];
    for (const m of memberships) {
      const person = await db.orm.public.Person.where({ id: m.personId }).all().first();
      if (person) {
        const { email, phone } = await getPersonIdentifiers(person.id);
        const role = await getMembershipPrimaryRole(m.id);
        staff.push({
          id: m.id,
          name: `${person.firstName} ${person.lastName}`.trim(),
          role,
          phone,
          email,
        });
      }
    }
    return JSON.parse(JSON.stringify(staff));
  } catch (error) {
    console.error('Error fetching service staff:', error);
    return [];
  }
}

export async function createServiceStaff(input: {
  organizationId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    let person = await findPersonByContact(input.email, input.phone);
    if (!person) {
      const [firstName, ...lastNames] = input.name.split(' ');
      person = await db.orm.public.Person.create({
        firstName: firstName || 'Unknown',
        lastName: lastNames.join(' ') || 'Unknown',
      });
      await createPersonIdentifiers(person.id, input.email, input.phone);
    }

    const membership = await db.orm.public.Membership.create({
      organizationId: input.organizationId,
      personId: person.id,
    });
    await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: input.role });

    return {
      success: true,
      staff: JSON.parse(JSON.stringify({
        id: membership.id,
        name: `${person.firstName} ${person.lastName}`.trim(),
        role: input.role,
        phone: input.phone ?? null,
        email: input.email ?? null,
      })),
    };
  } catch (error) {
    console.error('Error creating staff:', error);
    return { error: 'Failed to create staff.' };
  }
}

// ==========================================
// APPOINTMENTS
// ==========================================

export async function getServiceAppointments(organizationId: string) {
  try {
    return await db.orm.public.ServiceAppointment.where({ organizationId }).all();
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

export async function createServiceAppointment(input: {
  organizationId: string;
  customerDataId: string;
  serviceId: string;
  membershipId?: string;
  startTime: Date;
  endTime: Date;
  price: number;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const apt = await db.orm.public.ServiceAppointment.create({
      organizationId: input.organizationId,
      customerDataId: input.customerDataId,
      serviceId: input.serviceId,
      membershipId: input.membershipId,
      startTime: toInstant(input.startTime),
      endTime: toInstant(input.endTime),
      price: input.price,
      notes: input.notes,
    });
    return { success: true, appointment: JSON.parse(JSON.stringify(apt)) };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { error: 'Failed to create appointment.' };
  }
}

export async function updateServiceAppointmentStatus(id: string, status: string) {
  try {
    const apt = await db.orm.public.ServiceAppointment.where({ id }).all().first();
    if (apt) await requireMembership(apt.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.ServiceAppointment.where({ id }).update({ status });

    // Real org event → notify the resident customer (fire-and-forget).
    if (apt) {
      const personId = await personIdForCustomerData(apt.customerDataId);
      if (personId) {
        const label = status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
        await notifyPerson(personId, {
          type: 'SERVICE_STATUS',
          title: `Appointment ${label}`,
          href: '/tasks',
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return { error: 'Failed to update status.' };
  }
}

// ==========================================
// JOBS & QUOTES & INVOICES
// ==========================================

export async function getServiceJobs(organizationId: string) {
  try {
    return await db.orm.public.ServiceJob.where({ organizationId }).all();
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
}

export async function createServiceJob(input: {
  organizationId: string;
  customerDataId: string;
  serviceId?: string;
  description: string;
  status: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const job = await db.orm.public.ServiceJob.create({
      organizationId: input.organizationId,
      customerDataId: input.customerDataId,
      serviceId: input.serviceId,
      description: input.description,
      status: input.status,
    });
    return { success: true, job: JSON.parse(JSON.stringify(job)) };
  } catch (error) {
    console.error('Error creating job:', error);
    return { error: 'Failed to create job.' };
  }
}

export async function getServiceQuotes(organizationId: string) {
  try {
    return await db.orm.public.ServiceJobQuote.where({ organizationId }).all();
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

export async function getServiceInvoices(organizationId: string) {
  try {
    return await db.orm.public.ServiceInvoice.where({ organizationId }).all();
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}
