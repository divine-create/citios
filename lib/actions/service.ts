'use server'

import '@js-temporal/polyfill'
import { db } from '@/src/prisma/db'

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function epochMs(instant: unknown) {
  return (instant as { epochMilliseconds: number }).epochMilliseconds;
}

// ==========================================
// UNIVERSAL CRM
// ==========================================

export async function getOrgCustomers(organizationId: string) {
  try {
    return await db.orm.public.OrgCustomer.where({ organizationId }).all();
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
    const customer = await db.orm.public.OrgCustomer.create(input);
    return { success: true, customer };
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
}) {
  try {
    const item = await db.orm.public.ServiceCatalogItem.create(input);
    return { success: true, item };
  } catch (error) {
    console.error('Error creating catalog item:', error);
    return { error: 'Failed to create catalog item.' };
  }
}

export async function getServiceStaff(organizationId: string) {
  try {
    return await db.orm.public.ServiceStaff.where({ organizationId }).all();
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
    const staff = await db.orm.public.ServiceStaff.create(input);
    return { success: true, staff };
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
  customerId: string;
  serviceId: string;
  staffId?: string;
  startTime: Date;
  endTime: Date;
  price: number;
  notes?: string;
}) {
  try {
    const apt = await db.orm.public.ServiceAppointment.create({
      ...input,
      startTime: toInstant(input.startTime),
      endTime: toInstant(input.endTime),
    });
    return { success: true, appointment: apt };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { error: 'Failed to create appointment.' };
  }
}

export async function updateServiceAppointmentStatus(id: string, status: string) {
  try {
    await db.orm.public.ServiceAppointment.where({ id }).update({ status });
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
  customerId: string;
  serviceId?: string;
  description: string;
  status: string;
}) {
  try {
    const job = await db.orm.public.ServiceJob.create(input);
    return { success: true, job };
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
