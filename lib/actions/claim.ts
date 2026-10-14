'use server';

import { db } from '@/src/prisma/db';
import { requireAuthenticatedAccount } from '@/lib/actions/tenant';
import { normalizePhoneNumber } from '@/lib/identity';
import { v4 as uuidv4 } from 'uuid';

export interface SubmitClaimInput {
  organizationId: string;
  claimantName?: string;
  claimantPhone?: string;
  businessAddress?: string;
  businessRole?: string;
  notes?: string;
  // Backward compatibility
  evidenceType?: string;
  evidenceData?: string;
}

export async function submitOrganizationClaim(input: SubmitClaimInput) {
  const { person } = await requireAuthenticatedAccount();

  const org = await db.orm.public.Organization.where({ id: input.organizationId }).all().first();
  if (!org) {
    return { error: 'Organization not found.' };
  }

  // Check if organization already has an active OWNER membership
  const existingMemberships = await db.orm.public.Membership.where({ organizationId: org.id }).all();
  for (const m of existingMemberships) {
    const roles = await db.orm.public.MembershipRole.where({ membershipId: m.id, role: 'OWNER' }).all();
    if (roles.length > 0) {
      if (m.personId === person.id) {
        return { error: 'You already own this organization.' };
      }
      return { error: 'This organization is already claimed and managed by a verified owner. Please file a dispute if you believe this is in error.' };
    }
  }

  // Check if claimant already has a pending claim for this organization
  const pendingClaim = await db.orm.public.OrganizationClaim.where({
    organizationId: org.id,
    claimantPersonId: person.id,
    status: 'PENDING',
  }).all().first();

  if (pendingClaim) {
    return { error: 'You already have a pending claim under review for this business.' };
  }

  // Determine claim mode: information-based (Name, Phone, Address) or legacy/direct
  const isInformationBased = !!(input.claimantName || input.claimantPhone || input.businessAddress);
  let evidenceType = input.evidenceType || 'INFORMATION_VERIFICATION';
  let evidenceData = input.evidenceData || null;

  if (isInformationBased) {
    const name = (input.claimantName || '').trim();
    const phone = (input.claimantPhone || '').trim();
    const address = (input.businessAddress || '').trim();

    if (!name || name.length < 2) {
      return { error: 'Please enter your full name.' };
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return { error: 'Please enter a valid Nigerian phone number (e.g. 08012345678).' };
    }

    if (!address || address.length < 3) {
      return { error: 'Please enter the physical business address.' };
    }

    evidenceType = 'INFORMATION_VERIFICATION';
    evidenceData = JSON.stringify({
      claimantName: name,
      claimantPhone: normalizedPhone,
      businessAddress: address,
      businessRole: (input.businessRole || 'Owner').trim(),
      submittedAt: new Date().toISOString(),
    });
  }

  try {
    const claimId = uuidv4();
    await db.orm.public.OrganizationClaim.create({
      id: claimId,
      organizationId: org.id,
      claimantPersonId: person.id,
      status: 'PENDING',
      evidenceType,
      evidenceData: evidenceData || null,
      claimantNotes: input.notes?.trim() || null,
    });

    return {
      success: true,
      claimId,
      message: 'Your claim request has been submitted. Our team will verify the information provided.',
    };
  } catch (err: any) {
    console.error('Error submitting claim:', err);
    return { error: err.message || 'Failed to submit claim request.' };
  }
}

function toTemporal(date: Date = new Date()) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

/**
 * Administrative action: Approve or reject an organization claim.
 * Approving creates a canonical Membership with OWNER role.
 */
export async function reviewOrganizationClaim(
  claimId: string,
  decision: 'APPROVE' | 'REJECT',
  reviewerNotes?: string
) {
  const { person } = await requireAuthenticatedAccount();

  // In CityOS, review actions require isSystemAdmin
  if (!person.isSystemAdmin) {
    throw new Error('FORBIDDEN: Only system administrators can review business claims.');
  }

  const claim = await db.orm.public.OrganizationClaim.where({ id: claimId }).all().first();
  if (!claim) {
    return { error: 'Claim request not found.' };
  }

  if (claim.status !== 'PENDING' && claim.status !== 'UNDER_REVIEW') {
    return { error: `Claim has already been resolved (${claim.status}).` };
  }

  try {
    if (decision === 'REJECT') {
      await db.orm.public.OrganizationClaim.where({ id: claimId }).update({
        status: 'REJECTED',
        reviewerPersonId: person.id,
        reviewerNotes: reviewerNotes?.trim() || null,
        reviewedAt: toTemporal(),
      });
      return { success: true, status: 'REJECTED' };
    }

    // APPROVE flow: Atomically establish ownership
    await db.transaction(async (tx: any) => {
      // 1. Mark claim approved
      await tx.orm.public.OrganizationClaim.where({ id: claimId }).update({
        status: 'APPROVED',
        reviewerPersonId: person.id,
        reviewerNotes: reviewerNotes?.trim() || null,
        reviewedAt: toTemporal(),
      });

      // 2. Check if a Membership already exists for this person
      let membership = await tx.orm.public.Membership.where({
        organizationId: claim.organizationId,
        personId: claim.claimantPersonId,
      }).all().first();

      if (!membership) {
        membership = await tx.orm.public.Membership.create({
          id: uuidv4(),
          organizationId: claim.organizationId,
          personId: claim.claimantPersonId,
        });
      }

      // 3. Grant OWNER role
      const existingRole = await tx.orm.public.MembershipRole.where({
        membershipId: membership.id,
        role: 'OWNER',
      }).all().first();

      if (!existingRole) {
        await tx.orm.public.MembershipRole.create({
          id: uuidv4(),
          membershipId: membership.id,
          role: 'OWNER',
        });
      }

      // 4. Bind to primary Location if location exists
      const loc = await tx.orm.public.Location.where({ organizationId: claim.organizationId }).all().first();
      if (loc) {
        const memLoc = await tx.orm.public.MembershipLocation.where({
          membershipId: membership.id,
          locationId: loc.id,
        }).all().first();

        if (!memLoc) {
          await tx.orm.public.MembershipLocation.create({
            id: uuidv4(),
            membershipId: membership.id,
            locationId: loc.id,
          });
        }
      }

      // 5. Ensure organization Wallet exists
      const wallet = await tx.orm.public.Wallet.where({ organizationId: claim.organizationId }).all().first();
      if (!wallet) {
        await tx.orm.public.Wallet.create({
          id: uuidv4(),
          organizationId: claim.organizationId,
          balance: 0.0,
          currency: 'NGN',
        });
      }
    });

    return { success: true, status: 'APPROVED' };
  } catch (err: any) {
    console.error('Error reviewing claim:', err);
    return { error: err.message || 'Failed to review claim.' };
  }
}

/**
 * Retrieve claim requests submitted by the authenticated resident.
 */
export async function getMyOrganizationClaims() {
  const { person } = await requireAuthenticatedAccount();
  const claims = await db.orm.public.OrganizationClaim.where({
    claimantPersonId: person.id,
  }).all();

  return JSON.parse(JSON.stringify(claims));
}

/**
 * Retrieve all pending claims for CityOS administrators to review.
 */
export async function getPendingOrganizationClaims() {
  const { person } = await requireAuthenticatedAccount();
  if (!person.isSystemAdmin) {
    throw new Error('FORBIDDEN: Only system administrators can review business claims.');
  }

  const claims = await db.orm.public.OrganizationClaim.where({
    status: 'PENDING',
  }).all();

  const enriched = await Promise.all(
    claims.map(async (claim) => {
      const org = await db.orm.public.Organization.where({ id: claim.organizationId }).all().first();
      const loc = await db.orm.public.Location.where({ organizationId: claim.organizationId }).all().first();
      const claimant = await db.orm.public.Person.where({ id: claim.claimantPersonId }).all().first();
      const contactPoints = await db.orm.public.OrganizationContactPoint.where({ organizationId: claim.organizationId }).all();

      let info: any = {};
      try {
        if (claim.evidenceData) {
          info = JSON.parse(claim.evidenceData);
        }
      } catch {
        info = { raw: claim.evidenceData };
      }

      return {
        id: claim.id,
        organizationId: claim.organizationId,
        organizationName: org?.name || 'Unknown Business',
        organizationType: org?.type || 'Business',
        listedAddress: loc?.address || org?.address || 'Not specified',
        status: claim.status,
        claimantPersonId: claim.claimantPersonId,
        claimantAccountName: claimant ? `${claimant.firstName} ${claimant.lastName}` : 'Unknown',
        submittedInfo: {
          name: info.claimantName || (claimant ? `${claimant.firstName} ${claimant.lastName}` : 'Not provided'),
          phone: info.claimantPhone || 'Not provided',
          address: info.businessAddress || 'Not provided',
          role: info.businessRole || 'Owner',
        },
        claimantNotes: claim.claimantNotes,
        listedContactPoints: contactPoints.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary })),
        createdAt: claim.createdAt,
      };
    })
  );

  return JSON.parse(JSON.stringify(enriched));
}
