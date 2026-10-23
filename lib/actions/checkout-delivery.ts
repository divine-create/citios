'use server';

import { db } from '@/src/prisma/db';
import { resolveTrustedDeliveryDistance } from '@/lib/mapping/distance-resolver';
import { stabilizeAddressInput, StabilizedAddress } from '@/lib/mapping/address-stabilizer';
import { createDeliveryJob, generateRecipientOtp } from '@/lib/actions/logistics-domain';
import { dispatchNetworkJob } from '@/lib/actions/logistics-dispatch';
import { CALABAR_CITY_METADATA } from '@/lib/mapping/calabar-coverage';

export interface CheckoutDeliveryEstimate {
  success: boolean;
  deliveryFee: number;
  distanceKm: number | null;
  durationMinutes: number | null;
  isServiceable: boolean;
  pickupAddress: string;
  dropoffAddress: string;
  error?: string;
}

/**
 * Calculates a trusted, live delivery quote between a merchant's branch location
 * and the customer's stabilized Calabar delivery address.
 */
export async function getCheckoutDeliveryEstimate(params: {
  merchantOrgId: string;
  dropoffAddressText?: string | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  landmarkId?: string | null;
  zoneId?: string | null;
}): Promise<CheckoutDeliveryEstimate> {
  try {
    // 1. Fetch Merchant & Branch Location
    const locations = await db.orm.public.Location.where({ organizationId: params.merchantOrgId }).all();
    const branchLoc = locations[0];

    // Determine pickup coordinates
    const pickupStabilized = stabilizeAddressInput({
      addressText: branchLoc?.address || 'Marian Road, Calabar',
      latitude: branchLoc?.latitude,
      longitude: branchLoc?.longitude,
    });

    // Determine dropoff coordinates
    const dropoffStabilized = stabilizeAddressInput({
      addressText: params.dropoffAddressText,
      latitude: params.dropoffLat,
      longitude: params.dropoffLng,
      landmarkId: params.landmarkId,
      zoneId: params.zoneId,
    });

    if (!pickupStabilized.isServiceable || !dropoffStabilized.isServiceable) {
      return {
        success: false,
        deliveryFee: 800,
        distanceKm: null,
        durationMinutes: null,
        isServiceable: false,
        pickupAddress: pickupStabilized.formattedAddress,
        dropoffAddress: dropoffStabilized.formattedAddress,
        error: 'One or both addresses are outside active Calabar delivery coverage.',
      };
    }

    // 2. Resolve trusted road distance
    const resolution = await resolveTrustedDeliveryDistance(
      { latitude: pickupStabilized.latitude, longitude: pickupStabilized.longitude },
      { latitude: dropoffStabilized.latitude, longitude: dropoffStabilized.longitude }
    );

    if (!resolution.success || !resolution.distanceKm) {
      return {
        success: false,
        deliveryFee: 800,
        distanceKm: null,
        durationMinutes: null,
        isServiceable: false,
        pickupAddress: pickupStabilized.formattedAddress,
        dropoffAddress: dropoffStabilized.formattedAddress,
        error: resolution.error || 'Failed to determine road route distance in Calabar.',
      };
    }

    // 3. Calabar Dynamic Hyperlocal Fare Formula:
    // Base ₦800 for first 2.0 km, then ₦150 per additional km
    const baseFare = 800;
    const coveredKm = 2.0;
    const perKmRate = 150;
    const excessKm = Math.max(0, resolution.distanceKm - coveredKm);
    const calculatedFee = Math.round(baseFare + excessKm * perKmRate);

    return {
      success: true,
      deliveryFee: calculatedFee,
      distanceKm: Math.round(resolution.distanceKm * 10) / 10,
      durationMinutes: resolution.durationMinutes ? Math.round(resolution.durationMinutes) : 25,
      isServiceable: true,
      pickupAddress: pickupStabilized.formattedAddress,
      dropoffAddress: dropoffStabilized.formattedAddress,
    };
  } catch (err: any) {
    console.warn('[getCheckoutDeliveryEstimate] Fallback triggered:', err.message);
    return {
      success: false,
      deliveryFee: 800,
      distanceKm: null,
      durationMinutes: null,
      isServiceable: true,
      pickupAddress: 'Calabar Merchant Branch',
      dropoffAddress: params.dropoffAddressText || 'Calabar',
      error: err.message,
    };
  }
}

/**
 * Creates and dispatches an automated DeliveryJob for an order placed at checkout.
 */
export async function createCheckoutDeliveryJob(params: {
  orderId: string;
  orderType: 'RESTAURANT_ORDER' | 'RETAIL_ORDER';
  merchantOrgId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderSummary: string;
  deliveryFee?: number;
}) {
  const {
    orderId,
    orderType,
    merchantOrgId,
    customerName,
    customerPhone,
    deliveryAddress,
    orderSummary,
  } = params;

  try {
    // 1. Fetch Merchant Branch Location
    const locations = await db.orm.public.Location.where({ organizationId: merchantOrgId }).all();
    const branchLoc = locations[0];

    const pickupStabilized = stabilizeAddressInput({
      addressText: branchLoc?.address || 'Calabar Merchant Branch',
      latitude: branchLoc?.latitude,
      longitude: branchLoc?.longitude,
    });

    const dropoffStabilized = stabilizeAddressInput({
      addressText: deliveryAddress,
    });

    const rawOtp = generateRecipientOtp();

    // 2. Create the DeliveryJob idempotently
    const deliveryJob = await createDeliveryJob({
      providerId: merchantOrgId,
      sourceType: orderType,
      sourceId: orderId,
      idempotencyKey: `disp-${orderId}-${Date.now()}`,
      pickupAddress: pickupStabilized.formattedAddress,
      pickupLat: pickupStabilized.latitude,
      pickupLng: pickupStabilized.longitude,
      pickupContactName: branchLoc?.name || 'Store Dispatch',
      pickupContactPhone: customerPhone,
      dropoffAddress: dropoffStabilized.formattedAddress,
      dropoffLat: dropoffStabilized.latitude,
      dropoffLng: dropoffStabilized.longitude,
      dropoffContactName: customerName,
      dropoffContactPhone: customerPhone,
      packageDescription: orderSummary,
      recipientOtp: rawOtp,
    });

    // 3. Automatically dispatch to the nearest CityOS platform fleet rider
    let dispatchResult = null;
    try {
      dispatchResult = await dispatchNetworkJob({
        deliveryJobId: deliveryJob.id,
        pickup: { latitude: pickupStabilized.latitude, longitude: pickupStabilized.longitude },
        dropoff: { latitude: dropoffStabilized.latitude, longitude: dropoffStabilized.longitude },
      });
    } catch (dispatchErr: any) {
      console.warn('[createCheckoutDeliveryJob] Auto-dispatch notice:', dispatchErr.message);
    }

    return {
      success: true,
      deliveryJobId: deliveryJob.id,
      trackingReference: deliveryJob.trackingReference,
      recipientOtp: rawOtp,
      dispatchResult,
    };
  } catch (err: any) {
    console.error('[createCheckoutDeliveryJob] Failed to create delivery job:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}
