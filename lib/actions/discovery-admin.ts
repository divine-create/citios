'use server';

import { db } from '@/src/prisma/db';
import { requireAuthenticatedAccount } from '@/lib/actions/tenant';
import { normalizePhoneNumber } from '@/lib/identity';
import { v4 as uuidv4 } from 'uuid';

export interface ScrapedListingFilters {
  cityId?: string;
  status?: 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ALL';
}

export interface UpdateScrapedListingInput {
  listingId: string;
  title: string;
  vertical: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
}

/**
 * Retrieve scraped business listings for administrative review and editing.
 */
export async function getScrapedDiscoveryListings(filters: ScrapedListingFilters = {}) {
  const { person } = await requireAuthenticatedAccount();
  if (!person.isSystemAdmin) {
    throw new Error('FORBIDDEN: Only system administrators can review scraped listings.');
  }

  const status = filters.status || 'PENDING_REVIEW';

  let listings = await db.orm.public.DiscoveryListing.all();

  const statusOf = (l: { isActive: boolean; metadata: string | null }) => {
    try {
      const m = l.metadata ? JSON.parse(l.metadata) : {};
      if (m.approvalStatus) return m.approvalStatus as string;
    } catch {}
    return l.isActive ? 'APPROVED' : 'PENDING_REVIEW';
  };

  if (status === 'PENDING_REVIEW') {
    listings = listings.filter((l) => statusOf(l) === 'PENDING_REVIEW');
  } else if (status === 'PUBLISHED') {
    listings = listings.filter((l) => l.isActive);
  } else if (status === 'REJECTED') {
    listings = listings.filter((l) => statusOf(l) === 'REJECTED');
  }

  if (filters.cityId) {
    listings = listings.filter((l) => l.cityId === filters.cityId);
  }

  const enriched = await Promise.all(
    listings.map(async (listing) => {
      const org = await db.orm.public.Organization.where({ id: listing.organizationId }).all().first();
      const loc = listing.locationId
        ? await db.orm.public.Location.where({ id: listing.locationId }).all().first()
        : null;
      const city = await db.orm.public.City.where({ id: listing.cityId }).all().first();
      const contactPoints = await db.orm.public.OrganizationContactPoint.where({
        organizationId: listing.organizationId,
      }).all();
      const observations = await db.orm.public.SourceObservation.where({
        organizationId: listing.organizationId,
      }).all();

      let meta: any = {};
      try {
        if (listing.metadata) meta = JSON.parse(listing.metadata);
      } catch {
        meta = {};
      }

      const primaryPhone = contactPoints.find((c) => c.type === 'PHONE')?.value || '';
      const primaryEmail = contactPoints.find((c) => c.type === 'EMAIL')?.value || '';
      const whatsapp = contactPoints.find((c) => c.type === 'WHATSAPP')?.value || '';
      const website = contactPoints.find((c) => c.type === 'WEBSITE')?.value || '';
      const latestObs = observations[observations.length - 1] || null;

      return {
        id: listing.id,
        organizationId: listing.organizationId,
        locationId: listing.locationId,
        cityId: listing.cityId,
        cityName: city?.name || 'Unknown City',
        citySlug: city?.slug || '',
        title: listing.title,
        vertical: listing.vertical,
        slug: listing.slug,
        description: listing.description || org?.description || '',
        address: loc?.address || org?.address || '',
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        isActive: listing.isActive,
        approvalStatus: meta.approvalStatus || (listing.isActive ? 'APPROVED' : 'PENDING_REVIEW'),
        sourceName: meta.source || (latestObs ? 'Scraped Feed' : 'Direct Import'),
        sourceUrl: meta.sourceUrl || '',
        originalCategory: meta.originalCategory || meta.category || '',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        hours: meta.hours || '',
        instagram: meta.instagram || '',
        confidenceScore: latestObs?.confidenceScore ?? 1.0,
        contactPoints: contactPoints.map((c) => ({
          id: c.id,
          type: c.type,
          value: c.value,
          isPrimary: c.isPrimary,
        })),
        primaryPhone,
        primaryEmail,
        whatsapp,
        website,
        createdAt: listing.createdAt,
      };
    })
  );

  // Sort newest first (createdAt is a Temporal.Instant; relational operators throw on it)
  enriched.sort((a, b) => (globalThis as any).Temporal.Instant.compare(b.createdAt, a.createdAt));

  return JSON.parse(JSON.stringify(enriched));
}

/**
 * Edit and approve a scraped listing, instantly making it live on the city directory.
 */
export async function updateAndApproveListing(input: UpdateScrapedListingInput) {
  const { person } = await requireAuthenticatedAccount();
  if (!person.isSystemAdmin) {
    throw new Error('FORBIDDEN: Only system administrators can approve listings.');
  }

  const listing = await db.orm.public.DiscoveryListing.where({ id: input.listingId }).all().first();
  if (!listing) {
    return { error: 'Listing not found.' };
  }

  const cleanTitle = (input.title || '').trim();
  const cleanVertical = (input.vertical || listing.vertical).trim().toUpperCase();
  const cleanAddress = (input.address || '').trim();
  const cleanDesc = (input.description || '').trim();

  if (!cleanTitle || cleanTitle.length < 2) {
    return { error: 'Please enter a valid business title.' };
  }

  let normalizedPhone: string | null = null;
  if (input.phone) {
    normalizedPhone = normalizePhoneNumber(input.phone);
    if (!normalizedPhone) {
      return { error: 'Please enter a valid phone number (e.g. 08012345678).' };
    }
  }

  try {
    await db.transaction(async (tx: any) => {
      // 1. Update metadata
      let meta: any = {};
      try {
        if (listing.metadata) meta = JSON.parse(listing.metadata);
      } catch {}

      meta.approvalStatus = 'APPROVED';
      meta.approvedBy = person.id;
      meta.approvedAt = new Date().toISOString();

      // 2. Publish DiscoveryListing
      await tx.orm.public.DiscoveryListing.where({ id: listing.id }).update({
        title: cleanTitle,
        vertical: cleanVertical,
        description: cleanDesc || null,
        isActive: true,
        metadata: JSON.stringify(meta),
      });

      // 3. Update Organization
      await tx.orm.public.Organization.where({ id: listing.organizationId }).update({
        name: cleanTitle,
        type: cleanVertical as any,
        description: cleanDesc || null,
        address: cleanAddress || null,
        status: 'ACTIVE' as any,
      });

      // 4. Update Location if exists
      if (listing.locationId) {
        await tx.orm.public.Location.where({ id: listing.locationId }).update({
          address: cleanAddress || null,
        });
      }

      // 5. Upsert Phone Contact Point
      if (normalizedPhone) {
        const existingPhone = await tx.orm.public.OrganizationContactPoint.where({
          organizationId: listing.organizationId,
          type: 'PHONE',
        }).all().first();

        if (existingPhone) {
          await tx.orm.public.OrganizationContactPoint.where({ id: existingPhone.id }).update({
            value: normalizedPhone,
            isPrimary: true,
          });
        } else {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: listing.organizationId,
            locationId: listing.locationId || null,
            type: 'PHONE',
            value: normalizedPhone,
            isPrimary: true,
            isVerified: true,
          });
        }
      }

      // 6. Upsert Email Contact Point
      if (input.email && input.email.trim()) {
        const cleanEmail = input.email.trim().toLowerCase();
        const existingEmail = await tx.orm.public.OrganizationContactPoint.where({
          organizationId: listing.organizationId,
          type: 'EMAIL',
        }).all().first();

        if (existingEmail) {
          await tx.orm.public.OrganizationContactPoint.where({ id: existingEmail.id }).update({
            value: cleanEmail,
            isPrimary: !normalizedPhone,
          });
        } else {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: listing.organizationId,
            locationId: listing.locationId || null,
            type: 'EMAIL',
            value: cleanEmail,
            isPrimary: !normalizedPhone,
            isVerified: true,
          });
        }
      }
      // 7. Emit Governance Audit Event
      await tx.orm.public.HQAuditEvent.create({
        actorPersonId: person.id,
        action: 'LISTING_APPROVED',
        targetType: 'DiscoveryListing',
        targetId: listing.id,
        metadata: {
          title: cleanTitle,
          vertical: cleanVertical,
          organizationId: listing.organizationId,
        },
      });
    });

    return {
      success: true,
      message: `"${cleanTitle}" has been approved and published to the live city directory.`,
    };
  } catch (err: any) {
    console.error('Error approving scraped listing:', err);
    return { error: err.message || 'Failed to approve listing.' };
  }
}

/**
 * Reject or discard a low-quality scraped listing.
 */
export async function rejectScrapedListing(listingId: string, reason?: string) {
  const { person } = await requireAuthenticatedAccount();
  if (!person.isSystemAdmin) {
    throw new Error('FORBIDDEN: Only system administrators can reject listings.');
  }

  const listing = await db.orm.public.DiscoveryListing.where({ id: listingId }).all().first();
  if (!listing) {
    return { error: 'Listing not found.' };
  }

  try {
    let meta: any = {};
    try {
      if (listing.metadata) meta = JSON.parse(listing.metadata);
    } catch {}

    meta.approvalStatus = 'REJECTED';
    meta.rejectionReason = reason || 'Discarded during admin moderation';
    meta.rejectedBy = person.id;
    meta.rejectedAt = new Date().toISOString();

    await db.orm.public.DiscoveryListing.where({ id: listingId }).update({
      isActive: false,
      metadata: JSON.stringify(meta),
    });

    await db.orm.public.Organization.where({ id: listing.organizationId }).update({
      status: 'SUSPENDED' as any,
    });

    await db.orm.public.HQAuditEvent.create({
      actorPersonId: person.id,
      action: 'LISTING_REJECTED',
      targetType: 'DiscoveryListing',
      targetId: listingId,
      metadata: {
        title: listing.title,
        organizationId: listing.organizationId,
        reason: reason || 'Discarded during admin moderation',
      },
    });

    return { success: true, status: 'REJECTED' };
  } catch (err: any) {
    console.error('Error rejecting scraped listing:', err);
    return { error: err.message || 'Failed to reject listing.' };
  }
}

/**
 * Bulk approve multiple clean listings with one action.
 */
export async function bulkApproveScrapedListings(listingIds: string[]) {
  const { person } = await requireAuthenticatedAccount();
  if (!person.isSystemAdmin) {
    throw new Error('FORBIDDEN: Only system administrators can bulk approve listings.');
  }

  if (!listingIds || listingIds.length === 0) {
    return { error: 'No listings selected.' };
  }

  let approvedCount = 0;

  for (const id of listingIds) {
    const listing = await db.orm.public.DiscoveryListing.where({ id }).all().first();
    if (listing && !listing.isActive) {
      let meta: any = {};
      try {
        if (listing.metadata) meta = JSON.parse(listing.metadata);
      } catch {}

      meta.approvalStatus = 'APPROVED';
      meta.approvedBy = person.id;
      meta.approvedAt = new Date().toISOString();

      await db.orm.public.DiscoveryListing.where({ id: listing.id }).update({
        isActive: true,
        metadata: JSON.stringify(meta),
      });

      await db.orm.public.Organization.where({ id: listing.organizationId }).update({
        status: 'ACTIVE' as any,
      });

      approvedCount++;
    }
  }

  if (approvedCount > 0) {
    await db.orm.public.HQAuditEvent.create({
      actorPersonId: person.id,
      action: 'LISTING_BULK_APPROVED',
      targetType: 'DiscoveryListing',
      targetId: 'bulk',
      metadata: {
        approvedCount,
        listingIds: listingIds.slice(0, 50),
      },
    });
  }

  return {
    success: true,
    approvedCount,
    message: `Successfully approved and published ${approvedCount} listings.`,
  };
}
