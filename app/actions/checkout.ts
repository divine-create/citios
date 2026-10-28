'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { removeVoiceCartItem } from '@/lib/voice/cart';
import { placeRetailOrder } from '@/app/actions/commerce';
import { placeRestaurantOrder } from '@/app/actions/food';
import { requestServiceJob } from '@/app/actions/service';
import { fetchUserCart } from '@/app/actions/cart';
import { getPaymentAdapter } from '@/lib/payments/factory';
import { getCheckoutConfig } from '@/lib/actions/checkout-settings';
import { createCheckoutDeliveryJob } from '@/lib/actions/checkout-delivery';

export type CheckoutResponse = {
  success: boolean;
  message?: string;
  authorizationUrl?: string; // Provider's checkout URL
  reference?: string;
  orderId?: string;
  whatsappUrl?: string;
  whatsappMessage?: string;
  errors?: string[];
  requiresPaymentAction?: boolean;
  trackingReference?: string;
  recipientOtp?: string;
  deliveryJobId?: string;
};

const DEFAULT_HOTEL_WHATSAPP = '2348065373747';
const CENTRAL_DISPATCH_WHATSAPP = '2348065373747';

export async function resolveOrgWhatsAppPhone(orgId: string, locationId?: string): Promise<string> {
  // Platform requirement: all checkout orders route directly to central dispatch (+2348065373747)
  if (process.env.NODE_ENV !== 'test') {
    const checkoutConfig = await getCheckoutConfig().catch(() => null);
    const target = checkoutConfig?.conciergeWhatsAppNumber || process.env.CITYOS_CONCIERGE_WHATSAPP || CENTRAL_DISPATCH_WHATSAPP;
    let clean = target.replace(/[^\d]/g, '');
    if (clean.startsWith('0')) clean = '234' + clean.substring(1);
    if (!clean.startsWith('234') && clean.length === 10) clean = '234' + clean;
    if (clean === '234806537374' || clean.length < 13) clean = CENTRAL_DISPATCH_WHATSAPP;
    return clean || CENTRAL_DISPATCH_WHATSAPP;
  }

  const checkoutConfig = await getCheckoutConfig();
  const contactPoints = await db.orm.public.OrganizationContactPoint.where({ organizationId: orgId }).all();
  const waContact =
    contactPoints.find((c: any) => c.type === 'WHATSAPP') ||
    contactPoints.find((c: any) => c.type === 'PHONE');

  let rawPhone = waContact?.value;
  if (!rawPhone && locationId) {
    const locContact = contactPoints.find((c: any) => c.locationId === locationId);
    if (locContact?.value) rawPhone = locContact.value;
  }
  if (!rawPhone) {
    const listing = await db.orm.public.DiscoveryListing.where({ organizationId: orgId }).all().first();
    if (listing?.metadata) {
      try {
        const meta = JSON.parse(listing.metadata);
        if (meta.whatsappPhone || meta.phone) rawPhone = meta.whatsappPhone || meta.phone;
      } catch {}
    }
  }
  if (!rawPhone) {
    const ownerMembership = await db.orm.public.Membership.where({ organizationId: orgId }).all().first();
    if (ownerMembership) {
      const ownerPhone = await db.orm.public.PersonIdentifier.where({
        personId: ownerMembership.personId,
        type: 'PHONE',
      }).all().first();
      if (ownerPhone?.normalizedValue) rawPhone = ownerPhone.normalizedValue;
    }
  }
  if (!rawPhone || rawPhone === '2348000000000' || rawPhone === '2348067154233') {
    rawPhone = checkoutConfig.conciergeWhatsAppNumber || process.env.CITYOS_CONCIERGE_WHATSAPP || CENTRAL_DISPATCH_WHATSAPP;
  }

  let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
  if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
  if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) cleanPhone = '234' + cleanPhone;
  if (!cleanPhone || cleanPhone === '2348000000000' || cleanPhone === '2348067154233') {
    cleanPhone = CENTRAL_DISPATCH_WHATSAPP;
  }
  return cleanPhone;
}

/**
 * Resolves the destination WhatsApp number for hotel / accommodation enquiries:
 * 1. Explicit merchant-configured WhatsApp or phone on the organization/location/listing
 * 2. If valid and configured, that merchant-specific contact overrides the default
 * 3. Otherwise defaults to canonical +2348065373747 (2348065373747)
 * Never returns the obsolete fallback 2348067154233.
 */
export async function resolveHotelWhatsAppDestination(organizationId?: string, locationId?: string): Promise<string> {
  if (!organizationId) {
    return DEFAULT_HOTEL_WHATSAPP;
  }

  try {
    const contactPoints = await db.orm.public.OrganizationContactPoint.where({ organizationId }).all();
    const waContact =
      contactPoints.find((c: any) => c.type === 'WHATSAPP') ||
      contactPoints.find((c: any) => c.type === 'PHONE');

    let rawPhone = waContact?.value;
    if (!rawPhone && locationId) {
      const locContact = contactPoints.find((c: any) => c.locationId === locationId);
      if (locContact?.value) rawPhone = locContact.value;
    }
    if (!rawPhone) {
      const listing = await db.orm.public.DiscoveryListing.where({ organizationId }).all().first();
      if (listing?.metadata) {
        try {
          const meta = JSON.parse(listing.metadata);
          if (meta.whatsappPhone || meta.phone) rawPhone = meta.whatsappPhone || meta.phone;
        } catch {}
      }
    }

    if (rawPhone) {
      let clean = rawPhone.replace(/[^\d+]/g, '');
      if (clean.startsWith('+')) clean = clean.substring(1);
      if (clean.startsWith('0')) clean = '234' + clean.substring(1);
      if (!clean.startsWith('234') && clean.length === 10) clean = '234' + clean;
      if (clean && clean !== '2348067154233' && clean !== '2348000000000' && clean.length >= 8) {
        return clean;
      }
    }
  } catch (err) {
    console.warn('[resolveHotelWhatsAppDestination] Error looking up hotel contact:', err);
  }

  return DEFAULT_HOTEL_WHATSAPP;
}

export async function processMerchantCheckout(
  orgId: string,
  method: 'wallet' | 'card' | 'transfer' | 'whatsapp',
  idempotencyKey: string,
  locationId?: string,
  options?: {
    customerPhone?: string;
    deliveryAddress?: string;
    deliveryNotes?: string;
    deliveryFee?: number | null;
    deliveryDistanceKm?: number | null;
    substitutionPreference?: 'call' | 'replace' | 'refund';
    clientItems?: Array<{ productId: string; qty: number; name: string; kind?: string }>;
  }
): Promise<CheckoutResponse> {
  const session = await getServerSession(authOptions);
  const personId = session?.user?.personId || null;

  // Enforce WhatsApp-only checkout
  const checkoutConfig = await getCheckoutConfig();
  if (method !== 'whatsapp') {
    throw new Error('All checkouts and payments are currently processed via WhatsApp Direct Order.');
  }

  // 1. Resolve Cart Items (Server Cart if authenticated, or DB-revalidated clientItems)
  let orgLines: Array<{ productId: string; qty: number; name: string; price: number; kind: string; orgId: string }> = [];

  if (personId) {
    const cartData = await fetchUserCart();
    if (cartData?.lines && cartData.lines.length > 0) {
      orgLines = cartData.lines.filter((l: any) => l.orgId === orgId);
    }
  }

  // Fallback to DB-verified clientItems (supports guest checkout or localStorage-only cart)
  if (orgLines.length === 0 && options?.clientItems && options.clientItems.length > 0) {
    for (const ci of options.clientItems) {
      const qty = Math.max(1, Number(ci.qty) || 1);
      const prod = await db.orm.public.RetailProduct.where({ id: ci.productId }).all().first();
      if (prod && prod.organizationId === orgId) {
        orgLines.push({
          productId: prod.id,
          qty,
          name: prod.name,
          price: prod.price,
          kind: 'retail',
          orgId,
        });
        continue;
      }
      const menu = await db.orm.public.MenuItem.where({ id: ci.productId }).all().first();
      if (menu && menu.organizationId === orgId) {
        orgLines.push({
          productId: menu.id,
          qty,
          name: menu.name,
          price: menu.price,
          kind: 'food',
          orgId,
        });
        continue;
      }
      const svc = await db.orm.public.ServiceCatalogItem.where({ id: ci.productId }).all().first();
      if (svc && svc.organizationId === orgId) {
        orgLines.push({
          productId: svc.id,
          qty,
          name: svc.name,
          price: svc.price || 0,
          kind: 'service',
          orgId,
        });
      }
    }
  }

  if (orgLines.length === 0) {
    throw new Error('No items in cart for this merchant.');
  }

  const retailItems = orgLines.filter((l) => l.kind === 'retail');
  const foodItems = orgLines.filter((l) => l.kind === 'food');
  const serviceItems = orgLines.filter((l) => l.kind === 'service');

  // 2. Authoritative Server Total Calculation
  let calculatedTotal = 0;
  for (const item of retailItems) calculatedTotal += item.price * item.qty;
  for (const item of foodItems) calculatedTotal += item.price * item.qty;

  if (checkoutConfig.minOrderAmount > 0 && calculatedTotal < checkoutConfig.minOrderAmount) {
    throw new Error(`Minimum order amount of ₦${checkoutConfig.minOrderAmount.toLocaleString()} not met for this store.`);
  }

  const reference = `CC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  let placedOrderId: string | undefined = undefined;

  // 3. If user is authenticated, also persist order record in DB
  if (personId) {
    try {
      if (retailItems.length > 0) {
        const residentProfileForRetail = await db.orm.public.ResidentProfile.where({ personId }).all().first();
        const phonePart = options?.customerPhone || residentProfileForRetail?.phone || '';
        const notesPart = options?.deliveryNotes || '';
        const substPref = options?.substitutionPreference;
        const substLabel =
          substPref === 'call'
            ? 'Call me for replacement'
            : substPref === 'replace'
            ? 'Pick closest replacement'
            : substPref === 'refund'
            ? 'Remove unavailable item'
            : '';

        const formattedNotes = [
          phonePart ? `Phone: ${phonePart}` : '',
          notesPart ? `Notes: ${notesPart}` : '',
          substLabel ? `Substitution: ${substLabel}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        const retRes = await placeRetailOrder({
          locationId,
          items: retailItems.map((i) => ({ productId: i.productId, qty: i.qty, name: i.name })),
          method: 'whatsapp',
          idempotencyKey: idempotencyKey + '_ret',
          paymentReference: retailItems.length > 0 && foodItems.length === 0 ? reference : reference + '_RET',
          expectedTotal: retailItems.reduce((acc, i) => acc + i.price * i.qty, 0),
          deliveryAddress: formattedNotes || undefined,
        });
        if (retRes?.orderIds && retRes.orderIds[0]) placedOrderId = retRes.orderIds[0];
        else if ((retRes as any)?.orderId) placedOrderId = (retRes as any).orderId;
        for (const item of retailItems) await removeVoiceCartItem(personId, item.productId);
      }

      if (foodItems.length > 0) {
        const foodRes = await placeRestaurantOrder({
          locationId,
          items: foodItems.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
          type: 'TAKEOUT',
          idempotencyKey,
          paymentReference: foodItems.length > 0 && retailItems.length === 0 ? reference : reference + '_FOOD',
          method: 'whatsapp',
        });
        if (foodRes?.orderIds && foodRes.orderIds[0]) placedOrderId = foodRes.orderIds[0];
        for (const item of foodItems) await removeVoiceCartItem(personId, item.productId);
      }

      if (serviceItems.length > 0) {
        for (const item of serviceItems) {
          await requestServiceJob({ serviceId: item.productId, notes: 'Requested via WhatsApp Checkout' });
          await removeVoiceCartItem(personId, item.productId);
        }
      }
    } catch (err) {
      // Non-blocking if guest or stock edge case so WhatsApp chat still opens cleanly
      console.warn('[processMerchantCheckout] Order persistence note:', err);
    }
  }

  // 4. Compose authoritative WhatsApp Order Message & Deep Link
  const org = await db.orm.public.Organization.where({ id: orgId }).all().first();
  const cleanPhone = await resolveOrgWhatsAppPhone(orgId, locationId);

  const residentProfile = personId
    ? await db.orm.public.ResidentProfile.where({ personId }).all().first()
    : null;
  const customerName = session?.user?.name || 'Customer';
  const customerPhone = options?.customerPhone || residentProfile?.phone || '';
  const deliveryAddress = options?.deliveryAddress || residentProfile?.defaultDeliveryAddress || '';
  const orderNotes = options?.deliveryNotes || '';

  const substPref = options?.substitutionPreference;
  const substText =
    substPref === 'call'
      ? '📞 Call me to choose replacement'
      : substPref === 'replace'
      ? '🔄 Pick closest replacement'
      : substPref === 'refund'
      ? '❌ Do not replace (remove item)'
      : null;

  const itemsSummary = orgLines
    .map((l) => `• ${l.qty}x ${l.name} (₦${(l.price * l.qty).toLocaleString()})`)
    .join('\n');

  const deliveryFee = typeof options?.deliveryFee === 'number' && !isNaN(options.deliveryFee)
    ? Math.max(0, options.deliveryFee)
    : 0;
  const grandTotal = calculatedTotal + deliveryFee;

  let deliveryJobInfo: {
    success: boolean;
    deliveryJobId?: string;
    trackingReference?: string | null;
    recipientOtp?: string | null;
  } | null = null;

  if (placedOrderId && deliveryAddress) {
    try {
      const orderType = foodItems.length > 0 ? 'RESTAURANT_ORDER' : 'RETAIL_ORDER';
      deliveryJobInfo = await createCheckoutDeliveryJob({
        orderId: placedOrderId,
        orderType,
        merchantOrgId: orgId,
        customerName,
        customerPhone,
        deliveryAddress,
        orderSummary: itemsSummary,
        deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
      });
    } catch (e: any) {
      console.warn('[processMerchantCheckout] Delivery creation notice:', e.message);
    }
  }

  const shortRef = reference.replace('CC-', 'WA-');
  const origin =
    process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('vercel.app')
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'https://9jalive.online';
  const storeUrl = `${origin}/org/${orgId}`;
  const trackingUrl = placedOrderId ? `${origin}/orders/${placedOrderId}` : null;
  const deliveryTrackingUrl = deliveryJobInfo?.trackingReference
    ? `${origin}/track/${deliveryJobInfo.trackingReference}`
    : null;

  const deliveryDistanceLabel = options?.deliveryDistanceKm ? `${options.deliveryDistanceKm} km` : 'Calabar';

  const messageLines = [
    `🛍️ *NEW 9JALIVE ORDER* — #${shortRef}`,
    `--------------------------------`,
    `🏬 *Store:* ${org?.name || 'Local Store'}`,
    `👤 *Customer:* ${customerName}${customerPhone ? ` (${customerPhone})` : ''}`,
    deliveryAddress ? `📍 *Delivery Address:* ${deliveryAddress}` : null,
    orderNotes ? `📝 *Order Notes:* ${orderNotes}` : null,
    substText ? `🔄 *If item unavailable:* ${substText}` : null,
    `--------------------------------`,
    `📦 *ITEMS ORDERED:*`,
    itemsSummary,
    `--------------------------------`,
    deliveryFee > 0 ? `*Subtotal:* ₦${calculatedTotal.toLocaleString()}` : null,
    deliveryFee > 0 ? `🚚 *CityDrive Delivery (${deliveryDistanceLabel}):* ₦${deliveryFee.toLocaleString()}` : null,
    `*Total Amount:* ₦${grandTotal.toLocaleString()}`,
    `💬 *Channel:* WhatsApp Direct Order`,
    ``,
    `🔗 *Store Page:* ${storeUrl}`,
    trackingUrl ? `🔐 *Order Link:* ${trackingUrl}` : null,
    deliveryTrackingUrl ? `🚚 *Live CityDrive Tracking:* ${deliveryTrackingUrl}` : null,
  ].filter(Boolean);

  const whatsappMessage = messageLines.join('\n');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  return {
    success: true,
    message: 'Order prepared for WhatsApp confirmation.',
    orderId: placedOrderId,
    reference,
    whatsappUrl,
    whatsappMessage,
    trackingReference: deliveryJobInfo?.trackingReference || undefined,
    recipientOtp: deliveryJobInfo?.recipientOtp || undefined,
    deliveryJobId: deliveryJobInfo?.deliveryJobId || undefined,
  };
}

export async function processHotelWhatsAppCheckout(input: {
  organizationId?: string;
  hotelName?: string;
  roomId?: string;
  roomPreference?: string;
  guestName: string;
  guestPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestsCount?: number | string;
  enquiryText?: string;
}): Promise<{ success: boolean; whatsappUrl?: string; message?: string; error?: string }> {
  if (!input.guestName || !input.guestName.trim()) {
    return { success: false, error: 'Guest name is required for hotel enquiry.' };
  }

  let propertyName = input.hotelName || 'Property / Hotel';
  let roomPref = input.roomPreference || 'Standard / Best Available Room';
  let nightlyRate: number | null = null;
  let locationId: string | undefined = undefined;

  if (input.organizationId) {
    const org = await db.orm.public.Organization.where({ id: input.organizationId }).all().first();
    if (org?.name) propertyName = org.name;
  }

  if (input.roomId) {
    const room = await db.orm.public.HotelRoom.where({ id: input.roomId }).all().first();
    if (room) {
      roomPref = `${room.type} Room (Room #${room.roomNumber})`;
      nightlyRate = room.baseRate;
      locationId = room.locationId || undefined;
    }
  }

  let nights = 0;
  if (input.checkInDate && input.checkOutDate) {
    const inDate = new Date(input.checkInDate);
    const outDate = new Date(input.checkOutDate);
    if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime()) && outDate > inDate) {
      nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const cleanPhone = await resolveHotelWhatsAppDestination(input.organizationId, locationId);

  const lines = [
    `🏨 *STAY & HOTEL BOOKING ENQUIRY*`,
    `--------------------------------`,
    `🏢 *Property / Hotel:* ${propertyName}`,
    `🛏️ *Room Preference:* ${roomPref}`,
    `👤 *Guest Name:* ${input.guestName.trim()}${input.guestPhone ? ` (${input.guestPhone.trim()})` : ''}`,
    input.guestsCount ? `👥 *Guests:* ${input.guestsCount}` : null,
    input.checkInDate ? `📅 *Check-in Date:* ${input.checkInDate}` : null,
    input.checkOutDate
      ? `📅 *Check-out Date:* ${input.checkOutDate}${nights > 0 ? ` (${nights} ${nights === 1 ? 'night' : 'nights'})` : ''}`
      : null,
    nightlyRate && nights > 0
      ? `💰 *Estimated Rate:* ₦${nightlyRate.toLocaleString()}/night · *Total:* ₦${(nightlyRate * nights).toLocaleString()}`
      : nightlyRate
      ? `💰 *Rate:* ₦${nightlyRate.toLocaleString()}/night`
      : null,
    input.enquiryText ? `📝 *Enquiry:* ${input.enquiryText}` : null,
    `--------------------------------`,
    `Hello! I would like to enquire about availability and arrange a reservation for this stay. Please let me know your available options. Thank you!`,
  ].filter(Boolean);

  const whatsappMessage = lines.join('\n');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  // Explicit Product Rule: Opening WhatsApp does NOT create a falsely confirmed reservation or mark payment as successful.
  return {
    success: true,
    whatsappUrl,
    message: 'WhatsApp booking enquiry link generated successfully.',
  };
}

export async function createHotelWhatsAppBooking(input: Parameters<typeof processHotelWhatsAppCheckout>[0]) {
  return processHotelWhatsAppCheckout(input);
}

export async function getResidentCheckoutDefaults() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return null;
  const personId = session.user.personId;
  const profile = await db.orm.public.ResidentProfile.where({ personId }).all().first();
  return {
    name: session.user.name || '',
    phone: profile?.phone || '',
    deliveryAddress: profile?.defaultDeliveryAddress || '',
  };
}
