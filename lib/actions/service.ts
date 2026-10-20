'use server'

import '@js-temporal/polyfill'
import { db } from '@/src/prisma/db'
import { requireMembership } from '@/lib/actions/tenant'
import { notifyPerson, personIdForCustomerData } from '@/lib/notify'
import {
  inferServiceCategory as inferCategoryUtil,
  getCategoryBySlug,
  getCategoryById,
  SERVICE_CATEGORIES,
} from '@/lib/service-categories';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { formatWhatsAppNumber } from '@/lib/whatsapp'
import { getServicesConfig } from '@/lib/actions/services-config'
import { parseReviewBody } from '@/lib/reviews'
import { getTwoLetterInitials, resolveAvatarUrl } from '@/lib/identity'

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
    await requireMembership(organizationId);
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
    await requireMembership(organizationId);
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
    await requireMembership(organizationId);
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
    await requireMembership(organizationId);
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
    await requireMembership(organizationId);
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

    if (input.startTime >= input.endTime) {
      return { error: 'Start time must be before end time.' };
    }

    // Double-booking check: If staff is assigned, verify no overlapping confirmed/in-progress appointments
    if (input.membershipId) {
      const existing = await db.orm.public.ServiceAppointment.where({
        organizationId: input.organizationId,
        membershipId: input.membershipId,
      }).all();

      const startMs = input.startTime.getTime();
      const endMs = input.endTime.getTime();

      const hasOverlap = existing.some((apt: any) => {
        if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') return false;
        const aptStart = new Date(epochMs(apt.startTime)).getTime();
        const aptEnd = new Date(epochMs(apt.endTime)).getTime();
        // Overlap occurs if (start < aptEnd) and (end > aptStart)
        return startMs < aptEnd && endMs > aptStart;
      });

      if (hasOverlap) {
        return { error: 'Staff member already has an overlapping appointment during this time window.' };
      }
    }

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
    await requireMembership(organizationId);
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
    await requireMembership(organizationId);
    return await db.orm.public.ServiceJobQuote.where({ organizationId }).all();
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

export async function getServiceInvoices(organizationId: string) {
  try {
    await requireMembership(organizationId);
    return await db.orm.public.ServiceInvoice.where({ organizationId }).all();
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

export async function updateServiceJobStatus(input: {
  organizationId: string;
  jobId: string;
  status: 'NEW' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TECHNICIAN']);
    const job = await db.orm.public.ServiceJob.where({ id: input.jobId, organizationId: input.organizationId }).all().first();
    if (!job) return { error: 'Job not found.' };

    await db.orm.public.ServiceJob.where({ id: input.jobId }).update({ status: input.status });

    // Notify customer on status update (fire-and-forget)
    const personId = await personIdForCustomerData(job.customerDataId);
    if (personId) {
      await notifyPerson(personId, {
        type: 'SERVICE_STATUS',
        title: `Job Status: ${input.status.replace('_', ' ')}`,
        body: `Your service job "${job.description || 'Request'}" has been marked as ${input.status}.`,
        href: `/tasks/${job.id}`,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating job status:', error);
    return { error: error.message || 'Failed to update job status.' };
  }
}

export async function assignStaffToServiceJob(input: {
  organizationId: string;
  jobId: string;
  membershipId: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const job = await db.orm.public.ServiceJob.where({ id: input.jobId, organizationId: input.organizationId }).all().first();
    if (!job) return { error: 'Job not found.' };

    // Verify staff membership belongs to this organization
    const staffMember = await db.orm.public.Membership.where({ id: input.membershipId, organizationId: input.organizationId }).all().first();
    if (!staffMember) return { error: 'Staff member does not belong to this organization.' };

    await db.orm.public.ServiceJob.where({ id: input.jobId }).update({
      membershipId: input.membershipId,
      status: job.status === 'NEW' ? 'ASSIGNED' : job.status,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error assigning staff:', error);
    return { error: error.message || 'Failed to assign staff.' };
  }
}

export async function createServiceQuote(input: {
  organizationId: string;
  customerDataId: string;
  total: number;
  discount?: number;
  tax?: number;
  notes?: string;
  terms?: string;
  expirationDate?: Date;
  items?: { description: string; quantity: number; unitPrice: number; subtotal: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const quote = await db.transaction(async (tx) => {
      const q = await tx.orm.public.ServiceJobQuote.create({
        organizationId: input.organizationId,
        customerDataId: input.customerDataId,
        total: input.total,
        discount: input.discount ?? 0,
        tax: input.tax ?? 0,
        notes: input.notes,
        terms: input.terms,
        status: 'DRAFT',
        expirationDate: input.expirationDate ? toInstant(input.expirationDate) : undefined,
      });

      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          await tx.orm.public.ServiceJobQuoteItem.create({
            quoteId: q.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          });
        }
      }
      return q;
    });

    return { success: true, quote: JSON.parse(JSON.stringify(quote)) };
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return { error: error.message || 'Failed to create quote.' };
  }
}

export async function createServiceInvoice(input: {
  organizationId: string;
  customerDataId: string;
  jobId?: string;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  dueDate?: Date;
  items?: { description: string; quantity: number; unitPrice: number; subtotal: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const invoice = await db.transaction(async (tx) => {
      const inv = await tx.orm.public.ServiceInvoice.create({
        organizationId: input.organizationId,
        customerDataId: input.customerDataId,
        jobId: input.jobId,
        subtotal: input.subtotal,
        tax: input.tax ?? 0,
        discount: input.discount ?? 0,
        total: input.total,
        status: 'DRAFT',
        dueDate: input.dueDate ? toInstant(input.dueDate) : undefined,
      });

      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          await tx.orm.public.ServiceInvoiceItem.create({
            invoiceId: inv.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          });
        }
      }
      return inv;
    });

    return { success: true, invoice: JSON.parse(JSON.stringify(invoice)) };
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return { error: error.message || 'Failed to create invoice.' };
  }
}

export async function markServiceInvoicePaid(input: {
  organizationId: string;
  invoiceId: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const inv = await db.orm.public.ServiceInvoice.where({ id: input.invoiceId, organizationId: input.organizationId }).all().first();
    if (!inv) return { error: 'Invoice not found.' };

    await db.orm.public.ServiceInvoice.where({ id: input.invoiceId }).update({
      status: 'PAID',
      amountPaid: inv.total,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error marking invoice paid:', error);
    return { error: error.message || 'Failed to mark invoice as paid.' };
  }
}

export async function getServiceRevenueStats(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const invoices = await db.orm.public.ServiceInvoice.where({ organizationId }).all();
    const paidInvoices = invoices.filter((i: any) => i.status === 'PAID');
    const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + (i.amountPaid || i.total || 0), 0);
    const pendingRevenue = invoices.filter((i: any) => i.status !== 'PAID' && i.status !== 'VOID')
      .reduce((sum: number, i: any) => sum + (i.total || 0), 0);

    return {
      totalRevenue,
      pendingRevenue,
      totalInvoices: invoices.length,
      paidCount: paidInvoices.length,
    };
  } catch (error) {
    console.error('Error fetching service revenue stats:', error);
    return { totalRevenue: 0, pendingRevenue: 0, totalInvoices: 0, paidCount: 0 };
  }
}

export async function getCityBookableServices(citySlug?: string, categoryFilter?: string) {
  try {
    const { isTestOrDemoOrganization } = await import('@/lib/storefront-filter');
    let orgIds: string[] = [];
    if (citySlug) {
      const city = await db.orm.public.City.where({ slug: citySlug }).all().first();
      if (city) {
        const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
        orgIds = Array.from(new Set(locs.map((l) => l.organizationId)));
      }
    }

    const allItems = await db.orm.public.ServiceCatalogItem.where({ isActive: true }).all();
    let rawItems = orgIds.length > 0 ? allItems.filter((i: any) => orgIds.includes(i.organizationId)) : allItems;

    // Scoped category filter: filter raw items early to avoid unnecessary N+1 org queries
    if (categoryFilter && categoryFilter !== 'All') {
      const catDef = getCategoryBySlug(categoryFilter) || getCategoryById(categoryFilter);
      const targetCategory = catDef ? catDef.id : categoryFilter;
      rawItems = rawItems.filter((i: any) => inferCategoryUtil(i.name, i.description) === targetCategory);
    }

    // Collect distinct organization IDs
    const distinctOrgIds = Array.from(new Set(rawItems.map((i: any) => i.organizationId)));

    // Fetch org names and filter out test/demo organizations
    const orgMap = new Map<string, { name: string; description: string | null }>();
    const validOrgIds = new Set<string>();
    for (const orgId of distinctOrgIds) {
      const org = await db.orm.public.Organization.where({ id: orgId }).all().first();
      if (org && !isTestOrDemoOrganization(org)) {
        orgMap.set(orgId, { name: org.name || 'Local Pro', description: org.description || null });
        validOrgIds.add(orgId);
      }
    }

    const items = rawItems.filter((i: any) => validOrgIds.has(i.organizationId));

    // Fetch contact points (phone and whatsapp)
    const contacts = await db.orm.public.OrganizationContactPoint.all();
    const contactMap = new Map<string, { phone: string | null; whatsapp: string | null }>();
    for (const cp of contacts) {
      if (!contactMap.has(cp.organizationId)) {
        contactMap.set(cp.organizationId, { phone: null, whatsapp: null });
      }
      const entry = contactMap.get(cp.organizationId)!;
      if (cp.type === 'WHATSAPP' && cp.value) {
        entry.whatsapp = formatWhatsAppNumber(cp.value);
      } else if (cp.type === 'PHONE' && cp.value) {
        entry.phone = cp.value;
        if (!entry.whatsapp) {
          entry.whatsapp = formatWhatsAppNumber(cp.value);
        }
      }
    }

    // Fetch primary locations (address)
    const locations = await db.orm.public.Location.all();
    const locationMap = new Map<string, string>();
    for (const loc of locations) {
      if (loc.address && !locationMap.has(loc.organizationId)) {
        locationMap.set(loc.organizationId, loc.address);
      }
    }

    // Fetch reviews aggregate
    const allReviews = await db.orm.public.Review.all();
    const reviewsMap = new Map<string, { sum: number; count: number }>();
    for (const rev of allReviews) {
      if (!reviewsMap.has(rev.organizationId)) {
        reviewsMap.set(rev.organizationId, { sum: 0, count: 0 });
      }
      const entry = reviewsMap.get(rev.organizationId)!;
      entry.sum += rev.rating;
      entry.count += 1;
    }

    // Fetch likes (SavedItem entityType = 'service_org')
    const allLikes = await db.orm.public.SavedItem.where({ entityType: 'service_org' }).all();
    const likesMap = new Map<string, number>();
    for (const lk of allLikes) {
      likesMap.set(lk.entityId, (likesMap.get(lk.entityId) || 0) + 1);
    }

    let currentPersonId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      currentPersonId = session?.user?.personId ?? null;
    } catch {}

    const userLikedSet = new Set(
      currentPersonId ? allLikes.filter((l) => l.personId === currentPersonId).map((l) => l.entityId) : []
    );

    const servicesConfig = await getServicesConfig();
    const verifiedSet = new Set(servicesConfig.verifiedOrgIds || []);

    return items.map((it) => {
      const contact = contactMap.get(it.organizationId);
      const revStat = reviewsMap.get(it.organizationId);
      const avgRating = revStat && revStat.count > 0 ? Number((revStat.sum / revStat.count).toFixed(1)) : null;
      const reviewCount = revStat?.count || 0;
      const likesCount = likesMap.get(it.organizationId) || 0;
      const userHasLiked = userLikedSet.has(it.organizationId);
      const address = locationMap.get(it.organizationId) || null;
      const isVerified = verifiedSet.has(it.organizationId);

      return {
        id: it.id,
        name: it.name,
        description: it.description,
        price: it.price,
        durationMinutes: it.durationMinutes,
        organizationId: it.organizationId,
        orgName: orgMap.get(it.organizationId)?.name || 'Local Pro',
        orgDescription: orgMap.get(it.organizationId)?.description || null,
        category: inferCategoryUtil(it.name, it.description),
        phone: contact?.phone || null,
        whatsapp: contact?.whatsapp || null,
        address,
        rating: avgRating,
        reviewCount,
        likesCount,
        userHasLiked,
        isVerified,
      };
    });
  } catch (error) {
    console.error('Error fetching city bookable services:', error);
    return [];
  }
}

export async function getCityServiceCategoryCounts(citySlug?: string): Promise<Record<string, number>> {
  try {
    let orgIds: string[] = [];
    if (citySlug) {
      const city = await db.orm.public.City.where({ slug: citySlug }).all().first();
      if (city) {
        const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
        orgIds = Array.from(new Set(locs.map((l) => l.organizationId)));
      }
    }

    const allItems = await db.orm.public.ServiceCatalogItem.where({ isActive: true }).all();
    const rawItems = orgIds.length > 0 ? allItems.filter((i: any) => orgIds.includes(i.organizationId)) : allItems;

    const counts: Record<string, number> = { All: rawItems.length };
    for (const cat of SERVICE_CATEGORIES) {
      counts[cat.id] = 0;
    }
    for (const item of rawItems) {
      const cat = inferCategoryUtil(item.name, item.description);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  } catch (error) {
    console.error('Error fetching city service category counts:', error);
    return { All: 0 };
  }
}

export async function getOrganizationReviews(organizationId: string) {
  try {
    const reviews = await db.orm.public.Review.where({ organizationId })
      .include('person', (p: any) => p.include('profile'))
      .all();

    const sorted = reviews.sort((a, b) => {
      const tA = (a.createdAt as any)?.getTime ? (a.createdAt as any).getTime() : 0;
      const tB = (b.createdAt as any)?.getTime ? (b.createdAt as any).getTime() : 0;
      return tB - tA;
    });

    const missingPersonIds = Array.from(
      new Set(sorted.filter((r: any) => !r.person).map((r: any) => r.personId).filter(Boolean))
    );
    const fallbackPersons =
      missingPersonIds.length > 0
        ? await db.orm.public.Person.where((p: any) => p.id.in(missingPersonIds)).include('profile').all()
        : [];
    const personMap = new Map<string, any>(fallbackPersons.map((p: any) => [p.id, p]));

    const totalReviews = sorted.length;
    const sumRatings = sorted.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : null;

    return {
      success: true,
      averageRating,
      totalReviews,
      reviews: sorted.map((r) => {
        const p = r.person || personMap.get(r.personId);
        const firstName = (p?.firstName || '').trim();
        const lastName = (p?.lastName || '').trim();
        const authorName = (firstName || lastName) ? `${firstName} ${lastName ? lastName[0] + '.' : ''}`.trim() : 'Resident';
        const authorInitials = getTwoLetterInitials(authorName);
        const rawAvatar = p?.profile?.avatarUrl || null;
        const avatarUrl = resolveAvatarUrl(rawAvatar) || null;
        const parsed = parseReviewBody(r.body);
        return {
          id: r.id,
          organizationId: r.organizationId,
          personId: r.personId,
          rating: r.rating,
          body: parsed.text || r.body || '',
          tags: parsed.tags,
          photos: parsed.photos,
          isVerifiedCustomer: parsed.isVerifiedCustomer,
          ownerReply: parsed.ownerReply,
          authorName,
          authorInitials,
          avatarUrl,
          createdAt: (r.createdAt as any)?.toISOString ? (r.createdAt as any).toISOString() : String(r.createdAt),
        };
      }),
    };
  } catch (error: any) {
    console.error('Error fetching organization reviews:', error);
    return { success: false, reviews: [], averageRating: null, totalReviews: 0 };
  }
}

export async function submitOrganizationReview(input: {
  organizationId: string;
  rating: number;
  body?: string;
  photos?: string[];
  tags?: string[];
}) {
  const { submitBusinessReview } = await import('@/lib/actions/reviews');
  const res = await submitBusinessReview(input);
  if (!res.success) {
    return {
      success: false,
      requiresAuth: res.requiresAuth,
      error: res.error,
    };
  }
  const latest = await db.orm.public.Review.where({ id: res.reviewId }).all().first();
  return {
    success: true,
    review: latest ? JSON.parse(JSON.stringify(latest)) : { id: res.reviewId, rating: input.rating, body: input.body || null },
  };
}

export async function toggleOrganizationLike(organizationId: string) {
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  if (!session?.user?.personId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Please sign in to like this provider.',
    };
  }

  try {
    const personId = session.user.personId as string;
    const existing = await db.orm.public.SavedItem.where({
      personId,
      entityType: 'service_org',
      entityId: organizationId,
    }).all().first();

    let liked = false;
    if (existing) {
      await db.orm.public.SavedItem.where({ id: existing.id }).delete();
      liked = false;
    } else {
      await db.orm.public.SavedItem.create({
        personId,
        entityType: 'service_org',
        entityId: organizationId,
      });
      liked = true;
    }

    const totalLikes = await db.orm.public.SavedItem.where({
      entityType: 'service_org',
      entityId: organizationId,
    }).all();

    try {
      revalidatePath('/services');
    } catch {}

    return {
      success: true,
      liked,
      likesCount: totalLikes.length,
    };
  } catch (error: any) {
    console.error('Error toggling organization like:', error);
    return { success: false, error: error.message || 'Failed to update like.' };
  }
}

export async function getOrganizationSocialData(organizationId: string) {
  try {
    const [reviews, likes] = await Promise.all([
      db.orm.public.Review.where({ organizationId }).all(),
      db.orm.public.SavedItem.where({ entityType: 'service_org', entityId: organizationId }).all(),
    ]);

    let currentPersonId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      currentPersonId = session?.user?.personId ?? null;
    } catch {}

    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : null;
    const userHasLiked = currentPersonId ? likes.some((l) => l.personId === currentPersonId) : false;

    return {
      averageRating,
      reviewCount: totalReviews,
      likesCount: likes.length,
      userHasLiked,
    };
  } catch (error) {
    console.error('Error fetching organization social data:', error);
    return { averageRating: null, reviewCount: 0, likesCount: 0, userHasLiked: false };
  }
}




