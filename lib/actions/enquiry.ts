'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export interface SubmitEnquiryInput {
  organizationId: string;
  locationId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceRequested?: string;
  message: string;
  consentGiven: boolean;
  idempotencyKey?: string;
}

export async function submitCustomerEnquiry(input: SubmitEnquiryInput) {
  const name = (input.customerName || '').trim();
  const email = (input.customerEmail || '').trim().toLowerCase();
  const message = (input.message || '').trim();

  if (!name || name.length < 2) {
    return { error: 'Please enter your full name.' };
  }

  // Basic email validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }

  if (!message || message.length < 5) {
    return { error: 'Please enter a message of at least 5 characters.' };
  }

  if (!input.consentGiven) {
    return { error: 'You must consent to sharing these enquiry details with the business.' };
  }

  // Verify the target organization exists and is active
  const org = await db.orm.public.Organization.where({ id: input.organizationId }).all().first();
  if (!org || org.status === 'SUSPENDED') {
    return { error: 'This business is currently not accepting enquiries.' };
  }

  // Verify location if provided
  let locationId = input.locationId;
  if (locationId) {
    const loc = await db.orm.public.Location.where({ id: locationId, organizationId: org.id }).all().first();
    if (!loc) {
      locationId = undefined; // Fallback to organization level
    }
  }

  // Optional authenticated session
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Graceful fallback when invoked outside HTTP request context (e.g. tests, background jobs)
  }
  const personId = session?.user?.personId || null;

  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await db.orm.public.CustomerEnquiry.where({
      idempotencyKey: input.idempotencyKey,
    }).all().first();

    if (existing) {
      return {
        success: true,
        enquiryId: existing.id,
        status: existing.status,
        routable: true,
        isDuplicate: true,
      };
    }
  }

  // Find eligible business recipient contact email
  // Prefer location-specific primary email, then organization primary email
  const contactPoints = await db.orm.public.OrganizationContactPoint.where({
    organizationId: org.id,
    type: 'EMAIL',
  }).all();

  const recipientContact =
    (locationId ? contactPoints.find((c) => c.locationId === locationId && c.isPrimary) : null) ||
    contactPoints.find((c) => c.isPrimary) ||
    contactPoints[0] ||
    null;

  const enquiryId = uuidv4();
  const deliveryId = uuidv4();
  const outboxId = uuidv4();

  try {
    await db.transaction(async (tx: any) => {
      // 1. Create Enquiry
      await tx.orm.public.CustomerEnquiry.create({
        id: enquiryId,
        organizationId: org.id,
        locationId: locationId || null,
        personId: personId || null,
        customerName: name,
        customerEmail: email,
        customerPhone: input.customerPhone ? input.customerPhone.trim() : null,
        serviceRequested: input.serviceRequested ? input.serviceRequested.trim() : null,
        message,
        consentGiven: true,
        status: recipientContact ? 'ACCEPTED' : 'ACCEPTED_NO_RECIPIENT',
        idempotencyKey: input.idempotencyKey || null,
      });

      // 2. If eligible recipient exists, record delivery attempt and queue outbox event
      if (recipientContact?.value) {
        await tx.orm.public.MessageDelivery.create({
          id: deliveryId,
          enquiryId,
          recipientEmail: recipientContact.value.trim().toLowerCase(),
          channel: 'EMAIL',
          status: 'QUEUED',
          attempts: 0,
        });

        await tx.orm.public.OutboxEvent.create({
          id: outboxId,
          eventType: 'ENQUIRY_ROUTING',
          payload: JSON.stringify({
            deliveryId,
            enquiryId,
            orgId: org.id,
            businessName: org.name,
            recipientEmail: recipientContact.value.trim().toLowerCase(),
            customerName: name,
            customerEmail: email,
            customerPhone: input.customerPhone || null,
            serviceRequested: input.serviceRequested || null,
            message,
          }),
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 5,
        });
      }
    });

    return {
      success: true,
      enquiryId,
      routable: !!recipientContact?.value,
      message: recipientContact?.value
        ? 'Your enquiry has been received and routed to the business contact.'
        : 'Your enquiry has been recorded. This business has not published an email yet, but will see it when they claim their profile.',
    };
  } catch (err: any) {
    console.error('Error recording enquiry:', err);
    return { error: err.message || 'Failed to submit enquiry. Please try again.' };
  }
}

/**
 * Fetch enquiries for a business (Owner view).
 */
export async function getOrganizationEnquiries(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('UNAUTHORIZED');
  }

  // Ensure authorized membership
  const membership = await db.orm.public.Membership.where({
    organizationId,
    personId: session.user.personId,
  }).all().first();

  if (!membership) {
    throw new Error('FORBIDDEN: You do not have access to this organization.');
  }

  const enquiries = await db.orm.public.CustomerEnquiry.where({
    organizationId,
  }).all();

  // Return parsed and sorted (newest first)
  const parsed = JSON.parse(JSON.stringify(enquiries));
  parsed.sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
  return parsed;
}
