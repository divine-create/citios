'use server';

import { db } from '@/src/prisma/db';
import { requireAuthenticatedAccount } from './tenant';
import {
  isValidCoordinate,
  isPointServiceable,
  findClosestOperationalZone,
} from '../mapping/serviceability';
import { CALABAR_CANONICAL_LANDMARKS } from '../mapping/calabar-coverage';
import { LogisticsDomainError } from './logistics-domain';

export type CoordinateProvenance =
  | 'DEVICE_GPS'
  | 'MAP_PIN'
  | 'GEOCODER_OSM'
  | 'LANDMARK_APPROXIMATION'
  | 'MANUAL_ENTRY';

export type AddressVerificationStatus =
  | 'SERVICEABLE'
  | 'OUTSIDE_COVERAGE'
  | 'UNVERIFIED';

export interface SavedResidentAddress {
  id: string;
  label: string; // e.g., "Home", "Work", "Mother's House"
  address: string; // Human-readable street address
  latitude: number;
  longitude: number;

  // Separation between the actual delivery destination pin and nearby reference landmarks
  nearbyLandmarkId?: string | null;
  nearbyLandmarkName?: string | null;
  landmarkDistanceMeters?: number | null;

  entranceInstructions?: string | null; // e.g., "Green gate, second compound on the left, call on arrival"
  contactName?: string | null;
  contactPhone?: string | null;

  isDefault: boolean;
  isActive: boolean;

  provenance: CoordinateProvenance;
  verificationStatus: AddressVerificationStatus;
  zoneId?: string | null;
  lgaCode?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface SaveResidentAddressInput {
  id?: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  nearbyLandmarkId?: string | null;
  entranceInstructions?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  isDefault?: boolean;
  provenance: CoordinateProvenance;
}

function computeHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Extracts human-readable address from raw defaultDeliveryAddress field,
 * seamlessly supporting both legacy plain strings and structured JSON storage.
 */
export function extractReadableDeliveryAddress(raw: string | null | undefined): string {
  if (!raw) return '';
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.defaultAddress) return parsed.defaultAddress;
      if (Array.isArray(parsed.savedAddresses)) {
        const def =
          parsed.savedAddresses.find((a: any) => a.isDefault && a.isActive !== false) ||
          parsed.savedAddresses[0];
        if (def?.address) return def.address;
      }
    } catch {}
  }
  return raw;
}

/**
 * Parses and retrieves all saved addresses for the authenticated resident.
 * Ensures zero cross-resident IDOR leakage.
 */
export async function getResidentAddresses(): Promise<SavedResidentAddress[]> {
  const { person } = await requireAuthenticatedAccount();

  const profile = await db.orm.public.ResidentProfile.where({ personId: person.id }).all().first();
  if (!profile || !profile.defaultDeliveryAddress) {
    return [];
  }

  const raw = profile.defaultDeliveryAddress.trim();
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.savedAddresses)) {
        return parsed.savedAddresses.filter((a: SavedResidentAddress) => a.isActive !== false);
      }
    } catch {}
  }

  // Legacy fallback: convert plain string into a default address
  return [
    {
      id: 'addr-default-legacy',
      label: 'Default Address',
      address: raw,
      latitude: 4.9757,
      longitude: 8.3417,
      isDefault: true,
      isActive: true,
      provenance: 'MANUAL_ENTRY',
      verificationStatus: 'SERVICEABLE',
      zoneId: 'marian-road',
      lgaCode: 'CR-MUN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Returns the resident's active default address with full coordinates and entrance details.
 */
export async function getResidentDefaultAddress(): Promise<SavedResidentAddress | null> {
  const addresses = await getResidentAddresses();
  const defaultAddr = addresses.find((a) => a.isDefault && a.isActive !== false);
  if (defaultAddr) return defaultAddr;
  return addresses[0] || null;
}

/**
 * Saves a new or updated resident address with strict coordinate validation,
 * serviceability verification within Calabar, and clear distinction between
 * the actual destination pin and nearby landmarks.
 */
export async function saveResidentAddress(
  input: SaveResidentAddressInput
): Promise<SavedResidentAddress> {
  const { person } = await requireAuthenticatedAccount();

  // 1. Sanitize & validate readable fields
  const label = input.label?.trim();
  const address = input.address?.trim();
  if (!label) throw new LogisticsDomainError('Address label is required (e.g., "Home", "Office").');
  if (!address) throw new LogisticsDomainError('Readable address is required.');

  // 2. Validate coordinates strictly
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    throw new LogisticsDomainError(
      'Valid numeric latitude and longitude coordinates are required for the delivery destination.'
    );
  }

  // 3. Provenance validation
  const allowedProvenances: CoordinateProvenance[] = [
    'DEVICE_GPS',
    'MAP_PIN',
    'GEOCODER_OSM',
    'LANDMARK_APPROXIMATION',
    'MANUAL_ENTRY',
  ];
  const provenance: CoordinateProvenance = allowedProvenances.includes(input.provenance)
    ? input.provenance
    : 'MANUAL_ENTRY';

  // 4. Serviceability and Zone Verification in Calabar
  const point = { latitude: input.latitude, longitude: input.longitude };
  const isServiceable = isPointServiceable(point);
  const verificationStatus: AddressVerificationStatus = isServiceable
    ? 'SERVICEABLE'
    : 'OUTSIDE_COVERAGE';

  const operationalZone = findClosestOperationalZone(point);
  const zoneId = operationalZone?.zone.id || null;
  const lgaCode = operationalZone?.lga?.code || operationalZone?.zone.lgaId || null;

  // 5. Landmark distinction: A nearby landmark is NOT the delivery pin!
  let nearbyLandmarkId: string | null = null;
  let nearbyLandmarkName: string | null = null;
  let landmarkDistanceMeters: number | null = null;

  if (input.nearbyLandmarkId) {
    const canonical = CALABAR_CANONICAL_LANDMARKS.find((lm) => lm.id === input.nearbyLandmarkId);
    if (canonical) {
      nearbyLandmarkId = canonical.id;
      nearbyLandmarkName = canonical.name;
      const refPin = canonical.entrancePin || canonical.center;
      landmarkDistanceMeters = computeHaversineMeters(
        input.latitude,
        input.longitude,
        refPin.latitude,
        refPin.longitude
      );
    }
  }

  // 6. Fetch existing addresses from ResidentProfile
  const profile = await db.orm.public.ResidentProfile.where({ personId: person.id }).all().first();
  let existingAddresses: SavedResidentAddress[] = [];

  if (profile?.defaultDeliveryAddress) {
    const raw = profile.defaultDeliveryAddress.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.savedAddresses)) {
          existingAddresses = parsed.savedAddresses;
        }
      } catch {}
    }
  }

  const isFirstAddress = existingAddresses.filter((a) => a.isActive !== false).length === 0;
  const shouldBeDefault = input.isDefault ?? isFirstAddress;

  const now = new Date().toISOString();
  const addressId = input.id || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (shouldBeDefault) {
    existingAddresses = existingAddresses.map((a) => ({ ...a, isDefault: false }));
  }

  const existingIndex = existingAddresses.findIndex((a) => a.id === addressId);
  const savedRecord: SavedResidentAddress = {
    id: addressId,
    label,
    address,
    latitude: input.latitude,
    longitude: input.longitude,
    nearbyLandmarkId,
    nearbyLandmarkName,
    landmarkDistanceMeters,
    entranceInstructions: input.entranceInstructions?.trim() || null,
    contactName: input.contactName?.trim() || `${person.firstName} ${person.lastName}`.trim(),
    contactPhone: input.contactPhone?.trim() || null,
    isDefault: shouldBeDefault,
    isActive: true,
    provenance,
    verificationStatus,
    zoneId,
    lgaCode,
    createdAt: existingIndex >= 0 ? existingAddresses[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    existingAddresses[existingIndex] = savedRecord;
  } else {
    existingAddresses.push(savedRecord);
  }

  const activeDefault = existingAddresses.find((a) => a.isDefault && a.isActive !== false);
  const payload = JSON.stringify({
    defaultAddress: activeDefault ? activeDefault.address : address,
    savedAddresses: existingAddresses,
  });

  // Save on canonical ResidentProfile
  await db.transaction(async (tx) => {
    if (profile) {
      await tx.orm.public.ResidentProfile.where({ id: profile.id }).update({
        defaultDeliveryAddress: payload,
      });
    } else {
      await tx.orm.public.ResidentProfile.create({
        personId: person.id,
        defaultDeliveryAddress: payload,
      });
    }
  });

  return savedRecord;
}

/**
 * Updates an existing saved address with IDOR protection.
 */
export async function updateResidentAddress(
  addressId: string,
  updates: Partial<SaveResidentAddressInput>
): Promise<SavedResidentAddress> {
  const { person } = await requireAuthenticatedAccount();

  const profile = await db.orm.public.ResidentProfile.where({ personId: person.id }).all().first();
  if (!profile || !profile.defaultDeliveryAddress) {
    throw new LogisticsDomainError('Address not found or unauthorized.');
  }

  let addresses: SavedResidentAddress[] = [];
  try {
    const parsed = JSON.parse(profile.defaultDeliveryAddress);
    addresses = Array.isArray(parsed?.savedAddresses) ? parsed.savedAddresses : [];
  } catch {
    throw new LogisticsDomainError('Corrupted address store.');
  }

  const target = addresses.find((a) => a.id === addressId);
  if (!target || target.isActive === false) {
    throw new LogisticsDomainError('Address not found or unauthorized.');
  }

  return saveResidentAddress({
    id: addressId,
    label: updates.label ?? target.label,
    address: updates.address ?? target.address,
    latitude: updates.latitude ?? target.latitude,
    longitude: updates.longitude ?? target.longitude,
    nearbyLandmarkId:
      updates.nearbyLandmarkId !== undefined ? updates.nearbyLandmarkId : target.nearbyLandmarkId,
    entranceInstructions:
      updates.entranceInstructions !== undefined
        ? updates.entranceInstructions
        : target.entranceInstructions,
    contactName: updates.contactName !== undefined ? updates.contactName : target.contactName,
    contactPhone: updates.contactPhone !== undefined ? updates.contactPhone : target.contactPhone,
    isDefault: updates.isDefault ?? target.isDefault,
    provenance: updates.provenance ?? target.provenance,
  });
}

/**
 * Deactivates (soft deletes) a saved address with IDOR protection.
 */
export async function deactivateResidentAddress(addressId: string): Promise<{ success: boolean }> {
  const { person } = await requireAuthenticatedAccount();

  const profile = await db.orm.public.ResidentProfile.where({ personId: person.id }).all().first();
  if (!profile || !profile.defaultDeliveryAddress) {
    throw new LogisticsDomainError('Address not found or unauthorized.');
  }

  let addresses: SavedResidentAddress[] = [];
  try {
    const parsed = JSON.parse(profile.defaultDeliveryAddress);
    addresses = Array.isArray(parsed?.savedAddresses) ? parsed.savedAddresses : [];
  } catch {
    throw new LogisticsDomainError('Corrupted address store.');
  }

  const targetIndex = addresses.findIndex((a) => a.id === addressId);
  if (targetIndex === -1 || addresses[targetIndex].isActive === false) {
    throw new LogisticsDomainError('Address not found or unauthorized.');
  }

  addresses[targetIndex].isActive = false;
  addresses[targetIndex].updatedAt = new Date().toISOString();

  if (addresses[targetIndex].isDefault) {
    addresses[targetIndex].isDefault = false;
    const nextDefault = addresses.find((a) => a.isActive !== false);
    if (nextDefault) {
      nextDefault.isDefault = true;
    }
  }

  const activeDefault = addresses.find((a) => a.isDefault && a.isActive !== false);
  const payload = JSON.stringify({
    defaultAddress: activeDefault ? activeDefault.address : null,
    savedAddresses: addresses,
  });

  await db.transaction(async (tx) => {
    await tx.orm.public.ResidentProfile.where({ id: profile.id }).update({
      defaultDeliveryAddress: payload,
    });
  });

  return { success: true };
}

/**
 * Sets an address as default.
 */
export async function setDefaultResidentAddress(addressId: string): Promise<SavedResidentAddress> {
  return updateResidentAddress(addressId, { isDefault: true });
}
