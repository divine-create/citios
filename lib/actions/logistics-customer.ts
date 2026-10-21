'use server';

import { db } from '@/src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { assertProviderAccess } from './logistics-tenant';
import { createDeliveryJob, transitionDeliveryStatus } from './logistics-domain';
import { calculateDeliveryQuote, offerQuote, acceptQuote } from './logistics-pricing';
import { generateDeliveryOtp } from './logistics-otp';

class LogisticsCustomerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogisticsCustomerError';
  }
}

/**
 * Onboards a standalone private customer for the logistics company.
 * Uses canonical Person + Relationship + CustomerData tenant infrastructure.
 */
export async function createLogisticsCustomer(params: {
  providerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  notes?: string;
}) {
  await assertProviderAccess(params.providerId);

  if (!params.firstName || !params.phone) {
    throw new LogisticsCustomerError('First name and phone number are required');
  }

  return await db.transaction(async (tx: any) => {
    // 1. Find or create canonical Person via PersonIdentifier
    let person: any = null;
    const cleanEmail = params.email?.trim().toLowerCase();
    const cleanPhone = params.phone.trim();

    if (cleanEmail) {
      const ident = (await tx.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: cleanEmail }).all())[0];
      if (ident) {
        person = (await tx.orm.public.Person.where({ id: ident.personId }).all())[0];
      }
    }
    if (!person && cleanPhone) {
      const identPhone = (await tx.orm.public.PersonIdentifier.where({ type: 'PHONE', normalizedValue: cleanPhone }).all())[0];
      if (identPhone) {
        person = (await tx.orm.public.Person.where({ id: identPhone.personId }).all())[0];
      }
    }

    if (!person) {
      person = await tx.orm.public.Person.create({
        id: uuidv4(),
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
      });

      if (cleanEmail) {
        await tx.orm.public.PersonIdentifier.create({
          personId: person.id,
          type: 'EMAIL',
          normalizedValue: cleanEmail,
          isVerified: false,
        });
      }
      if (cleanPhone) {
        await tx.orm.public.PersonIdentifier.create({
          personId: person.id,
          type: 'PHONE',
          normalizedValue: cleanPhone,
          isVerified: false,
        });
      }
    }

    // 2. Find or create scoped Relationship
    let relationship = (await tx.orm.public.Relationship.where({
      organizationId: params.providerId,
      personId: person.id,
      type: 'CUSTOMER',
    }).all())[0];

    if (!relationship) {
      relationship = await tx.orm.public.Relationship.create({
        id: uuidv4(),
        organizationId: params.providerId,
        personId: person.id,
        type: 'CUSTOMER',
      });
    }

    // 3. Find or create CustomerData record
    let customerData = (await tx.orm.public.CustomerData.where({
      personId: person.id,
    }).all())[0];

    if (!customerData) {
      customerData = (await tx.orm.public.CustomerData.where({
        relationshipId: relationship.id,
      }).all())[0];
    }

    if (!customerData) {
      customerData = await tx.orm.public.CustomerData.create({
        id: uuidv4(),
        personId: person.id,
        relationshipId: relationship.id,
        notes: params.notes?.trim() || null,
        loyaltyPoints: 0,
      });
    } else if (params.notes) {
      await tx.orm.public.CustomerData.where({ id: customerData.id }).update({
        notes: params.notes.trim(),
      });
      customerData.notes = params.notes.trim();
    }

    return {
      id: customerData.id,
      personId: person.id,
      relationshipId: relationship.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
      notes: customerData.notes,
    };
  });
}

/**
 * Retrieves all direct private customers for an authorized logistics company.
 */
export async function getLogisticsCustomers(providerId: string) {
  await assertProviderAccess(providerId);

  const relationships = await db.orm.public.Relationship
    .where({ organizationId: providerId, type: 'CUSTOMER' })
    .include('person')
    .include('customerData')
    .all();

  const customerList = [];

  for (const rel of relationships) {
    if (!rel.customerData) continue;

    // Bounded count of deliveries for this customer
    const customerDataId = (rel.customerData as any)?.id;
    const deliveries = customerDataId
      ? await db.orm.public.DeliveryJob
          .where({ providerId, customerDataId })
          .select('id', 'status', 'createdAt')
          .all()
      : [];

    customerList.push({
      id: rel.customerData.id,
      personId: rel.person?.id,
      firstName: rel.person?.firstName || 'Customer',
      lastName: rel.person?.lastName || '',
      email: rel.person?.email || null,
      phone: rel.person?.phone || '',
      notes: rel.customerData.notes || null,
      deliveryCount: deliveries.length,
      createdAt: rel.createdAt,
    });
  }

  customerList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return customerList;
}

/**
 * Direct booking on behalf of a standalone customer.
 */
export async function createManualCustomerDelivery(params: {
  providerId: string;
  customerDataId?: string;
  pickup: {
    address: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactPhone?: string;
  };
  dropoff: {
    address: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactPhone?: string;
  };
  packageDescription?: string;
  packageWeightKg?: number;
  serviceLevel?: string;
  priority?: boolean;
  distanceKm?: number;
  idempotencyKey?: string;
}) {
  await assertProviderAccess(params.providerId);

  if (!params.pickup?.address || !params.dropoff?.address) {
    throw new LogisticsCustomerError('Pickup and dropoff addresses are required');
  }

  // Validate customer belongs to provider if supplied
  if (params.customerDataId) {
    const customer = await db.orm.public.CustomerData.where({ id: params.customerDataId }).include('relationship').first();
    if (!customer || !customer.relationship || customer.relationship.organizationId !== params.providerId) {
      throw new LogisticsCustomerError('Customer not found or belongs to another provider');
    }
  }

  const directJobId = uuidv4();
  const idempotencyKey = params.idempotencyKey || `direct-del-${directJobId}`;

  // 1. Create delivery job
  const job = await createDeliveryJob({
    providerId: params.providerId,
    sourceType: 'DIRECT_DELIVERY',
    sourceId: directJobId,
    idempotencyKey,
    dropoffAddress: params.dropoff.address,
    dropoffLat: params.dropoff.latitude,
    dropoffLng: params.dropoff.longitude,
    dropoffContactName: params.dropoff.contactName,
    dropoffContactPhone: params.dropoff.contactPhone,
    pickupAddress: params.pickup.address,
    pickupLat: params.pickup.latitude,
    pickupLng: params.pickup.longitude,
    pickupContactName: params.pickup.contactName,
    pickupContactPhone: params.pickup.contactPhone,
    packageDescription: params.packageDescription || 'Package',
    packageWeightKg: params.packageWeightKg || 1.0,
    serviceLevel: params.serviceLevel || 'STANDARD',
    customerDataId: params.customerDataId,
    recipientOtp: generateDeliveryOtp(),
  });

  // 2. Generate and accept quote
  const distanceKm = params.distanceKm && params.distanceKm > 0 ? params.distanceKm : 5.0;
  const quote = await calculateDeliveryQuote({
    deliveryJobId: job.id,
    providerId: params.providerId,
    distanceKm,
    weightKg: params.packageWeightKg || 1.0,
    priority: params.priority,
    idempotencyKey: `${idempotencyKey}-quote`,
  });

  await offerQuote(quote.id, params.providerId);
  await acceptQuote(quote.id, params.providerId);

  // 3. Transition to CREATED (ready for dispatch queue)
  const readyJob = await transitionDeliveryStatus(job.id, 'CREATED', params.providerId);

  return {
    job: { ...readyJob, rawOtp: (job as any).rawOtp },
    quote,
    trackingReference: readyJob.trackingReference,
    recipientOtp: (job as any).rawOtp || readyJob.recipientOtp,
    rawOtp: (job as any).rawOtp,
  };
}

/**
 * Returns customer billing and delivery statement.
 */
export async function getCustomerStatement(providerId: string, customerDataId: string) {
  await assertProviderAccess(providerId);

  const customer = await db.orm.public.CustomerData.where({ id: customerDataId }).include('relationship').first();
  if (!customer || !customer.relationship || customer.relationship.organizationId !== providerId) {
    throw new LogisticsCustomerError('Customer not found');
  }

  const jobs = await db.orm.public.DeliveryJob
    .where({ providerId, customerDataId })
    .include('quotes')
    .orderBy((j) => j.createdAt.desc())
    .all();

  let totalBilled = 0;
  const history = jobs.map((job: any) => {
    const acceptedQuote = job.quotes?.find((q: any) => q.status === 'ACCEPTED');
    const cost = acceptedQuote ? Number(acceptedQuote.total) : 0;
    totalBilled += cost;

    return {
      id: job.id,
      trackingReference: job.trackingReference,
      status: job.status,
      pickupAddress: job.pickupAddress,
      dropoffAddress: job.dropoffAddress,
      cost,
      currency: acceptedQuote?.currency || 'NGN',
      createdAt: job.createdAt,
    };
  });

  let person: any = null;
  if (customer.personId) {
    person = await db.orm.public.Person.where({ id: customer.personId }).first();
  }

  return {
    customer: {
      id: customer.id,
      name: person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : 'Customer',
      phone: person?.phone || null,
      email: person?.email || null,
    },
    totalBilled: Number(totalBilled.toFixed(2)),
    deliveries: history,
  };
}
