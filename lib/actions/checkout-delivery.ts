'use server';

import { db } from '@/src/prisma/db';
import { resolveTrustedDeliveryDistance } from '@/lib/mapping/distance-resolver';
import { stabilizeAddressInput, StabilizedAddress } from '@/lib/mapping/address-stabilizer';
import { createDeliveryJob, generateRecipientOtp } from '@/lib/actions/logistics-domain';
import { dispatchNetworkJob } from '@/lib/actions/logistics-dispatch';
import { CALABAR_CITY_METADATA } from '@/lib/mapping/calabar-coverage';
import { getCheckoutConfig } from '@/lib/actions/checkout-settings';
import { getMerchantDeliverySettings } from '@/lib/actions/merchant-delivery-settings';

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
  orderSubtotal?: number | null;
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

    // 1b. Check Merchant Custom Fulfillment Settings
    const merchantSettings = await getMerchantDeliverySettings(params.merchantOrgId);
    if (!merchantSettings.isDeliveryActive || merchantSettings.fulfillmentMode === 'PICKUP_ONLY') {
      return {
        success: false,
        deliveryFee: 0,
        distanceKm: null,
        durationMinutes: null,
        isServiceable: false,
        pickupAddress: pickupStabilized.formattedAddress,
        dropoffAddress: dropoffStabilized.formattedAddress,
        error: 'This merchant is currently accepting in-store pickup orders only.',
      };
    }

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

    // Verify distance is within merchant's custom radius
    if (resolution.distanceKm > merchantSettings.maxDeliveryRadiusKm) {
      return {
        success: false,
        deliveryFee: 0,
        distanceKm: Math.round(resolution.distanceKm * 10) / 10,
        durationMinutes: null,
        isServiceable: false,
        pickupAddress: pickupStabilized.formattedAddress,
        dropoffAddress: dropoffStabilized.formattedAddress,
        error: `Delivery address is outside the merchant's maximum delivery radius (${merchantSettings.maxDeliveryRadiusKm} km).`,
      };
    }

    // 3. Calabar Dynamic Hyperlocal Fare Formula (Configurable by Admin & Merchant):
    const config = await getCheckoutConfig();
    const baseFare = typeof config.deliveryBaseFee === 'number' ? config.deliveryBaseFee : 800;
    const coveredKm = typeof config.deliveryBaseDistanceKm === 'number' ? config.deliveryBaseDistanceKm : 2.0;
    const perKmRate = typeof config.deliveryPerKmRate === 'number' ? config.deliveryPerKmRate : 150;
    const excessKm = Math.max(0, resolution.distanceKm - coveredKm);
    let calculatedFee = Math.round(baseFare + excessKm * perKmRate);

    // Apply Merchant Custom Flat Fee if configured
    if (typeof merchantSettings.customDeliveryFee === 'number' && merchantSettings.customDeliveryFee >= 0) {
      calculatedFee = merchantSettings.customDeliveryFee;
    }

    // Apply Merchant Subsidized Free Delivery or Platform Free Delivery
    if (
      (merchantSettings.freeDeliveryThreshold > 0 &&
        typeof params.orderSubtotal === 'number' &&
        params.orderSubtotal >= merchantSettings.freeDeliveryThreshold) ||
      (config.freeDeliveryThreshold &&
        config.freeDeliveryThreshold > 0 &&
        typeof params.orderSubtotal === 'number' &&
        params.orderSubtotal >= config.freeDeliveryThreshold)
    ) {
      calculatedFee = 0;
    }

    const prepBuffer = merchantSettings.kitchenPrepMinutes || 15;
    const transitTime = resolution.durationMinutes ? Math.round(resolution.durationMinutes) : 20;

    return {
      success: true,
      deliveryFee: calculatedFee,
      distanceKm: Math.round(resolution.distanceKm * 10) / 10,
      durationMinutes: prepBuffer + transitTime,
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

    // 2. Check Merchant Fulfillment Mode (Tier 3: Platform Fleet vs In-House Courier)
    const merchantSettings = await getMerchantDeliverySettings(merchantOrgId);
    const isPrivateInHouse = merchantSettings.fulfillmentMode === 'IN_HOUSE_COURIER';

    // For shared network jobs, providerId must be undefined to allow pool dispatch.
    // For in-house courier, providerId is assigned to the merchant organization itself.
    const deliveryJob = await createDeliveryJob({
      providerId: isPrivateInHouse ? merchantOrgId : undefined,
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

    // 3. Dispatch to shared platform fleet riders if PLATFORM_FLEET mode
    let dispatchResult = null;
    if (!isPrivateInHouse) {
      try {
        dispatchResult = await dispatchNetworkJob({
          deliveryJobId: deliveryJob.id,
          pickup: { latitude: pickupStabilized.latitude, longitude: pickupStabilized.longitude },
          dropoff: { latitude: dropoffStabilized.latitude, longitude: dropoffStabilized.longitude },
        });
      } catch (dispatchErr: any) {
        console.warn('[createCheckoutDeliveryJob] Auto-dispatch notice:', dispatchErr.message);
      }
    } else {
      console.log(`[createCheckoutDeliveryJob] In-house courier delivery assigned for merchant ${merchantOrgId}.`);
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
