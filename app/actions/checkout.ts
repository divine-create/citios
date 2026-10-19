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
};

export async function resolveOrgWhatsAppPhone(orgId: string, locationId?: string): Promise<string> {
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
  if (!rawPhone) {
    rawPhone = checkoutConfig.conciergeWhatsAppNumber || process.env.CITYOS_CONCIERGE_WHATSAPP || '2348067154233';
  }

  let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
  if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
  if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) cleanPhone = '234' + cleanPhone;
  return cleanPhone;
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
  const orderNotes = options?.deliveryNotes || '';

  const substPref = options?.substitutionPreference || 'call';
  const substText =
    substPref === 'call'
      ? '📞 Call me to choose replacement'
      : substPref === 'replace'
      ? '🔄 Pick closest replacement'
      : '❌ Do not replace (remove item)';

  const shortRef = reference.replace('CC-', 'WA-');
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://citios.vercel.app');
  const trackingUrl = placedOrderId ? `${origin}/orders/${placedOrderId}` : `${origin}/org/${orgId}`;

  const itemsSummary = orgLines
    .map((l) => `• ${l.qty}x ${l.name} (₦${(l.price * l.qty).toLocaleString()})`)
    .join('\n');

  const messageLines = [
    `🛍️ *NEW 9JALIVE ORDER* — #${shortRef}`,
    `--------------------------------`,
    `🏬 *Store:* ${org?.name || 'Local Store'}`,
    `👤 *Customer:* ${customerName}${customerPhone ? ` (${customerPhone})` : ''}`,
    orderNotes ? `📝 *Order Notes:* ${orderNotes}` : null,
    `🔄 *If item unavailable:* ${substText}`,
    `--------------------------------`,
    `📦 *ITEMS ORDERED:*`,
    itemsSummary,
    `--------------------------------`,
    `*Total Amount:* ₦${calculatedTotal.toLocaleString()}`,
    `💬 *Channel:* WhatsApp Direct Order`,
    ``,
    placedOrderId ? `🔐 *Order Link:* ${trackingUrl}` : `🔗 *Store Page:* ${trackingUrl}`,
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
  };
}

export async function createHotelWhatsAppBooking(input: {
  organizationId: string;
  roomId: string;
  guestName: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
}): Promise<{ success: boolean; whatsappUrl?: string; error?: string }> {
  const org = await db.orm.public.Organization.where({ id: input.organizationId }).all().first();
  if (!org) return { success: false, error: 'Hotel not found.' };

  const room = await db.orm.public.HotelRoom.where({ id: input.roomId }).all().first();
  if (!room || room.organizationId !== org.id) return { success: false, error: 'Room not found.' };

  const inDate = new Date(input.checkInDate);
  const outDate = new Date(input.checkOutDate);
  const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalRate = room.baseRate * nights;

  const cleanPhone = await resolveOrgWhatsAppPhone(org.id, room.locationId || undefined);

  const lines = [
    `🏨 *NEW HOTEL BOOKING REQUEST*`,
    `--------------------------------`,
    `🏢 *Hotel:* ${org.name}`,
    `🛏️ *Room:* ${room.type} Room (Room ${room.roomNumber})`,
    `👤 *Guest Name:* ${input.guestName}${input.guestPhone ? ` (${input.guestPhone})` : ''}`,
    `📅 *Check-in:* ${input.checkInDate}`,
    `📅 *Check-out:* ${input.checkOutDate} (${nights} ${nights === 1 ? 'night' : 'nights'})`,
    `💰 *Rate:* ₦${room.baseRate.toLocaleString()}/night • *Total:* ₦${totalRate.toLocaleString()}`,
    `--------------------------------`,
    `Please confirm availability and payment details on WhatsApp. Thank you!`,
  ];

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
  return { success: true, whatsappUrl };
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
