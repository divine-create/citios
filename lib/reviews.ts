export interface ReviewOwnerReply {
  text: string;
  repliedAt: string;
  authorName: string;
}

export interface ParsedReviewContent {
  text: string;
  photos: string[];
  tags: string[];
  isVerifiedCustomer: boolean;
  ownerReply: ReviewOwnerReply | null;
}

export interface ReviewFeedMetadata {
  isReviewCard: true;
  reviewId: string;
  rating: number;
  photos: string[];
  tags: string[];
  isVerifiedCustomer: boolean;
  reviewedOrgId: string;
  reviewedOrgName: string;
  reviewedOrgCategory: string;
  reviewedOrgAddress: string;
  reviewedOrgCover?: string | null;
  authorName?: string;
  authorAvatar?: string | null;
  authorInitials?: string;
}

export const REVIEW_VIBE_TAGS = [
  'Great Quality',
  'Fast Service',
  'Fair Pricing',
  'Friendly Staff',
  'Authentic',
  'Clean & Welcoming',
  'Reliable',
  'Highly Recommended',
] as const;

export const RATING_LABELS: Record<number, string> = {
  1: 'Not good',
  2: 'Could be better',
  3: 'OK / Average',
  4: 'Very good',
  5: 'Excellent!',
};

const REVIEW_META_DELIMITER = '\n---9JALIVE_REVIEW_META---\n';

/**
 * Serializes a review's text along with optional photos, tags, verified badge, and owner reply
 * into the `Review.body` column while keeping the leading text human-readable.
 */
export function serializeReviewBody(input: {
  text: string;
  photos?: string[];
  tags?: string[];
  isVerifiedCustomer?: boolean;
  ownerReply?: ReviewOwnerReply | null;
}): string {
  const cleanText = (input.text || '').trim();
  const photos = (input.photos || []).map((p) => p.trim()).filter(Boolean);
  const tags = (input.tags || []).map((t) => t.trim()).filter(Boolean);
  const isVerifiedCustomer = Boolean(input.isVerifiedCustomer);
  const ownerReply = input.ownerReply || null;

  if (photos.length === 0 && tags.length === 0 && !isVerifiedCustomer && !ownerReply) {
    return cleanText;
  }

  const metaJson = JSON.stringify({
    photos,
    tags,
    isVerifiedCustomer,
    ownerReply,
  });

  return `${cleanText}${REVIEW_META_DELIMITER}${metaJson}`;
}

/**
 * Parses `Review.body` into structured text, photos, tags, verified status, and owner reply.
 * Gracefully handles legacy plain-text review bodies.
 */
export function parseReviewBody(rawBody?: string | null): ParsedReviewContent {
  if (!rawBody) {
    return {
      text: '',
      photos: [],
      tags: [],
      isVerifiedCustomer: false,
      ownerReply: null,
    };
  }

  const parts = rawBody.split(REVIEW_META_DELIMITER);
  const text = (parts[0] || '').trim();

  if (parts.length < 2) {
    return {
      text,
      photos: [],
      tags: [],
      isVerifiedCustomer: false,
      ownerReply: null,
    };
  }

  try {
    const parsed = JSON.parse(parts[1]);
    return {
      text,
      photos: Array.isArray(parsed.photos) ? parsed.photos.filter((p: any) => typeof p === 'string' && p.trim()) : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: any) => typeof t === 'string' && t.trim()) : [],
      isVerifiedCustomer: Boolean(parsed.isVerifiedCustomer),
      ownerReply:
        parsed.ownerReply && typeof parsed.ownerReply.text === 'string'
          ? {
              text: parsed.ownerReply.text,
              repliedAt: parsed.ownerReply.repliedAt || new Date().toISOString(),
              authorName: parsed.ownerReply.authorName || 'Business Owner',
            }
          : null,
    };
  } catch {
    return {
      text,
      photos: [],
      tags: [],
      isVerifiedCustomer: false,
      ownerReply: null,
    };
  }
}

export interface RatingDistribution {
  averageRating: number | null;
  totalReviews: number;
  counts: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

export function computeRatingDistribution(reviews: { rating: number }[]): RatingDistribution {
  const counts: { 5: number; 4: number; 3: number; 2: number; 1: number } = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  let sum = 0;
  let validCount = 0;

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0))) as 1 | 2 | 3 | 4 | 5;
    if (star >= 1 && star <= 5) {
      counts[star] += 1;
      sum += star;
      validCount += 1;
    }
  }

  return {
    averageRating: validCount > 0 ? Number((sum / validCount).toFixed(1)) : null,
    totalReviews: validCount,
    counts,
  };
}
