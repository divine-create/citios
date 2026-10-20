'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireMembership } from '@/lib/actions/tenant';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { getHotelOrgs, getHotelRooms } from '@/lib/actions/resident';
import { isHotelOSReservationEnabled } from '@/lib/actions/hotel';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export type StayCategory =
  | 'Hotel'
  | 'Short-Let'
  | 'Guest House'
  | 'Serviced Suite'
  | 'Entire Home'
  | 'Rental';

export interface CreateStayInput {
  hostType?: 'PERSONAL' | 'ORGANIZATION';
  organizationId?: string;
  title: string;
  stayCategory: StayCategory;
  description?: string;
  neighborhood: string;
  address: string;
  price: number;
  pricePeriod?: 'night' | 'month' | 'year';
  compareAtPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  bedType?: string;
  amenities?: string[];
  images?: string[];
  whatsappPhone: string;
  bookingUrl?: string;
  shareToFeed?: boolean;
  citySlug?: string;
}

const DEFAULT_HOTEL_WHATSAPP = '2348065373747';

export async function getDefaultHotelWhatsApp(): Promise<string> {
  return DEFAULT_HOTEL_WHATSAPP;
}

function cleanWhatsAppNumber(raw?: string | null): string {
  let clean = (raw || '').trim().replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.substring(1);
  if (clean.startsWith('0')) clean = '234' + clean.substring(1);
  if (!clean || clean === '2348067154233' || clean === '2348000000000') {
    return DEFAULT_HOTEL_WHATSAPP;
  }
  return clean;
}

export async function createUniversalStay(input: CreateStayInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return { error: 'Please sign in to list a stay or property.' };
    }
    const personId = session.user.personId;

    const title = (input.title || '').trim();
    const neighborhood = (input.neighborhood || '').trim();
    const address = (input.address || '').trim() || neighborhood;
    const whatsappPhone = cleanWhatsAppNumber(input.whatsappPhone || '');

    if (!title || !neighborhood) {
      return { error: 'Property title and neighborhood/area are required.' };
    }
    if (!whatsappPhone || whatsappPhone.length < 8) {
      return { error: 'Please provide a valid WhatsApp or contact phone number for guest bookings.' };
    }

    const price = Math.max(0, Number(input.price) || 0);
    if (price <= 0) {
      return { error: 'Please enter a valid rate in Naira (₦).' };
    }

    const targetCity = input.citySlug
      ? (await getCityBySlug(input.citySlug)) || (await getCurrentCity())
      : await getCurrentCity();

    const fallbackCity = targetCity || (await db.orm.public.City.all().first());
    if (!fallbackCity) {
      return { error: 'No active city found in the platform.' };
    }

    const isBusinessHost = input.hostType === 'ORGANIZATION' && Boolean(input.organizationId);
    let targetOrgId = input.organizationId || '';
    let hostName = session.user.name || 'Verified Host';

    if (isBusinessHost && targetOrgId) {
      await requireMembership(targetOrgId, ['OWNER', 'ADMIN', 'MANAGER']);
      const org = await db.orm.public.Organization.where({ id: targetOrgId }).first();
      if (org?.name) hostName = org.name;
    } else {
      const person = await db.orm.public.Person.where({ id: personId }).first();
      if (person) {
        hostName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || hostName;
      }

      const hubOrgName = `${fallbackCity.name} Community Stays`;
      const existingHubs = await db.orm.public.Organization.where({ name: hubOrgName }).all();
      let hubOrg = existingHubs[0] || null;

      if (!hubOrg) {
        hubOrg = await db.orm.public.Organization.create({
          name: hubOrgName,
          type: 'SERVICES',
          description: `Community-hosted short-lets, apartments, and stays in ${fallbackCity.name}.`,
          address: fallbackCity.name,
          status: 'ACTIVE',
        });
      }
      targetOrgId = hubOrg.id;
    }

    const listingId = uuidv4();
    const images = (input.images || []).map((u) => u.trim()).filter(Boolean);
    const coverImage = images[0] || null;
    const amenities = Array.from(new Set((input.amenities || []).map((a) => a.trim()).filter(Boolean)));
    const pricePeriod = input.pricePeriod || (input.stayCategory === 'Rental' ? 'year' : 'night');
    const bedrooms = Math.max(0, Number(input.bedrooms) || 1);
    const bathrooms = Math.max(1, Number(input.bathrooms) || 1);
    const maxGuests = Math.max(1, Number(input.maxGuests) || 2);

    const normalizedBookingUrl = input.bookingUrl?.trim()
      ? /^https?:\/\//i.test(input.bookingUrl.trim())
        ? input.bookingUrl.trim()
        : `https://${input.bookingUrl.trim()}`
      : null;

    const metadataObj = {
      isUniversalStay: true,
      stayCategory: input.stayCategory || 'Short-Let',
      price,
      startingPrice: price,
      pricePeriod,
      compareAtPrice: input.compareAtPrice && Number(input.compareAtPrice) > price ? Number(input.compareAtPrice) : null,
      neighborhood,
      address,
      bedrooms,
      bathrooms,
      maxGuests,
      bedType: input.bedType?.trim() || `${bedrooms} Bedroom${bedrooms === 1 ? '' : 's'}`,
      roomType: `${input.stayCategory || 'Short-Let'} · ${bedrooms} Bed · ${bathrooms} Bath`,
      amenities,
      images,
      coverImage,
      whatsappPhone,
      bookingUrl: normalizedBookingUrl,
      hostType: isBusinessHost ? 'ORGANIZATION' : 'PERSONAL',
      hostPersonId: personId,
      hostName,
      organizationId: isBusinessHost ? targetOrgId : null,
      hasPowerGuarantee: amenities.some((a) => /power|inverter|generator|24\/7/i.test(a)),
      freeCancellation: amenities.some((a) => /cancellation/i.test(a)),
      breakfastIncluded: amenities.some((a) => /breakfast/i.test(a)),
      createdAt: new Date().toISOString(),
    };

    await db.transaction(async (tx) => {
      await tx.orm.public.DiscoveryListing.create({
        id: listingId,
        organizationId: targetOrgId,
        cityId: fallbackCity.id,
        vertical: `STAY_LISTING_${listingId}`,
        slug: `stay-${listingId}`,
        title,
        description: (input.description || '').trim() || null,
        coverAssetId: coverImage,
        isActive: true,
        metadata: JSON.stringify(metadataObj),
      });

      if (input.shareToFeed !== false) {
        const summary = (input.description || '').trim();
        const amenityLine = amenities.length > 0 ? `\n✨ ${amenities.slice(0, 5).join(' · ')}` : '';
        const feedContent = `${summary || `New ${input.stayCategory || 'Stay'} available in ${neighborhood}, ${fallbackCity.name}.`}${amenityLine}\n📍 ${neighborhood}${address && address !== neighborhood ? ` — ${address}` : ''}`;

        await tx.orm.public.Post.create({
          title: `${title} (${input.stayCategory || 'Stay'})`,
          content: feedContent,
          category: 'Housing',
          status: 'PUBLISHED',
          isEmergency: false,
          imageUrl: coverImage,
          location: `${neighborhood}, ${fallbackCity.name}`,
          price,
          personId,
          organizationId: isBusinessHost ? targetOrgId : null,
          linkedEntityType: 'STAY',
          linkedEntityId: listingId,
        });
      }
    });

    try {
      revalidatePath('/stay');
      revalidatePath(`/stay/${listingId}`);
      revalidatePath('/house');
      revalidatePath('/feed');
      revalidatePath('/');
    } catch {}

    return { success: true, stayId: listingId };
  } catch (err: any) {
    console.error('[createUniversalStay] Error:', err);
    return { error: err.message || 'Failed to publish stay listing.' };
  }
}

export async function deleteUniversalStay(stayId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return { error: 'Unauthorized' };
    }
    const personId = session.user.personId;

    const listing = await db.orm.public.DiscoveryListing.where({ id: stayId }).first();
    if (!listing) {
      return { error: 'Stay listing not found.' };
    }

    let meta: any = {};
    if (listing.metadata) {
      try {
        meta = JSON.parse(listing.metadata);
      } catch {}
    }

    const isCreator = meta.hostPersonId && meta.hostPersonId === personId;
    const isSystemAdmin = (session.user as any)?.role === 'SYSTEM_ADMIN' || (session.user as any)?.isSystemAdmin;

    if (!isCreator && !isSystemAdmin) {
      await requireMembership(listing.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.DiscoveryListing.where({ id: stayId }).delete();
      const linkedPosts = await tx.orm.public.Post.where({
        linkedEntityType: 'STAY',
        linkedEntityId: stayId,
      }).all();
      for (const p of linkedPosts) {
        await tx.orm.public.Post.where({ id: p.id }).delete();
      }
    });

    try {
      revalidatePath('/stay');
      revalidatePath('/house');
      revalidatePath('/feed');
      revalidatePath('/');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[deleteUniversalStay] Error:', err);
    return { error: err.message || 'Failed to delete listing.' };
  }
}

export async function getAllStays(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  const hotels = await getHotelOrgs(citySlug);

  const normalizedHotels = hotels.map((h: any) => ({
    ...h,
    stayCategory: h.stayCategory || 'Hotel',
    pricePeriod: 'night',
    hostName: h.name,
    hostType: 'ORGANIZATION',
    isHotelOrg: true,
  }));

  const allListings = await db.orm.public.DiscoveryListing.all();
  const stayListings = allListings.filter((l: any) => {
    if (!l.isActive) return false;
    if (!String(l.vertical || '').startsWith('STAY_LISTING_')) return false;
    if (city && l.cityId && l.cityId !== city.id) return false;
    return true;
  });

  stayListings.sort((a: any, b: any) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });

  const universalStays = stayListings.map((l: any) => {
    let meta: any = {};
    if (l.metadata) {
      try {
        meta = JSON.parse(l.metadata);
      } catch {}
    }
    const cover = l.coverAssetId || meta.coverImage || meta.images?.[0] || null;
    const images = Array.isArray(meta.images) && meta.images.length > 0 ? meta.images : cover ? [cover] : [];
    const price = typeof meta.price === 'number' ? meta.price : null;

    return {
      id: l.id,
      name: l.title,
      type: 'STAY_LISTING',
      stayCategory: (meta.stayCategory as StayCategory) || 'Short-Let',
      description: l.description || '',
      address: meta.address || meta.neighborhood || city?.name || 'Calabar',
      neighborhood: meta.neighborhood || meta.address || city?.name || 'Calabar',
      area: meta.neighborhood || city?.name || 'Calabar',
      image: cover,
      imageUrl: cover,
      images,
      rating: typeof meta.rating === 'number' ? meta.rating : null,
      reviewScore: typeof meta.reviewScore === 'number' ? meta.reviewScore : null,
      reviewCount: typeof meta.reviewCount === 'number' ? meta.reviewCount : 0,
      stars: typeof meta.stars === 'number' ? meta.stars : undefined,
      price,
      startingPrice: price,
      pricePeriod: meta.pricePeriod || 'night',
      compareAtPrice: typeof meta.compareAtPrice === 'number' ? meta.compareAtPrice : undefined,
      bedrooms: meta.bedrooms || 1,
      bathrooms: meta.bathrooms || 1,
      maxGuests: meta.maxGuests || 2,
      roomType: meta.roomType || `${meta.stayCategory || 'Short-Let'} · ${meta.bedrooms || 1} Bed`,
      bedType: meta.bedType || `${meta.bedrooms || 1} Bedroom · Up to ${meta.maxGuests || 2} guests`,
      amenities: Array.isArray(meta.amenities) ? meta.amenities : [],
      freeCancellation: Boolean(meta.freeCancellation),
      breakfastIncluded: Boolean(meta.breakfastIncluded),
      hasPowerGuarantee: Boolean(meta.hasPowerGuarantee),
      whatsappPhone: meta.whatsappPhone || null,
      bookingUrl: meta.bookingUrl || null,
      hostType: meta.hostType || 'PERSONAL',
      hostPersonId: meta.hostPersonId || null,
      hostName: meta.hostName || 'Verified Host',
      organizationId: meta.organizationId || l.organizationId,
      isHotelOrg: false,
    };
  });

  return [...universalStays, ...normalizedHotels];
}

export async function getStayByIdOrSlug(slug: string) {
  const session = await getServerSession(authOptions);
  const currentPersonId = session?.user?.personId || null;

  // 1. Check if slug is a universal STAY_LISTING in DiscoveryListing
  const allListings = await db.orm.public.DiscoveryListing.all();
  const universalListing = allListings.find(
    (l: any) =>
      String(l.vertical || '').startsWith('STAY_LISTING_') &&
      (l.id === slug || l.slug === slug)
  );

  if (universalListing) {
    let meta: any = {};
    if (universalListing.metadata) {
      try {
        meta = JSON.parse(universalListing.metadata);
      } catch {}
    }

    const cover = universalListing.coverAssetId || meta.coverImage || meta.images?.[0] || null;
    const images = Array.isArray(meta.images) && meta.images.length > 0 ? meta.images : cover ? [cover] : [];
    const price = typeof meta.price === 'number' ? meta.price : 0;

    let canManage = false;
    if (currentPersonId) {
      if (meta.hostPersonId && meta.hostPersonId === currentPersonId) {
        canManage = true;
      } else if (meta.organizationId) {
        const m = await db.orm.public.Membership.where({
          personId: currentPersonId,
          organizationId: meta.organizationId,
        }).first();
        if (m) canManage = true;
      }
    }

    return {
      id: universalListing.id,
      name: universalListing.title,
      description: universalListing.description || '',
      stayCategory: (meta.stayCategory as StayCategory) || 'Short-Let',
      address: meta.address || meta.neighborhood || 'Calabar',
      neighborhood: meta.neighborhood || meta.address || 'Calabar',
      price,
      startingPrice: price,
      pricePeriod: meta.pricePeriod || 'night',
      compareAtPrice: typeof meta.compareAtPrice === 'number' ? meta.compareAtPrice : null,
      bedrooms: meta.bedrooms || 1,
      bathrooms: meta.bathrooms || 1,
      maxGuests: meta.maxGuests || 2,
      bedType: meta.bedType || null,
      roomType: meta.roomType || null,
      amenities: Array.isArray(meta.amenities) ? meta.amenities : [],
      images,
      coverImage: cover,
      whatsappPhone: meta.whatsappPhone || null,
      bookingUrl: meta.bookingUrl || null,
      hostType: meta.hostType || 'PERSONAL',
      hostPersonId: meta.hostPersonId || null,
      hostName: meta.hostName || 'Verified Host',
      organizationId: universalListing.organizationId,
      hasPowerGuarantee: Boolean(meta.hasPowerGuarantee),
      freeCancellation: Boolean(meta.freeCancellation),
      breakfastIncluded: Boolean(meta.breakfastIncluded),
      rating: typeof meta.rating === 'number' ? meta.rating : null,
      reviewScore: typeof meta.reviewScore === 'number' ? meta.reviewScore : null,
      reviewCount: typeof meta.reviewCount === 'number' ? meta.reviewCount : 0,
      stars: typeof meta.stars === 'number' ? meta.stars : null,
      rooms: [],
      isHotelOrg: false,
      isHotelOSEnabled: false,
      canManage,
    };
  }

  // 2. Otherwise check if slug is a HOTEL Organization
  const org = await db.orm.public.Organization.where({ id: slug, type: 'HOTEL' }).all().first();
  if (!org) return null;

  const isHotelOSEnabled = await isHotelOSReservationEnabled(org.id);
  const rooms = await getHotelRooms(org.id);
  const hotelListing = allListings.find(
    (l: any) => l.organizationId === org.id && l.vertical !== 'SETTINGS' && !String(l.vertical || '').startsWith('STAY_LISTING_')
  );

  let meta: any = {};
  if (hotelListing?.metadata) {
    try {
      meta = JSON.parse(hotelListing.metadata);
    } catch {}
  }

  const cover = org.logoAssetId || hotelListing?.coverAssetId || meta.coverImage || meta.images?.[0] || null;
  const images =
    Array.isArray(meta.images) && meta.images.length > 0
      ? meta.images
      : cover
      ? [cover]
      : [];

  const validRates = rooms
    .map((r: any) => r.baseRate)
    .filter((r: any): r is number => typeof r === 'number' && r > 0);
  const minRate = validRates.length > 0 ? Math.min(...validRates) : typeof meta.price === 'number' ? meta.price : 0;

  const contacts = await db.orm.public.OrganizationContactPoint.where({ organizationId: org.id }).all();
  const waContact = contacts.find((c: any) => c.type === 'WHATSAPP') || contacts.find((c: any) => c.type === 'PHONE');
  const whatsappPhone = waContact?.value ? cleanWhatsAppNumber(waContact.value) : (meta.whatsappPhone ? cleanWhatsAppNumber(meta.whatsappPhone) : DEFAULT_HOTEL_WHATSAPP);

  const defaultAmenities: string[] = Array.isArray(meta.amenities) ? [...meta.amenities] : [];
  if (meta.hasPowerGuarantee && !defaultAmenities.some((a) => /power/i.test(a))) {
    defaultAmenities.push('24/7 Power');
  }
  if (meta.breakfastIncluded && !defaultAmenities.some((a) => /breakfast/i.test(a))) {
    defaultAmenities.push('Breakfast Included');
  }
  if (meta.freeCancellation && !defaultAmenities.some((a) => /cancellation/i.test(a))) {
    defaultAmenities.push('Free Cancellation');
  }

  let canManage = false;
  if (currentPersonId) {
    const m = await db.orm.public.Membership.where({
      personId: currentPersonId,
      organizationId: org.id,
    }).first();
    if (m) canManage = true;
  }

  return {
    id: org.id,
    name: org.name,
    description: org.description || hotelListing?.description || '',
    stayCategory: (meta.stayCategory as StayCategory) || 'Hotel',
    address: org.address || 'Calabar',
    neighborhood: org.address ? org.address.split(',')[0].trim() : 'Calabar',
    price: minRate,
    startingPrice: minRate,
    pricePeriod: 'night',
    compareAtPrice: typeof meta.compareAtPrice === 'number' ? meta.compareAtPrice : null,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    bedType: rooms[0]?.type || null,
    roomType: rooms[0]?.type || 'Standard & Deluxe Rooms',
    amenities: defaultAmenities,
    images,
    coverImage: cover,
    whatsappPhone,
    bookingUrl: meta.bookingUrl || null,
    hostType: 'ORGANIZATION',
    hostPersonId: null,
    hostName: org.name,
    organizationId: org.id,
    hasPowerGuarantee: Boolean(meta.hasPowerGuarantee),
    freeCancellation: Boolean(meta.freeCancellation),
    breakfastIncluded: Boolean(meta.breakfastIncluded),
    rating: typeof meta.rating === 'number' ? meta.rating : null,
    reviewScore:
      typeof meta.reviewScore === 'number'
        ? meta.reviewScore
        : typeof meta.rating === 'number' && meta.rating > 0
        ? Number((meta.rating * 2).toFixed(1))
        : null,
    reviewCount: typeof meta.reviewCount === 'number' ? meta.reviewCount : 0,
    stars: typeof meta.stars === 'number' ? meta.stars : null,
    rooms,
    isHotelOrg: true,
    isHotelOSEnabled,
    canManage,
  };
}
