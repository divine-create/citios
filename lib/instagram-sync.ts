import { db } from '@/src/prisma/db';

export interface InstagramSyncTarget {
  slug: string;
  name: string;
  instagramHandle: string;
  defaultCategory: 'Food' | 'Marketplace' | 'Events' | 'Announcement';
}

/**
 * Curated list of verified Calabar businesses and their official public Instagram handles.
 * Any business in DiscoveryListing with `metadata.instagram` is also automatically included.
 */
export const CALABAR_INSTAGRAM_TARGETS: InstagramSyncTarget[] = [
  {
    slug: 'axari-hotel-calabar',
    name: 'Axari Hotel & Suites',
    instagramHandle: 'axarihotel',
    defaultCategory: 'Announcement',
  },
  {
    slug: 'transcorp-hotels-calabar',
    name: 'Transcorp Hotels Calabar',
    instagramHandle: 'transcorphotelscalabar',
    defaultCategory: 'Announcement',
  },
  {
    slug: 'hogis-royale-and-suites',
    name: 'Hogis Royale & Suites',
    instagramHandle: 'hogisgroup',
    defaultCategory: 'Events',
  },
  {
    slug: 'crunchies-fried-chicken-calabar',
    name: 'Crunchies Fried Chicken',
    instagramHandle: 'crunchiesfriedchicken',
    defaultCategory: 'Food',
  },
  {
    slug: 'hit-fm-calabar',
    name: 'Hit 95.9 FM Calabar',
    instagramHandle: 'hitfmcalabar',
    defaultCategory: 'Events',
  },
  {
    slug: 'spar-calabar',
    name: 'SPAR Market Calabar',
    instagramHandle: 'sparnigeria',
    defaultCategory: 'Marketplace',
  },
  {
    slug: 'medplus-pharmacy-calabar',
    name: 'MedPlus Pharmacy Calabar',
    instagramHandle: 'medplusnig',
    defaultCategory: 'Marketplace',
  },
];

export interface CleanedInstagramPost {
  title: string;
  content: string;
  category: string;
  price?: number;
  isLowSignal: boolean;
}

/**
 * Cleans raw Instagram captions by stripping hashtag blocks, "link in bio" boilerplate,
 * extracting Naira prices if present, and inferring the best 9jaLive feed category.
 */
export function cleanInstagramCaption(
  rawCaption: string | null | undefined,
  businessName: string,
  defaultCategory: string = 'Announcement'
): CleanedInstagramPost {
  if (!rawCaption || typeof rawCaption !== 'string') {
    return {
      title: `${businessName} Update`,
      content: `New update from ${businessName} in Calabar.`,
      category: defaultCategory,
      isLowSignal: true,
    };
  }

  let text = rawCaption.trim();

  // 1. Remove trailing blocks of hashtags (e.g. "\n.\n.\n#calabar #crs #nigeria")
  text = text.replace(/(?:[\r\n]+\s*[.•·-]\s*)+[\r\n]*/g, '\n\n');
  text = text.replace(/(?:\s*#[\p{L}\p{N}_]+){3,}\s*$/gu, '').trim();

  // 2. Remove standalone lines that are purely hashtags
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return true;
      const withoutTags = line.replace(/#[\p{L}\p{N}_]+/gu, '').trim();
      return withoutTags.length > 0;
    });

  text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // 3. StripRemaining inline "#" symbols when there are still >3 hashtags scattered
  const inlineHashtagMatches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  if (inlineHashtagMatches.length > 3) {
    text = text.replace(/#([\p{L}\p{N}_]+)/gu, '$1').trim();
  }

  // 4. Remove "link in bio" boilerplate sentences
  text = text
    .replace(/check\s+(?:the\s+)?link\s+in\s+(?:our\s+)?bio[^.\n]*[.\n]?/gi, '')
    .replace(/click\s+(?:the\s+)?link\s+in\s+(?:our\s+)?bio[^.\n]*[.\n]?/gi, '')
    .trim();

  // 5. Extract first Naira price if mentioned (e.g. ₦5,500 or NGN 12,000 or N4,500)
  let price: number | undefined = undefined;
  const priceMatch = text.match(/(?:₦|NGN\s*)([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,7})/i);
  if (priceMatch && priceMatch[1]) {
    const parsedPrice = Number(priceMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(parsedPrice) && parsedPrice >= 100 && parsedPrice <= 50_000_000) {
      price = parsedPrice;
    }
  }

  // 6. Infer category from keywords
  const lower = text.toLowerCase();
  let category = defaultCategory;
  if (/\b(ticket|event|live band|friday night|saturday night|party|concert|rsvp|show|festival|karaoke)\b/.test(lower)) {
    category = 'Events';
  } else if (/\b(menu|lunch|dinner|breakfast|delicacy|soup|rice|chicken|shawarma|grill|freshly prepared|order now)\b/.test(lower)) {
    category = 'Food';
  } else if (/\b(discount|promo|sale|in stock|new arrival|price|available in store|shop now)\b/.test(lower)) {
    category = 'Marketplace';
  }

  // 7. Build concise title from the first meaningful line/sentence
  const firstLine = (text.split(/\r?\n/).find((l) => l.trim().length > 2) || '').trim();
  let title = firstLine.split(/(?<=[.!?])\s+/)[0] || `${businessName} Update`;
  if (title.length > 90) {
    title = title.slice(0, 87).trim() + '...';
  }
  if (!title || title.length < 3) {
    title = `${businessName} Update`;
  }

  const isLowSignal = text.length < 10;

  return {
    title,
    content: text || `Latest update from ${businessName} in Calabar.`,
    category,
    price,
    isLowSignal,
  };
}

export interface RawInstagramPostInput {
  shortcode: string;
  caption: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  fallbackImageUrl?: string | null;
  permalink?: string | null;
  timestampIso?: string | null;
  instagramHandle: string;
}

/**
 * Resolves all active Calabar organizations that have an Instagram handle configured
 * (either via DiscoveryListing.metadata.instagram or CALABAR_INSTAGRAM_TARGETS).
 */
export async function resolveCalabarInstagramTargets(filterSlugOrHandle?: string) {
  const listings = await db.orm.public.DiscoveryListing.where({ isActive: true }).all();
  const orgIds = Array.from(new Set(listings.map((l: any) => l.organizationId).filter(Boolean)));
  const orgs = orgIds.length > 0
    ? await db.orm.public.Organization.where((o: any) => o.id.in(orgIds)).all()
    : [];
  const orgMap = new Map<string, any>(orgs.map((o: any) => [o.id, o]));

  const resolved: {
    organizationId: string;
    slug: string;
    name: string;
    instagramHandle: string;
    defaultCategory: string;
    address: string | null;
  }[] = [];
  const seenOrgIds = new Set<string>();

  for (const listing of listings) {
    const org = orgMap.get(listing.organizationId);
    if (!org || org.status === 'SUSPENDED') continue;

    let meta: any = {};
    try {
      if (listing.metadata) {
        meta = typeof listing.metadata === 'string' ? JSON.parse(listing.metadata) : listing.metadata;
      }
    } catch {}

    const curated = CALABAR_INSTAGRAM_TARGETS.find(
      (t) =>
        t.slug === listing.slug ||
        t.name.toLowerCase() === org.name.toLowerCase()
    );

    const rawHandle = meta.instagram || meta.instagramHandle || curated?.instagramHandle || null;
    if (!rawHandle) continue;

    const cleanHandle = String(rawHandle)
      .trim()
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/.*$/, '')
      .trim();

    if (!cleanHandle) continue;
    if (seenOrgIds.has(org.id)) continue;

    if (filterSlugOrHandle) {
      const q = filterSlugOrHandle.toLowerCase().replace(/^@/, '');
      const matchSlug = (listing.slug || '').toLowerCase() === q;
      const matchHandle = cleanHandle.toLowerCase() === q;
      const matchId = org.id.toLowerCase() === q;
      if (!matchSlug && !matchHandle && !matchId) continue;
    }

    seenOrgIds.add(org.id);
    resolved.push({
      organizationId: org.id,
      slug: listing.slug || org.id,
      name: org.name,
      instagramHandle: cleanHandle,
      defaultCategory: curated?.defaultCategory || 'Announcement',
      address: org.address || meta.address || 'Calabar',
    });
  }

  return resolved;
}

/**
 * Idempotently saves an Instagram post into `Post` (and its photo into `Asset` so CDN links never expire).
 */
export async function syncInstagramPostToCityOS(
  target: {
    organizationId: string;
    slug: string;
    name: string;
    defaultCategory?: string;
    address?: string | null;
  },
  post: RawInstagramPostInput
): Promise<{ action: 'created' | 'skipped_duplicate' | 'skipped_low_signal'; postId?: string }> {
  const shortcode = (post.shortcode || '').trim();
  if (!shortcode) {
    throw new Error('Instagram post shortcode is required for deduplication');
  }

  // 1. Check deduplication via @@unique([linkedEntityType, linkedEntityId])
  const existing = await db.orm.public.Post.where({
    linkedEntityType: 'INSTAGRAM_POST',
    linkedEntityId: shortcode,
  }).first();

  if (existing) {
    return { action: 'skipped_duplicate', postId: existing.id };
  }

  // 2. Clean caption & infer category
  const cleaned = cleanInstagramCaption(
    post.caption,
    target.name,
    target.defaultCategory || 'Announcement'
  );

  // If there is no image and the caption is tiny/empty, skip low-signal post
  if (cleaned.isLowSignal && !post.imageBase64 && !post.fallbackImageUrl) {
    return { action: 'skipped_low_signal' };
  }

  // 3. Store permanent image in `Asset` table if base64 image data was captured
  let permanentImageUrl: string | undefined = undefined;
  if (post.imageBase64) {
    const cleanBase64 = post.imageBase64.replace(/^data:[^;]+;base64,/, '');
    const byteSize = Math.floor((cleanBase64.length * 3) / 4);
    const mimeType = post.imageMimeType || 'image/jpeg';
    const asset = await db.orm.public.Asset.create({
      organizationId: target.organizationId,
      fileName: `ig-${shortcode}.jpg`,
      mimeType,
      size: byteSize,
      data: cleanBase64,
    });
    permanentImageUrl = `/api/assets/${asset.id}`;
  } else if (post.fallbackImageUrl) {
    permanentImageUrl = post.fallbackImageUrl;
  }

  const instagramUrl = post.permalink || `https://www.instagram.com/p/${shortcode}/`;
  const metadataPayload = {
    source: 'INSTAGRAM',
    instagramHandle: post.instagramHandle.replace(/^@/, ''),
    instagramUrl,
    shortcode,
    syncedAt: new Date().toISOString(),
    originalTimestamp: post.timestampIso || null,
    href: {
      url: `/org/${target.slug || target.organizationId}`,
      label: `View ${target.name} →`,
    },
  };

  const created = await db.orm.public.Post.create({
    title: cleaned.title,
    content: cleaned.content,
    category: cleaned.category,
    price: cleaned.price,
    imageUrl: permanentImageUrl,
    location: target.address || 'Calabar',
    organizationId: target.organizationId,
    linkedEntityType: 'INSTAGRAM_POST',
    linkedEntityId: shortcode,
    postMetadata: JSON.stringify(metadataPayload),
    status: 'PUBLISHED',
    isEmergency: false,
  });

  return { action: 'created', postId: created.id };
}
