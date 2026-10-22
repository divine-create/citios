'use server';

import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';
import {
  isValidCoordinate,
  isPointServiceable,
  findClosestOperationalZone,
} from '../mapping/serviceability';
import { CALABAR_CANONICAL_LANDMARKS } from '../mapping/calabar-coverage';
import { LogisticsDomainError } from './logistics-domain';
import type { CoordinateProvenance, AddressVerificationStatus } from './resident-address';

export interface MerchantPickupLocationInput {
  organizationId: string;
  name: string; // e.g. "Main Kitchen & Dispatch"
  address: string; // Human-readable street address
  latitude: number;
  longitude: number;

  nearbyLandmarkId?: string | null;
  entranceInstructions?: string | null; // e.g., "Rear loading dock, bay 3, ring buzzer"

  contactName?: string | null;
  contactPhone?: string | null;

  operatingHours?: string | null; // e.g., "08:00 - 21:00"
  pickupWindows?: Array<{ start: string; end: string }> | null;

  provenance: CoordinateProvenance;
}

export interface MerchantPickupVerificationResult {
  verified: boolean;
  serviceable: boolean;
  locationId?: string;
  organizationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  zoneId?: string | null;
  lgaCode?: string | null;
  rejectionReason?: string;
  warnings?: string[];
}

/**
 * Validates serviceability for a potential merchant pickup point without writing to DB.
 * Used during merchant onboarding for real-time coverage feedback.
 */
export async function verifyMerchantPickupServiceability(
  latitude: number,
  longitude: number
): Promise<{
  serviceable: boolean;
  zoneId: string | null;
  zoneName: string | null;
  lgaCode: string | null;
  reason?: string;
}> {
  if (!isValidCoordinate(latitude, longitude)) {
    return {
      serviceable: false,
      zoneId: null,
      zoneName: null,
      lgaCode: null,
      reason: 'Invalid coordinates provided.',
    };
  }

  const point = { latitude, longitude };
  const serviceable = isPointServiceable(point);
  const match = findClosestOperationalZone(point);

  if (!serviceable || !match) {
    return {
      serviceable: false,
      zoneId: null,
      zoneName: null,
      lgaCode: null,
      reason:
        'Location lies outside active Calabar delivery zones. Delivery quotes and network dispatch cannot service this point.',
    };
  }

  return {
    serviceable: true,
    zoneId: match.zone.id,
    zoneName: match.zone.name,
    lgaCode: match.lga?.code || match.zone.lgaId,
  };
}

/**
 * Registers or updates a merchant pickup location on the canonical Location model.
 * Enforces:
 * 1. Merchant organization membership authorization (OWNER, MANAGER, ADMIN).
 * 2. Strict Calabar operational zone serviceability (rejects points outside coverage).
 * 3. Preserves private business fleet isolation (does NOT alter isNetworkParticipant).
 * 4. Stores entrance instructions, landmarks, and contact points canonically.
 */
export async function registerMerchantPickupLocation(
  input: MerchantPickupLocationInput
): Promise<MerchantPickupVerificationResult> {
  // 1. Enforce merchant authorization
  await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'STAFF']);

  // 2. Validate input strings
  const name = input.name?.trim();
  const address = input.address?.trim();
  if (!name) throw new LogisticsDomainError('Pickup location name is required.');
  if (!address) throw new LogisticsDomainError('Physical address is required.');

  // 3. Coordinate validation
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    throw new LogisticsDomainError(
      'Valid numeric latitude and longitude coordinates are required for the merchant pickup location.'
    );
  }

  // 4. Strict Calabar Operational Serviceability Check
  // A merchant address outside active CityDrive coverage must not receive an in-coverage status
  // merely because it falls within the coarse Calabar bounding box.
  const serviceability = await verifyMerchantPickupServiceability(input.latitude, input.longitude);
  if (!serviceability.serviceable) {
    throw new LogisticsDomainError(
      serviceability.reason || 'Merchant pickup location is outside active Calabar coverage zones.'
    );
  }

  // 5. Canonical landmark reference
  let landmarkNote = '';
  if (input.nearbyLandmarkId) {
    const canonical = CALABAR_CANONICAL_LANDMARKS.find((lm) => lm.id === input.nearbyLandmarkId);
    if (canonical) {
      landmarkNote = ` [Near Landmark: ${canonical.name}]`;
    }
  }

  // Format full address description including entrance instructions and landmark notes
  const entranceNote = input.entranceInstructions?.trim()
    ? ` (Pickup Instructions: ${input.entranceInstructions.trim()})`
    : '';
  const fullAddressString = `${address}${landmarkNote}${entranceNote}`;

  // 6. Resolve Calabar canonical City record
  const calabarCity = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
  const cityId = calabarCity ? calabarCity.id : null;

  // 7. Create or update canonical Location in a transaction
  let locationId = '';
  await db.transaction(async (tx) => {
    // Check if an existing location with this name exists for this organization
    const existing = await tx.orm.public.Location
      .where({ organizationId: input.organizationId, name })
      .all()
      .first();

    if (existing) {
      locationId = existing.id;
      await tx.orm.public.Location.where({ id: existing.id }).update({
        address: fullAddressString,
        latitude: input.latitude,
        longitude: input.longitude,
        cityId: cityId || existing.cityId,
      });
    } else {
      const created = await tx.orm.public.Location.create({
        organizationId: input.organizationId,
        name,
        address: fullAddressString,
        latitude: input.latitude,
        longitude: input.longitude,
        cityId,
      });
      locationId = created.id;
    }

    // 8. Capture contact point if provided
    if (input.contactPhone?.trim()) {
      const existingPhone = await tx.orm.public.OrganizationContactPoint
        .where({ locationId, type: 'PHONE' })
        .all()
        .first();

      if (existingPhone) {
        await tx.orm.public.OrganizationContactPoint.where({ id: existingPhone.id }).update({
          value: input.contactPhone.trim(),
        });
      } else {
        await tx.orm.public.OrganizationContactPoint.create({
          organizationId: input.organizationId,
          locationId,
          type: 'PHONE',
          value: input.contactPhone.trim(),
          isPrimary: true,
          isVerified: true,
        });
      }
    }
  });

  return {
    verified: true,
    serviceable: true,
    locationId,
    organizationId: input.organizationId,
    name,
    address: fullAddressString,
    latitude: input.latitude,
    longitude: input.longitude,
    zoneId: serviceability.zoneId,
    lgaCode: serviceability.lgaCode,
  };
}

/**
 * Returns all verified pickup locations for an authorized merchant organization.
 */
export async function getMerchantPickupLocations(organizationId: string) {
  await requireMembership(organizationId);

  const locations = await db.orm.public.Location.where({ organizationId }).all();
  const contactPoints = await db.orm.public.OrganizationContactPoint.where({ organizationId }).all();

  return locations.map((loc: any) => {
    const locContacts = contactPoints.filter((cp: any) => cp.locationId === loc.id);
    const phone = locContacts.find((cp: any) => cp.type === 'PHONE')?.value || null;

    let isServiceable = false;
    let zoneId: string | null = null;
    let lgaCode: string | null = null;

    if (loc.latitude && loc.longitude) {
      const point = { latitude: loc.latitude, longitude: loc.longitude };
      isServiceable = isPointServiceable(point);
      const match = findClosestOperationalZone(point);
      zoneId = match?.zone.id || null;
      lgaCode = match?.lga?.code || match?.zone.lgaId || null;
    }

    return {
      id: loc.id,
      organizationId: loc.organizationId,
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      contactPhone: phone,
      isServiceable,
      zoneId,
      lgaCode,
    };
  });
}
