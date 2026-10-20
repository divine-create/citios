'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { notifyPerson } from '@/lib/notify';
import { getTwoLetterInitials, resolveAvatarUrl } from '@/lib/identity';
import {
  parseReviewBody,
  serializeReviewBody,
  computeRatingDistribution,
  type ReviewFeedMetadata,
  type RatingDistribution,
  type ReviewOwnerReply,
} from '@/lib/reviews';

export interface HydratedReviewItem {
  id: string;
  organizationId: string;
  personId: string;
  authorName: string;
  authorInitials: string;
  avatarUrl: string | null;
  rating: number;
  text: string;
  photos: string[];
  tags: string[];
  isVerifiedCustomer: boolean;
  ownerReply: ReviewOwnerReply | null;
  createdAt: string;
  isMyReview: boolean;
}

export interface OrganizationReviewsBundle {
  reviews: HydratedReviewItem[];
  distribution: RatingDistribution;
  myReview: HydratedReviewItem | null;
}

/**
 * Checks whether a resident has an existing customer relationship, booking, or enquiry
 * with the target organization to earn the "Verified Customer" badge.
 */
async function checkVerifiedCustomerStatus(personId: string, organizationId: string): Promise<boolean> {
  try {
    const [relationship, booking, enquiry] = await Promise.all([
      db.orm.public.Relationship.where({ personId, organizationId }).first(),
      db.orm.public.Booking.where({ userId: personId, organizationId } as any).first().catch(() => null),
      db.orm.public.CustomerEnquiry.where({ personId, organizationId }).first().catch(() => null),
    ]);
    return Boolean(relationship || booking || enquiry);
  } catch {
    return false;
  }
}

/**
 * Recalculates an organization's rating and reviewCount from all its Review records
 * and syncs them into DiscoveryListing.metadata so cards across the platform stay fresh.
 */
export async function syncOrganizationRatingMetadata(organizationId: string): Promise<RatingDistribution> {
  const allReviews = await db.orm.public.Review.where({ organizationId }).all();
  const distribution = computeRatingDistribution(allReviews);

  try {
    const listing = await db.orm.public.DiscoveryListing.where({ organizationId }).first();
    if (listing) {
      let meta: Record<string, any> = {};
      if (listing.metadata) {
        try {
          meta = JSON.parse(listing.metadata);
        } catch {
          meta = {};
        }
      }
      meta.rating = distribution.averageRating ?? 0;
      meta.reviewCount = distribution.totalReviews;
      meta.ratingCounts = distribution.counts;

      await db.orm.public.DiscoveryListing.where({ id: listing.id }).update({
        metadata: JSON.stringify(meta),
      });
    }
  } catch (err) {
    console.error('Non-fatal error syncing DiscoveryListing rating metadata:', err);
  }

  return distribution;
}

/**
 * Fetches all reviews and rating distribution for an organization.
 */
export async function getOrganizationReviews(organizationId: string): Promise<OrganizationReviewsBundle> {
  let currentPersonId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    currentPersonId = session?.user?.personId ?? null;
  } catch {
    currentPersonId = null;
  }

  const rawReviews = await db.orm.public.Review.where({ organizationId })
    .include('person', (p: any) => p.include('profile'))
    .all();
  const distribution = computeRatingDistribution(rawReviews);

  if (rawReviews.length === 0) {
    return {
      reviews: [],
      distribution,
      myReview: null,
    };
  }

  // Fallback for any reviews missing the eager relation
  const missingPersonIds = Array.from(
    new Set(rawReviews.filter((r: any) => !r.person).map((r: any) => r.personId).filter(Boolean))
  );
  const fallbackPersons =
    missingPersonIds.length > 0
      ? await db.orm.public.Person.where((p: any) => p.id.in(missingPersonIds))
          .include('profile')
          .all()
      : [];
  const personMap = new Map<string, any>(fallbackPersons.map((p: any) => [p.id, p]));

  const hydrated: HydratedReviewItem[] = rawReviews
    .map((r: any) => {
      const person = r.person || personMap.get(r.personId);
      const firstName = (person?.firstName || '').trim();
      const lastName = (person?.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const authorName = fullName || 'Resident';
      const authorInitials = getTwoLetterInitials(authorName);
      const rawAvatar = person?.profile?.avatarUrl || null;
      const avatarUrl = resolveAvatarUrl(rawAvatar) || null;
      const parsed = parseReviewBody(r.body);

      return {
        id: r.id,
        organizationId: r.organizationId,
        personId: r.personId,
        authorName,
        authorInitials,
        avatarUrl,
        rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
        text: parsed.text,
        photos: parsed.photos,
        tags: parsed.tags,
        isVerifiedCustomer: parsed.isVerifiedCustomer,
        ownerReply: parsed.ownerReply,
        createdAt:
          typeof r.createdAt === 'string'
            ? new Date(r.createdAt).toISOString()
            : r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : new Date().toISOString(),
        isMyReview: Boolean(currentPersonId && r.personId === currentPersonId),
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const myReview = hydrated.find((r) => r.isMyReview) || null;

  return {
    reviews: hydrated,
    distribution,
    myReview,
  };
}

/**
 * Submits or updates a business review, syncs the business's rating metadata,
 * and automatically publishes a Yelp-style Review Card in the CityFeed newsfeed.
 */
export async function submitBusinessReview(input: {
  organizationId: string;
  rating: number;
  body?: string;
  photos?: string[];
  tags?: string[];
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session?.user?.personId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Please sign in to write a review.',
    };
  }

  try {
    const personId = session.user.personId as string;
    const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
    const cleanText = (input.body || '').trim();
    const photos = (input.photos || []).map((p) => p.trim()).filter(Boolean).slice(0, 6);
    const tags = (input.tags || []).map((t) => t.trim()).filter(Boolean).slice(0, 5);

    const org = await db.orm.public.Organization.where({ id: input.organizationId }).first();
    if (!org) {
      return { success: false, error: 'Business not found.' };
    }

    const isVerifiedCustomer = await checkVerifiedCustomerStatus(personId, org.id);

    const existing = await db.orm.public.Review.where({
      personId,
      organizationId: org.id,
    }).first();

    const existingParsed = existing ? parseReviewBody(existing.body) : null;

    const serializedBody = serializeReviewBody({
      text: cleanText,
      photos,
      tags,
      isVerifiedCustomer: isVerifiedCustomer || Boolean(existingParsed?.isVerifiedCustomer),
      ownerReply: existingParsed?.ownerReply ?? null,
    });

    let review: any;
    if (existing) {
      review = await db.orm.public.Review.where({ id: existing.id }).update({
        rating,
        body: serializedBody || null,
      });
      if (Array.isArray(review)) review = review[0];
      if (!review) review = { ...existing, rating, body: serializedBody };
    } else {
      review = await db.orm.public.Review.create({
        organizationId: org.id,
        personId,
        rating,
        body: serializedBody || null,
      });
    }

    // Resolve organization cover & category for the Yelp-style Newsfeed card
    const listing = await db.orm.public.DiscoveryListing.where({ organizationId: org.id }).first();
    let orgCover: string | null = org.logoAssetId || listing?.coverAssetId || null;
    if (!orgCover && listing?.metadata) {
      try {
        const lMeta = JSON.parse(listing.metadata);
        orgCover = lMeta.coverImage || lMeta.images?.[0] || null;
      } catch {}
    }

    // Resolve reviewer identity so the Newsfeed post unambiguously displays the real name and avatar
    const reviewerPerson = await db.orm.public.Person.where({ id: personId })
      .include('profile')
      .first();
    const reviewerFirstName = (reviewerPerson?.firstName || '').trim();
    const reviewerLastName = (reviewerPerson?.lastName || '').trim();
    const reviewerFullName = `${reviewerFirstName} ${reviewerLastName}`.trim();
    const authorName = reviewerFullName || (session.user as any)?.name || 'Resident';
    const authorAvatar = reviewerPerson?.profile?.avatarUrl || (session.user as any)?.image || null;
    const authorInitials = getTwoLetterInitials(authorName);

    const reviewFeedMeta: ReviewFeedMetadata = {
      isReviewCard: true,
      reviewId: review.id,
      rating,
      photos,
      tags,
      isVerifiedCustomer: isVerifiedCustomer || Boolean(existingParsed?.isVerifiedCustomer),
      reviewedOrgId: org.id,
      reviewedOrgName: org.name,
      reviewedOrgCategory: org.storeCategory || org.type || 'Local Business',
      reviewedOrgAddress: org.address || 'Calabar',
      reviewedOrgCover: orgCover,
      authorName,
      authorAvatar,
      authorInitials,
    };

    const postTitle = `${authorName} wrote a ${rating}.0 ★ review for ${org.name}`;
    const postContent =
      cleanText ||
      (tags.length > 0
        ? `Rated ${org.name} ${rating} out of 5 stars · ${tags.join(', ')}`
        : `Rated ${org.name} ${rating} out of 5 stars.`);

    // Automatically publish or update the Yelp-style Review Card in the Newsfeed
    const existingPost = await db.orm.public.Post.where({
      linkedEntityType: 'REVIEW',
      linkedEntityId: review.id,
    }).first();

    if (existingPost) {
      await db.orm.public.Post.where({ id: existingPost.id }).update({
        title: postTitle,
        content: postContent,
        category: 'Review',
        imageUrl: photos[0] || null,
        location: org.address || null,
        postMetadata: JSON.stringify(reviewFeedMeta),
      });
    } else {
      await db.orm.public.Post.create({
        title: postTitle,
        content: postContent,
        category: 'Review',
        status: 'PUBLISHED',
        isEmergency: false,
        personId,
        organizationId: org.id,
        linkedEntityType: 'REVIEW',
        linkedEntityId: review.id,
        imageUrl: photos[0] || undefined,
        location: org.address || undefined,
        postMetadata: JSON.stringify(reviewFeedMeta),
      });
    }

    // Sync rating distribution into DiscoveryListing.metadata
    const distribution = await syncOrganizationRatingMetadata(org.id);

    // Notify business managers
    try {
      const memberships = await db.orm.public.Membership.where({ organizationId: org.id }).all();
      for (const m of memberships) {
        if (m.personId && m.personId !== personId) {
          await notifyPerson(m.personId, {
            type: 'SYSTEM',
            title: `New ${rating}★ review for ${org.name}`,
            body: cleanText ? cleanText.slice(0, 100) : `A customer rated your business ${rating} stars.`,
            href: `/org/${org.id}`,
          });
        }
      }
    } catch {}

    try {
      revalidatePath(`/org/${org.id}`);
      revalidatePath('/services');
      revalidatePath('/market');
      revalidatePath('/food');
      revalidatePath('/stay');
      revalidatePath('/');
    } catch {}

    return {
      success: true,
      distribution,
      reviewId: review.id,
    };
  } catch (error: any) {
    console.error('Error submitting business review:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit review.',
    };
  }
}

/**
 * Allows a verified manager/member of an organization to post an official owner response
 * to a customer review on their business profile.
 */
export async function replyToBusinessReview(input: {
  reviewId: string;
  replyText: string;
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session?.user?.personId) {
    return { success: false, error: 'Unauthorized' };
  }

  const personId = session.user.personId as string;
  const replyText = (input.replyText || '').trim();
  if (!replyText) {
    return { success: false, error: 'Reply cannot be empty.' };
  }

  const review = await db.orm.public.Review.where({ id: input.reviewId }).first();
  if (!review) {
    return { success: false, error: 'Review not found.' };
  }

  const membership = await db.orm.public.Membership.where({
    organizationId: review.organizationId,
    personId,
  }).first();
  const person = await db.orm.public.Person.where({ id: personId }).first();

  if (!membership && !person?.isSystemAdmin) {
    return { success: false, error: 'Only business managers can reply to reviews.' };
  }

  const org = await db.orm.public.Organization.where({ id: review.organizationId }).first();
  const parsed = parseReviewBody(review.body);

  const updatedBody = serializeReviewBody({
    text: parsed.text,
    photos: parsed.photos,
    tags: parsed.tags,
    isVerifiedCustomer: parsed.isVerifiedCustomer,
    ownerReply: {
      text: replyText,
      repliedAt: new Date().toISOString(),
      authorName: org?.name ? `${org.name} (Owner)` : 'Business Owner',
    },
  });

  await db.orm.public.Review.where({ id: review.id }).update({
    body: updatedBody,
  });

  if (review.personId !== personId) {
    try {
      await notifyPerson(review.personId, {
        type: 'SYSTEM',
        title: `${org?.name || 'Business'} replied to your review`,
        body: replyText.slice(0, 100),
        href: `/org/${review.organizationId}`,
      });
    } catch {}
  }

  try {
    revalidatePath(`/org/${review.organizationId}`);
  } catch {}

  return { success: true };
}
